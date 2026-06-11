import React, { useState, useCallback, useMemo } from 'react';
import type { Diary, DiaryDetail } from '../types';
import * as bridge from '../bridge';
import { useOnce } from '../hooks/usePanelManager';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const DiaryPanel: React.FC = () => {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [details, setDetails] = useState<DiaryDetail[]>([]);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DiaryDetail | null>(null);
  const [content, setContent] = useState('');
  const [editName, setEditName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [ascending, setAscending] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await bridge.dbListDiaries();
      setDiaries(items);
    } catch (e) { console.error(e); }
  }, []);

  useOnce(load);

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
        groups.push({ label: `${MONTHS[parseInt(m) - 1]} ${y}`, details: [d] });
      }
    }
    return groups;
  }, [details, ascending]);

  const refreshDetails = useCallback(async (diaryId: string) => {
    const allDetails = await bridge.dbQueryAllDiaryDetails(diaryId);
    setDetails(allDetails);
    return allDetails;
  }, []);

  const selectDiary = async (d: Diary) => {
    setSelectedDiary(d);
    setSelectedDetail(null);
    setContent('');
    try {
      await refreshDetails(d.id);
    } catch {}
  };

  const selectDetail = (detail: DiaryDetail) => {
    setSelectedDetail(detail);
    setContent(detail.content);
  };

  const saveContent = async () => {
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
    } catch (e) { console.error(e); }
  };

  const writeToday = async () => {
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
  };

  const addDiary = async () => {
    if (!editName.trim()) return;
    try {
      await bridge.dbAddDiary({ name: editName.trim() });
      setEditName('');
      setShowNew(false);
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="panel-container" style={{ flexDirection: 'row', gap: 12 }}>
      {/* Column 1: Diary List */}
      <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Diaries</span>
          <button className="btn btn-primary btn-small" onClick={() => setShowNew(true)}>+</button>
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
              <div className="item-sub">{d.desc || 'No description'}</div>
            </div>
          </button>
        ))}
        {diaries.length === 0 && (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>No diaries</p>
          </div>
        )}
      </div>

      {/* Column 2: Date browser */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {selectedDiary && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexShrink: 0 }}>
              <button
                className="diary-sort-btn"
                onClick={() => setAscending(v => !v)}
                title={ascending ? 'Newest first' : 'Oldest first'}
              >
                {ascending ? '↑' : '↓'}
              </button>
              <span className="panel-count">{details.length}</span>
              <button className="btn btn-primary btn-small" style={{ marginLeft: 'auto' }} onClick={writeToday}>
                + Today
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {monthGroups.length === 0 && (
                <div className="empty-state">
                  <p>No entries yet</p>
                </div>
              )}
              {monthGroups.map(g => (
                <div key={g.label} className="diary-month-section">
                  <div className="diary-month-header">{g.label}</div>
                  <div className="diary-date-grid">
                    {g.details.map(d => {
                      const dt = new Date(d.create_date);
                      const day = dt.getDate();
                      const dow = DOW[dt.getDay()];
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
          <div className="empty-state">
            <p>Select a diary</p>
          </div>
        )}
      </div>

      {/* Column 3: Content Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {selectedDetail && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{selectedDetail.create_date}</span>
              <button className="btn btn-primary btn-small" onClick={saveContent}>Save</button>
            </div>
            <textarea
              className="form-textarea"
              style={{ flex: 1, minHeight: 200 }}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your diary entry..."
            />
          </>
        )}
        {selectedDiary && !selectedDetail && (
          <div className="empty-state">
            <p>Select a date</p>
          </div>
        )}
      </div>

      {/* New Diary Modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">New Diary</span>
              <button className="modal-close" onClick={() => setShowNew(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDiary()} placeholder="Diary name" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addDiary} disabled={!editName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryPanel;


