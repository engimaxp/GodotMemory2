import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import * as bridge from '../bridge';
import { useI18n } from '../i18n';
import { IslandIcon } from '../components/island-icons';
import { noteTitle } from '../noteTitle';
import { useToast } from '../components/Toast';
import type { StickyNote } from '../types';
import '../styles/StickyNotes.css';

export default function NotesPanel() {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<StickyNote[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let revision = 0;
    async function refresh() {
      const request = ++revision;
      try {
        const next = await bridge.listStickyNotes();
        if (active && request === revision) {
          setNotes(next);
          setLoadError(false);
        }
      } catch {
        if (active && request === revision) setLoadError(true);
      }
    }
    void refresh();
    const subscription = listen('sticky-note:changed', () => { void refresh(); });
    void subscription.catch(console.error);
    return () => {
      active = false;
      void subscription.then(unlisten => unlisten()).catch(() => {});
    };
  }, []);

  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); }
    catch { showToast(t('note.action_error')); }
    finally { setBusy(false); }
  }

  async function create() {
    const note = await bridge.createStickyNote();
    setQuery('');
    await bridge.openStickyNote(note.id);
  }

  const search = query.trim().toLocaleLowerCase();
  const visible = !search ? notes : notes?.filter(note => note.content.toLocaleLowerCase().includes(search));
  return (
    <section className="sticky-notes-list">
      <div className="sticky-notes-toolbar">
        <input type="search" aria-label={t('note.search')} placeholder={t('note.search')}
          value={query} onChange={event => setQuery(event.target.value)} />
        <button type="button" className="sticky-notes-add" disabled={busy} onClick={() => void perform(create)}>
          <IslandIcon name="Plus" size={18} />{t('note.new')}
        </button>
      </div>
      {loadError ? <p className="sticky-notes-empty" role="alert">{t('note.load_error')}</p>
        : !visible ? <p className="sticky-notes-empty">{t('common.loading')}</p>
        : visible.length === 0 ? <p className="sticky-notes-empty">{t(search ? 'note.no_results' : 'note.empty')}</p>
        : <ul className="sticky-notes-grid">
          {visible.map(note => {
            const title = noteTitle(note.content, t('note.untitled'));
            const preview = note.content.trim().split(/\r?\n/).slice(1).join('\n');
            return (
              <li className="sticky-note-card" data-note-color={note.color} key={note.id}>
                <button type="button" className="sticky-note-card-open" title={t('note.open', { name: title })} disabled={busy}
                  onClick={() => void perform(() => bridge.openStickyNote(note.id))}>
                  <strong>{title}</strong>
                  {preview && <span>{preview}</span>}
                  <time dateTime={note.updated_at}>{new Date(note.updated_at).toLocaleString(language.replace('_', '-'),
                    { dateStyle: 'medium', timeStyle: 'short' })}</time>
                </button>
                <button type="button" className="sticky-note-card-delete" title={t('note.delete')} aria-label={t('note.delete')}
                  disabled={busy} onClick={() => {
                    if (window.confirm(t('note.delete_confirm', { name: title }))) {
                      void perform(() => bridge.deleteStickyNote(note.id));
                    }
                  }}>
                  <IslandIcon name="Trash" size={18} />
                </button>
              </li>
            );
          })}
        </ul>}
    </section>
  );
}
