import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, TransitionEvent } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import * as bridge from '../bridge';
import { I18nProvider, useI18n, type Language } from '../i18n';
import { noteColors, type NoteDraft, type NoteWindowAction, type NoteWindowView } from '../types';
import { IslandIcon } from './island-icons';
import { noteTitle } from '../noteTitle';
import { TextFonts } from './TextFonts';
import '../styles/StickyNotes.css';

interface NoteGesture {
  id: number;
  x: number;
  y: number;
  moved: boolean;
  frame: number | null;
}

function NoteEditor() {
  const { t } = useI18n();
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [view, setView] = useState<NoteWindowView>({ edge: 'None', peeking: false, retreating: false, revision: 0 });
  const { edge, peeking, retreating, revision } = view;
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const [actionError, setActionError] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const latest = useRef<NoteDraft | null>(null);
  const persisted = useRef<NoteDraft | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const acting = useRef(false);
  const gesture = useRef<NoteGesture | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const retreatTimer = useRef<number | undefined>(undefined);

  const applyView = useCallback((next: NoteWindowView) => {
    setView(current => next.revision >= current.revision ? next : current);
  }, []);

  useEffect(() => {
    let active = true;
    void bridge.getStickyNote().then(note => {
      if (!active) return;
      latest.current = persisted.current = note;
      setDraft(note);
      setStatus('saved');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, []);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const save = saveQueue.current.catch(() => {}).then(async () => {
      const snapshot = latest.current;
      if (!snapshot || snapshot === persisted.current) return;
      setStatus('saving');
      try {
        await bridge.saveStickyNote(snapshot);
        persisted.current = snapshot;
        if (latest.current === snapshot) setStatus('saved');
      } catch (error) {
        setStatus('error');
        throw error;
      }
    });
    saveQueue.current = save;
    return save;
  }, []);

  function change(partial: Partial<NoteDraft>) {
    if (!latest.current || acting.current) return;
    const next = { ...latest.current, ...partial };
    latest.current = next;
    setDraft(next);
    setStatus('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush().catch(() => {}); }, 180);
  }

  const perform = useCallback(async (action: NoteWindowAction) => {
    if (acting.current) return;
    acting.current = true;
    setActionError(false);
    try {
      if (action === 'close' || action === 'minimize' || action === 'tuck') await flush();
      const view = await bridge.stickyNoteWindowAction(action);
      if (action !== 'close') applyView(view);
      setColorsOpen(false);
    } catch {
      setActionError(true);
    } finally {
      acting.current = false;
    }
  }, [applyView, flush]);

  useEffect(() => {
    let active = true;
    const native = getCurrentWindow();
    const subscriptions = [
      native.listen<NoteWindowView>('sticky-note:window', event => applyView(event.payload)),
      native.listen('sticky-note:close-requested', () => { void perform('close'); }),
    ];
    void Promise.all(subscriptions).then(() => {
      if (active) return bridge.stickyNoteWindowAction('ready');
    }).catch(() => { if (active) setActionError(true); });
    const saveOnBlur = () => { void flush().catch(() => {}); };
    window.addEventListener('blur', saveOnBlur);
    return () => {
      active = false;
      window.clearTimeout(timer.current);
      window.clearTimeout(hoverTimer.current);
      window.removeEventListener('blur', saveOnBlur);
      for (const subscription of subscriptions) void subscription.then(unlisten => unlisten()).catch(() => {});
    };
  }, [applyView, flush, perform]);

  const finishRetreat = useCallback((currentRevision: number) => {
    window.clearTimeout(retreatTimer.current);
    retreatTimer.current = undefined;
    void bridge.stickyNoteWindowAction('finish_peek', currentRevision)
      .then(applyView).catch(() => setActionError(true));
  }, [applyView]);

  useEffect(() => {
    if (!retreating) return;
    // Reduced motion or an interrupted transition may suppress transitionend.
    retreatTimer.current = window.setTimeout(() => finishRetreat(revision), 300);
    return () => {
      window.clearTimeout(retreatTimer.current);
      retreatTimer.current = undefined;
    };
  }, [finishRetreat, retreating, revision]);

  function hover(event: PointerEvent<HTMLElement>, entering: boolean) {
    if (edge === 'None' || event.pointerType !== 'mouse') return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      void bridge.stickyNoteWindowAction(entering ? 'peek' : 'hide_peek')
        .then(applyView).catch(() => setActionError(true));
    }, entering ? 60 : 120);
  }

  function onSlideEnd(event: TransitionEvent<HTMLButtonElement>) {
    if (retreating && retreatTimer.current !== undefined &&
      event.target === event.currentTarget && event.propertyName === 'translate') {
      finishRetreat(revision);
    }
  }

  const loaded = draft !== null;
  useEffect(() => {
    if (loaded && edge === 'None') editor.current?.focus();
  }, [edge, loaded]);

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, x: event.screenX, y: event.screenY, moved: false, frame: null };
    void bridge.dragStickyNote('begin').catch(() => setActionError(true));
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.screenX - drag.x, event.screenY - drag.y) < 4) return;
    drag.moved = true;
    if (drag.frame !== null) return;
    drag.frame = requestAnimationFrame(() => {
      drag.frame = null;
      void bridge.dragStickyNote('move').catch(() => setActionError(true));
    });
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    gesture.current = null;
    if (drag.frame !== null) cancelAnimationFrame(drag.frame);
    void bridge.dragStickyNote(drag.moved ? 'end' : 'cancel')
      .then(applyView).catch(() => setActionError(true));
  }

  const title = noteTitle(draft?.content ?? '', t('note.untitled'));
  return (
    <main className="sticky-note-window" data-note-color={draft?.color ?? 'honey'} data-note-edge={edge}
      data-peeking={peeking || undefined}
      onPointerEnter={event => hover(event, true)} onPointerLeave={event => hover(event, false)}>
      <div className="sticky-note-editor" inert={edge !== 'None'}>
        <header className="sticky-note-header">
          <div className="sticky-note-grip" title={t('note.drag')}
            onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
            onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
            <IslandIcon name="Bookmark" size={18} />
            <span>{t('Notes')}</span>
          </div>
          <div className="sticky-note-window-controls">
            <button type="button" className="sticky-note-color-toggle" aria-label={t('note.color')} title={t('note.color')}
              aria-expanded={colorsOpen} disabled={!draft} onClick={() => setColorsOpen(open => !open)} />
            <button type="button" title={t('note.tuck')} aria-label={t('note.tuck')}
              onClick={() => void perform('tuck')}>⇥</button>
            <button type="button" title={t('note.minimize')} aria-label={t('note.minimize')} onClick={() => void perform('minimize')}>−</button>
            <button type="button" title={t('note.maximize')} aria-label={t('note.maximize')} onClick={() => void perform('toggle_maximize')}>□</button>
            <button type="button" className="sticky-note-close" title={t('note.close')} aria-label={t('note.close')}
              onClick={() => void perform('close')}>×</button>
          </div>
          {colorsOpen && (
            <div className="sticky-note-palette" role="group" aria-label={t('note.color')}>
              {noteColors.map(color => (
                <button key={color} type="button" data-note-color={color} title={t(`note.color.${color}`)}
                  aria-label={t(`note.color.${color}`)} aria-pressed={draft?.color === color}
                  onClick={() => { change({ color }); setColorsOpen(false); }} />
              ))}
            </div>
          )}
        </header>
        <textarea ref={editor} spellCheck aria-label={t('note.content')} disabled={!draft}
          placeholder={t('note.placeholder')} value={draft?.content ?? ''}
          onChange={event => change({ content: event.target.value })} />
        <footer className="sticky-note-status" aria-live="polite">
          {actionError ? t('note.action_error') : t(`note.status.${status}`)}
          {status === 'error' && draft && (
            <button type="button" onClick={() => { setActionError(false); void flush().catch(() => {}); }}>{t('note.retry')}</button>
          )}
        </footer>
      </div>
      <button type="button" className="sticky-note-edge-tab" aria-label={t('note.restore', { name: title })}
        title={t('note.restore', { name: title })} onClick={() => void perform('restore')} onTransitionEnd={onSlideEnd}>
        <span>{title}</span>
      </button>
    </main>
  );
}

export default function StickyNoteWindow() {
  const [language, setLanguage] = useState<Language>('zh_CN');
  useEffect(() => {
    let active = true;
    void bridge.getSettings().then(settings => {
      if (active) setLanguage(settings.language as Language);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return <I18nProvider language={language}><TextFonts /><NoteEditor /></I18nProvider>;
}
