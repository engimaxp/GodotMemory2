import React, { useState, useCallback } from 'react';
import { useI18n } from '../i18n';
import type { Diary, DiaryDetail, Tag } from '../types';
import * as bridge from '../bridge';
import { useOnce } from '../hooks/usePanelManager';

const DiaryPanel: React.FC = () => {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [details, setDetails] = useState<DiaryDetail[]>([]);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [content, setContent] = useState('');
  const [editName, setEditName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const load = useCallback(async () => {
    try {
      const items = await bridge.dbListDiaries();
      setDiaries(items);
    } catch (e) { console.error(e); }
  }, []);

  useOnce(load);

  const selectDiary = async (d: Diary) => {
    setSelectedDiary(d);
    try {
      const allDetails = await bridge.dbQueryDiaryDetails(d.id, year);
      setDetails(allDetails);
    } catch {}
  };

  const selectDate = async (dateStr: string) => {
    setSelectedDate(dateStr);
    if (!selectedDiary) return;
    try {
      const detail = await bridge.dbGetDiaryDetail(selectedDiary.id, dateStr);
      setContent(detail?.content ?? '');
    } catch {
      setContent('');
    }
  };

  const saveContent = async () => {
    if (!selectedDiary || !selectedDate) return;
    try {
      await bridge.dbSaveDiaryDetail({
        diary_id: selectedDiary.id,
        create_date: selectedDate,
        content,
      });
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

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const datesWithContent = new Set(details.map(d => d.create_date));

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(<div key={`e${i}`} className="calendar-day empty" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasContent = datesWithContent.has(dateStr);
    calendarDays.push(
      <button
        key={d}
        className={`calendar-day ${selectedDate === dateStr ? 'selected' : ''} ${hasContent ? 'has-content' : ''}`}
        onClick={() => selectDate(dateStr)}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="panel-container" style={{ flexDirection: 'row', gap: 12 }}>
      {/* Diary List */}
      <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Diaries</span>
          <button className="btn btn-primary btn-small" onClick={() => setShowNew(true)}>+</button>
        </div>
        {diaries.map(d => (
          <button
            key={d.id}
            className={`item-row ${selectedDiary?.id === d.id ? 'active' : ''}`}
            style={{ padding: '6px 8px', border: selectedDiary?.id === d.id ? '1px solid var(--accent-blue)' : undefined }}
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

      {/* Calendar + Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Calendar nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-secondary btn-small" onClick={() => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{year}.{String(month).padStart(2, '0')}</span>
          <button className="btn btn-secondary btn-small" onClick={() => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); }}>›</button>
        </div>
        {/* Calendar grid */}
        <div className="calendar-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)', padding: 2 }}>{d}</div>
          ))}
          {calendarDays}
        </div>

        {/* Content Editor */}
        {selectedDiary && selectedDate && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{selectedDate}</span>
              <button className="btn btn-primary btn-small" onClick={saveContent}>Save</button>
            </div>
            <textarea
              className="form-textarea"
              style={{ flex: 1, minHeight: 150 }}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your diary entry..."
            />
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


