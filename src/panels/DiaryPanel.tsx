import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Diary, DiaryDetail } from '../types';
import * as bridge from '../bridge';
import { useOnce } from '../hooks/usePanelManager';
import { useI18n } from '../i18n';
import { useToast } from '../components/Toast';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface MonthGroup {
  label: string;
  details: DiaryDetail[];
}

let settingsCache: any = null;

async function loadSettings() {
  if (!settingsCache) {
    settingsCache = await bridge.getSettings();
  }
  return settingsCache;
}

async function saveSettingsPartial(partial: Record<string, any>) {
  const s = await loadSettings();
  const next = { ...s, ...partial };
  settingsCache = next;
  await bridge.saveSettings(next);
}

const DiaryPanel: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const monthNames = useMemo(() => [
    t('date.jan'), t('date.feb'), t('date.mar'), t('date.apr'),
    t('date.may'), t('date.jun'), t('date.jul'), t('date.aug'),
    t('date.sep'), t('date.oct'), t('date.nov'), t('date.dec'),
  ], [t]);
  const dows = useMemo(() => [
    t('date.sun'), t('date.mon'), t('date.tue'), t('date.wed'),
    t('date.thu'), t('date.fri'), t('date.sat'),
  ], [t]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [details, setDetails] = useState<DiaryDetail[]>([]);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DiaryDetail | null>(null);
  const [content, setContent] = useState('');
  const [editName, setEditName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [ascending, setAscending] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<number>(0);
  const originalContentRef = useRef('');
  const autoSaveRef = useRef({ dirty: false, content: '', diary: null as Diary | null, detail: null as DiaryDetail | null });

  const saveSelectedDiary = useCallback(async (diaryId: string) => {
    await saveSettingsPartial({ diary_selected_id: diaryId });
  }, []);

  const saveSelectedDate = useCallback(async (date: string) => {
    await saveSettingsPartial({ diary_selected_date: date });
  }, []);

  const saveCursorPos = useCallback(async (pos: number) => {
    await saveSettingsPartial({ diary_cursor_pos: pos });
  }, []);

  useEffect(() => {
    bridge.getSettings().then(s => {
      settingsCache = s;
      setSidebarCollapsed(s.diary_sidebar_collapsed);
      cursorRef.current = s.diary_cursor_pos || 0;
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const items = await bridge.dbListDiaries();
      setDiaries(items);
      return items;
    } catch (e) { console.error(e); }
  }, []);

  const refreshDetails = useCallback(async (diaryId: string) => {
    const allDetails = await bridge.dbQueryAllDiaryDetails(diaryId);
    setDetails(allDetails);
    return allDetails;
  }, []);

  useOnce(async () => {
    const items = await load() || [];
    const s = await loadSettings();
    if (s.diary_selected_id) {
      const found = items.find((d: Diary) => d.id === s.diary_selected_id);
      if (found) {
        setSelectedDiary(found);
        const allDetails = await refreshDetails(found.id);
        if (s.diary_selected_date) {
          const foundDetail = allDetails.find((dd: DiaryDetail) => dd.create_date === s.diary_selected_date);
          if (foundDetail) {
            setSelectedDetail(foundDetail);
            setContent(foundDetail.content);
          }
        }
      }
    }
    setRestoreDone(true);
  });

  useEffect(() => {
    if (restoreDone && textareaRef.current && selectedDetail) {
      const pos = cursorRef.current;
      if (pos > 0 && pos <= (selectedDetail?.content?.length || 0)) {
        textareaRef.current.setSelectionRange(pos, pos);
        textareaRef.current.focus();
      }
    }
  }, [restoreDone, selectedDetail]);

  const toggleSidebar = useCallback(async () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    await saveSettingsPartial({ diary_sidebar_collapsed: next });
  }, [sidebarCollapsed]);

  const selectDiary = useCallback(async (d: Diary) => {
    setSelectedDiary(d);
    setSelectedDetail(null);
    setContent('');
    cursorRef.current = 0;
    await saveSelectedDiary(d.id);
    await saveSettingsPartial({ diary_selected_date: '', diary_cursor_pos: 0 });
    try {
      await refreshDetails(d.id);
    } catch {}
  }, [saveSelectedDiary]);

  const selectDetail = useCallback(async (detail: DiaryDetail) => {
    setSelectedDetail(detail);
    setContent(detail.content);
    cursorRef.current = 0;
    originalContentRef.current = detail.content;
    setDirty(false);
    await saveSelectedDate(detail.create_date);
    await saveSettingsPartial({ diary_cursor_pos: 0 });
  }, [saveSelectedDate]);

  const saveContent = useCallback(async () => {
    if (!selectedDiary || !selectedDetail) return;
    try {
      await bridge.dbSaveDiaryDetail({
        diary_id: selectedDiary.id,
        create_date: selectedDetail.create_date,
        content,
      });
      setDetails(prev => prev.map(d =>
        d.create_date === selectedDetail.create_date ? { ...d, content } : d
      ));
      originalContentRef.current = content;
      setDirty(false);
      showToast(t("diary.saved"));
    } catch (e) { console.error(e); }
  }, [selectedDiary, selectedDetail, content, showToast, t]);

  const writeToday = useCallback(async () => {
    if (!selectedDiary) return;
    const today = todayStr();
    const existing = details.find(d => d.create_date === today);
    if (existing) {
      selectDetail(existing);
      return;
    }
    try {
      await bridge.dbSaveDiaryDetail({
        diary_id: selectedDiary.id,
        create_date: today,
        content: '',
      });
      const allDetails = await refreshDetails(selectedDiary.id);
      const created = allDetails.find(d => d.create_date === today);
      if (created) selectDetail(created);
    } catch (e) { console.error(e); }
  }, [selectedDiary, details, selectDetail, refreshDetails]);

  const addDiary = useCallback(async () => {
    if (!editName.trim()) return;
    try {
      await bridge.dbAddDiary({ name: editName.trim() });
      setEditName('');
      setShowNew(false);
      load();
    } catch (e) { console.error(e); }
  }, [editName, load]);

  // Keep autoSaveRef in sync for unmount-only access
  autoSaveRef.current = { dirty, content, diary: selectedDiary, detail: selectedDetail };

  // Auto-save on unmount (panel close) and beforeunload (tray exit)
  useEffect(() => {
    const doSave = async () => {
      const ref = autoSaveRef.current;
      if (ref.dirty && ref.diary && ref.detail) {
        try {
          await bridge.dbSaveDiaryDetail({
            diary_id: ref.diary.id,
            create_date: ref.detail.create_date,
            content: ref.content,
          });
        } catch {}
      }
    };
    const onUnload = () => { doSave(); };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      doSave();
    };
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setContent(v);
    setDirty(v !== originalContentRef.current);
  }, []);

  const handleContentBlur = useCallback(() => {
    if (textareaRef.current) {
      cursorRef.current = textareaRef.current.selectionStart;
      saveCursorPos(textareaRef.current.selectionStart);
    }
  }, [saveCursorPos]);

  const monthGroups = useMemo<MonthGroup[]>(() => {
    if (details.length === 0) return [];
    const sorted = [...details].sort((a, b) =>
      ascending
        ? a.create_date.localeCompare(b.create_date)
        : b.create_date.localeCompare(a.create_date)
    );
    const groups: MonthGroup[] = [];
    for (const d of sorted) {
      const monthKey = d.create_date.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last && last.details[0].create_date.slice(0, 7) === monthKey) {
        last.details.push(d);
      } else {
        const [y, m] = monthKey.split('-');
        groups.push({ label: `${monthNames[parseInt(m) - 1]} ${y}`, details: [d] });
      }
    }
    return groups;
  }, [details, ascending]);

  const sidebarNode = sidebarCollapsed ? (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 4px 6px', overflow: 'hidden',
      width: 32, flexShrink: 0, alignItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', flex: 1 }}>
        {selectedDiary ? (
          <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--accent-blue)', lineHeight: 1.2, writingMode: 'vertical-lr' }}>
            {selectedDiary.name}
          </div>
        ) : (
          <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--ink-soft)', lineHeight: 1.2, writingMode: 'vertical-lr' }}>
            {t("diary.no_diaries")}
          </div>
        )}
        {selectedDetail && (
          <div style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--ink-soft)', lineHeight: 1.2, writingMode: 'vertical-lr' }}>
            {selectedDetail.create_date}
          </div>
        )}
      </div>
      <button
        className="btn btn-primary btn-small"
        onClick={toggleSidebar}
        title={t("diary.expand_sidebar")}
      >
        ❯
      </button>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
      <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{t("diary.list_header")}</span>
          <button className="btn btn-primary btn-small" onClick={() => setShowNew(true)} title={t("diary.new")}>+</button>
        </div>
        {diaries.map(d => (
          <button
            key={d.id}
            className="item-row"
            style={{
              padding: '6px 8px',
              border: selectedDiary?.id === d.id ? '1px solid var(--accent-blue)' : undefined,
            }}
            onClick={() => selectDiary(d)}
          >
            <div className="item-info">
              <div className="item-name">{d.name}</div>
              <div className="item-sub">{d.desc || t("common.no_description")}</div>
            </div>
          </button>
        ))}
        {diaries.length === 0 && (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>{t("diary.no_diaries")}</p>
          </div>
        )}
      </div>
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {selectedDiary && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                className="diary-sort-btn"
                onClick={() => setAscending(v => !v)}
                title={ascending ? t("diary.sort_newest") : t("diary.sort_oldest")}
              >
                {ascending ? '↑' : '↓'}
              </button>
              <span className="panel-count">{details.length}</span>
              <button className="btn btn-primary btn-small" style={{ marginLeft: 'auto' }} onClick={writeToday}>
                {t("diary.write_today")}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {monthGroups.length === 0 && (
                <div className="empty-state">
                  <p>{t("diary.no_entries")}</p>
                </div>
              )}
              {monthGroups.map(g => (
                <div key={g.label} className="diary-month-section">
                  <div className="diary-month-header">{g.label}</div>
                  <div className="diary-date-grid">
                    {g.details.map(d => {
                      const dt = new Date(d.create_date);
                      const day = dt.getDate();
                      const dow = dows[dt.getDay()];
                      const isSelected = selectedDetail?.create_date === d.create_date;
                      return (
                        <button
                          key={d.create_date}
                          className={`diary-date-chip${isSelected ? ' selected' : ''}`}
                          onClick={() => selectDetail(d)}
                        >
                          {day}
                          <span className="dow">{dow}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {!selectedDiary && (
          <div className="empty-state" style={{ flex: 1 }}>
            <p>{t("diary.select_diary")}</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            className="btn btn-primary btn-small"
            onClick={toggleSidebar}
            title={t("diary.collapse_sidebar")}
          >
            ❮
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="panel-container" style={{ flexDirection: 'row', gap: 0 }}>
      {sidebarNode}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, paddingLeft: 12 }}>
        {selectedDetail && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{selectedDetail.create_date}</span>
              <button className="btn btn-primary btn-small" onClick={saveContent} disabled={!dirty}>{t("diary.save")}</button>
            </div>
            <textarea
              ref={textareaRef}
              className="form-textarea"
              style={{ flex: 1, minHeight: 200 }}
              value={content}
              onChange={handleContentChange}
              onBlur={handleContentBlur}
              placeholder={t("diary.placeholder")}
            />
          </>
        )}
        {selectedDiary && !selectedDetail && (
          <div className="empty-state">
            <p>{t("diary.select_date")}</p>
          </div>
        )}
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">{t("diary.new")}</span>
              <button className="modal-close" onClick={() => setShowNew(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{t("diary.name")}</label>
                <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDiary()} placeholder={t("diary.name_placeholder")} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>{t("Cancel")}</button>
              <button className="btn btn-primary" onClick={addDiary} disabled={!editName.trim()}>{t("common.create")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryPanel;
