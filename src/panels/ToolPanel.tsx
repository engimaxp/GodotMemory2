import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Tool, Tag, ImageRecord, EntityWithExtras, Page } from '../types';
import { TagType } from '../types';
import * as bridge from '../bridge';
import { useI18n } from '../i18n';
import { useDebounce } from '../hooks/usePanelManager';
import { useTagSelector } from '../hooks/useTagSelector';
import { useToast } from '../components/Toast';
import ScreenshotView from '../components/ScreenshotView';
import ImageManager from '../components/ImageManager';
import '../styles/panels.css';

interface ToolEditModalProps {
  tool: Partial<Tool> | null;
  initialTagIds?: string[];
  initialImages?: ImageRecord[];
  onClose: () => void;
  onSaved: () => void;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^["']|["']$/g, '');
}

function extractFileName(path: string): string {
  const normalized = normalizePath(path);
  const segs = normalized.split('/');
  const last = segs[segs.length - 1] || '';
  return last.replace(/\.\w+$/, '');
}

const ToolEditModal: React.FC<ToolEditModalProps> = ({ tool, initialTagIds, initialImages, onClose, onSaved }) => {
  const { t } = useI18n();
  const isNew = !tool?.id;
  const [name, setName] = useState(tool?.name ?? "");
  const [dir, setDir] = useState(tool?.directory ?? "");
  const [link, setLink] = useState(tool?.link ?? "");
  const [desc, setDesc] = useState(tool?.desc ?? "");
  const [saving, setSaving] = useState(false);
  const [imageRecords, setImageRecords] = useState<ImageRecord[]>(initialImages || []);
  const [iconId, setIconId] = useState<string | null>(tool?.icon ?? null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  useEffect(() => {
    if (tool?.icon) {
      bridge.dbLoadImage(tool.icon).then(setIconPreview).catch(() => setIconPreview(null));
    }
  }, []);

  const dirTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDirChange = (value: string) => {
    const normalized = normalizePath(value);
    setDir(normalized);
    if (!name && normalized.trim()) {
      const extracted = extractFileName(normalized);
      if (extracted) setName(extracted);
    }
    if (dirTimerRef.current) clearTimeout(dirTimerRef.current);
    dirTimerRef.current = setTimeout(async () => {
      if (!normalized.trim() || !normalized.match(/\.\w+$/)) return;
      try {
        const record = await bridge.dbExtractExeIcon(normalized.trim());
        setIconId(record.id);
        const b64 = await bridge.dbLoadImage(record.id);
        if (b64) setIconPreview(b64);
      } catch { /* ignore */ }
    }, 600);
  };
  useEffect(() => () => { if (dirTimerRef.current) clearTimeout(dirTimerRef.current); }, []);

  const {
    tagIds, setTagIds, allTags, fastTags, tagInput, setTagInput,
    suggestions, showSuggestions, setShowSuggestions, suggestRef,
    handleAddTag, handleRemoveTag, handleSelectSuggestion,
  } = useTagSelector(TagType.Tool, 0, initialTagIds || []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Partial<Tool> = { name, directory: dir, link, desc, icon: iconId ?? tool?.icon ?? '' };
      const imageIds = imageRecords.map(r => r.id);
      if (isNew) await bridge.dbAddTool(data, tagIds, imageIds);
      else if (tool?.id) await bridge.dbUpdateTool({ ...data, id: tool.id } as Tool, tagIds, imageIds);
      onSaved(); onClose();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? t("tool.add") : t("tool.edit")}</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body">
          {iconPreview && (
            <div className="form-group" style={{ alignItems: "center", display: "flex", gap: 8 }}>
              <img src={iconPreview} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "contain" }} />
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{t("tool.icon_extracted")}</span>
            </div>
          )}
          <div className="form-group"><label className="form-label">{t("tool.name")}</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t("tool.name_placeholder")} /></div>
          <div className="form-group"><label className="form-label">{t("tool.executable_label")}</label><input className="form-input" value={dir} onChange={e => handleDirChange(e.target.value)} placeholder={t("tool.executable_placeholder")} /></div>
          <div className="form-group"><label className="form-label">{t("tool.link")}</label><input className="form-input" value={link} onChange={e => setLink(e.target.value)} placeholder={t("tool.link_placeholder")} /></div>
          <div className="form-group"><label className="form-label">{t("tool.desc")}</label><textarea className="form-textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t("tool.desc_placeholder")} /></div>
          <div className="form-group">
            <label className="form-label">{t("common.tags")}</label>
            {/* Fast tags */}
            {fastTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {fastTags.map(tag => (
                  <span key={tag.id} className="tag-chip cursor-pointer hover:opacity-80"
                    style={{ background: "#" + tag.color + "22", color: "#" + tag.color, border: "1px solid #" + tag.color + "44", cursor: "pointer" }}
                    onClick={() => { if (!tagIds.includes(tag.id)) setTagIds(prev => [...prev, tag.id]); }}>
                    +{tag.name}
                  </span>
                ))}
              </div>
            )}
            {/* Selected tags */}
            <div className="tag-selector">
              {tagIds.map(tid => { const tag = allTags.find(t => t.id === tid); return tag ? <span key={tid} className="tag-chip" style={{ background: "#" + tag.color + "22", color: "#" + tag.color, border: "1px solid #" + tag.color + "44" }}>{tag.name}<button className="tag-delete" onClick={() => handleRemoveTag(tid)}>x</button></span> : null; })}
            </div>
            {/* Tag input with auto-complete */}
            <div className="tag-input-area" ref={suggestRef} style={{ position: "relative" }}>
              <input className="tag-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddTag(); }} placeholder={t("tag.add")} />
              <button className="btn btn-secondary btn-small" onClick={() => handleAddTag()}>{t("tag.add_label")}</button>
              {/* Auto-complete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, zIndex: 100, background: "var(--bg-popup)", border: "1px solid var(--border-color)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 150, overflowY: "auto", marginBottom: 4 }}>
                  {suggestions.map(tag => (
                    <div key={tag.id} className="tag-chip" style={{ padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: "#" + tag.color + "22", color: "#" + tag.color, margin: 2 }}
                      onClick={() => handleSelectSuggestion(tag.name)}>
                      {tag.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t("common.screenshots")}</label>
            <ImageManager initialImages={imageRecords} onChange={setImageRecords} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t("Cancel")}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name || !dir}>{saving ? t("tool.saving") : t("Save")}</button>
        </div>
      </div>
    </div>
  );
};

interface ToolRowProps {
  Tool: EntityWithExtras<Tool>;
  showScreenshots?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onOpenFolder: () => void;
  onStarToggle: (star: boolean) => void;
}

const ToolRow: React.FC<ToolRowProps> = ({ Tool, showScreenshots, onEdit, onDelete, onRun, onOpenFolder, onStarToggle }) => {
  const e = Tool.entity;
  const [iconSrc, setIconSrc] = useState<string | null>(null);
  useEffect(() => {
    if (e.icon) {
      bridge.dbLoadImage(e.icon).then(setIconSrc).catch(() => setIconSrc(null));
    }
  }, [e.icon]);
  const { t } = useI18n();
  if (showScreenshots) {
    return (
      <div className="item-row">
        <div className="item-icon" style={{ background: iconSrc ? "transparent" : "#f59e0b" }}>
          {iconSrc ? <img src={iconSrc} alt="" onError={() => setIconSrc(null)} /> : <span className="item-icon-placeholder" style={{ color: "white", fontSize: 12 }}>T</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <ScreenshotView images={Tool.images} />
        </div>
        <div className="item-actions">
          <button className="item-btn" onClick={() => onStarToggle(!e.star)} title={e.star ? t("common.unstar") : t("common.star")}>
            {e.star
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
          </button>
          <button className="item-btn" onClick={onRun} title={t("tool.run")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          </button>
          <button className="item-btn" onClick={onOpenFolder} title={t("common.open_dir")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          </button>
          <button className="item-btn" onClick={onEdit} title={t("common.edit")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          <button className="item-btn danger" onClick={onDelete} title={t("Delete")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="item-row">
      <div className="item-icon" style={{ background: iconSrc ? "transparent" : "#f59e0b" }}>
        {iconSrc ? <img src={iconSrc} alt="" onError={() => setIconSrc(null)} /> : <span className="item-icon-placeholder" style={{ color: "white", fontSize: 12 }}>T</span>}
      </div>
      <div className="item-info">
        <div className="item-name">{e.name || t("tool.unnamed")}</div>
        <div className="item-sub">{e.directory || t("tool.no_path")}</div>
      </div>
      <div className="item-tags">{Tool.tags.slice(0, 3).map(t => <span key={t.id} className="tag-chip" style={{ background: "#" + t.color + "22", color: "#" + t.color }}>{t.name}</span>)}</div>
      <div className="item-actions">
        <button className="item-btn" onClick={() => onStarToggle(!e.star)} title={e.star ? t("common.unstar") : t("common.star")}>
          {e.star
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
        </button>
        <button className="item-btn" onClick={onRun} title={t("tool.run")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        </button>
        <button className="item-btn" onClick={onOpenFolder} title={t("common.open_dir")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
        </button>
        <button className="item-btn" onClick={onEdit} title={t("common.edit")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>
        <button className="item-btn danger" onClick={onDelete} title={t("Delete")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
  );
};

const ToolPanel: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [Tools, setTools] = useState<EntityWithExtras<Tool>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState<Page>({ index: 1, size: 30 });
  const [editItemTags, setEditItemTags] = useState<string[]>([]);
  const [editItemImages, setEditItemImages] = useState<ImageRecord[]>([]);
  const [editTool, setEditTool] = useState<Partial<Tool> | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScreenshots, setShowScreenshots] = useState(false);
  // Tag search filtering
  const [searchTagIds, setSearchTagIds] = useState<string[]>([]);
  const [allSearchTags, setAllSearchTags] = useState<Tag[]>([]);
  const [tagSearchText, setTagSearchText] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bridge.dbListTags(TagType.Tool, 0).then(setAllSearchTags).catch(() => {}); }, []);

  // Tag search autocomplete
  useEffect(() => {
    if (tagSearchText.trim().length < 1) { setTagSuggestions([]); setShowTagSuggestions(false); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await bridge.dbQueryTagByNameLike(tagSearchText.trim(), TagType.Tool, 0);
        if (result) {
          setTagSuggestions(result.filter(t => !searchTagIds.includes(t.id)));
          setShowTagSuggestions(result.length > 0);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [tagSearchText, searchTagIds]);

  const addSearchTag = useCallback(async (name: string) => {
    try {
      const tag = allSearchTags.find(t => t.name === name);
      if (tag && !searchTagIds.includes(tag.id)) {
        setSearchTagIds(prev => [...prev, tag.id]);
      }
    } catch {}
    setTagSearchText('');
    setShowTagSuggestions(false);
  }, [allSearchTags, searchTagIds]);

  // Click outside to close tag suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagSearchRef.current && !tagSearchRef.current.contains(e.target as Node)) {
        setShowTagSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = useCallback(async () => {
    try {
      if (debouncedSearch || searchTagIds.length > 0) {
        const result = await bridge.dbSearchTools(debouncedSearch, searchTagIds, page);
        setTools(result.items);
        setTotalCount(result.total);
      } else {
        const result = await bridge.dbListTools(page);
        setTools(result.items);
        setTotalCount(result.total);
      }
    } catch (e) { console.error(e); }
  }, [debouncedSearch, searchTagIds, page]);

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) { initialLoadDone.current = true; setLoading(true); }
    load().finally(() => setLoading(false));
  }, [load]);

  const totalPages = Math.ceil(totalCount / page.size);

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input className="panel-search-input" value={search}
            onChange={e => { setSearch(e.target.value); setPage(p => ({ ...p, index: 1 })); }}
            placeholder={t("search.placeholder")} />
          <span className="panel-count">({Tools.length}/{totalCount})</span>
          <button className="btn btn-primary btn-small" onClick={() => { setEditTool(null); setEditItemTags([]); setEditItemImages([]); setShowEdit(true); }}>+ {t("tool.add")}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(allSearchTags.length > 0 || searchTagIds.length > 0) && (
            <div className="flex flex-wrap gap-1" style={{ flex: 1 }}>
              {allSearchTags.filter(t => t.is_fast || searchTagIds.includes(t.id)).slice(0, 15).map(tag => (
                <span key={tag.id}
                  className="tag-chip cursor-pointer"
                  style={{
                    background: searchTagIds.includes(tag.id) ? "#" + tag.color + "44" : "#" + tag.color + "22",
                    color: "#" + tag.color,
                    border: "1px solid #" + tag.color + (searchTagIds.includes(tag.id) ? "88" : "44"),
                  }}
                  onClick={() => {
                    setSearchTagIds(prev =>
                      prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                    );
                    setPage(p => ({ ...p, index: 1 }));
                  }}
                >{tag.name}</span>
              ))}
              <div ref={tagSearchRef} style={{ position: "relative", display: "inline-flex" }}>
                <input className="tag-input" value={tagSearchText}
                  onChange={e => setTagSearchText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addSearchTag(tagSearchText.trim()); }}
                  placeholder={t("tool.search_tags_placeholder")} style={{ width: 120, fontSize: 11, padding: "2px 6px" }} />
                {showTagSuggestions && tagSuggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100, background: "var(--bg-popup)", border: "1px solid var(--border-color)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 150, overflowY: "auto", minWidth: 120 }}>
                    {tagSuggestions.map(tag => (
                      <div key={tag.id} className="tag-chip" style={{ padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: "#" + tag.color + "22", color: "#" + tag.color, margin: 2, borderRadius: 4 }}
                        onClick={() => addSearchTag(tag.name)}>
                        {tag.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {searchTagIds.length > 0 && (
                <span className="tag-chip" style={{ background: "var(--bg-secondary)", color: "var(--ink-faint)", cursor: "pointer", border: "1px solid var(--border-color)" }}
                  onClick={() => { setSearchTagIds([]); setPage(p => ({ ...p, index: 1 })); }}>
                  x {t("tool.clear_filter")}
                </span>
              )}
            </div>
          )}
          <button className={"screenshot-toggle-btn" + (showScreenshots ? " active" : "")}
            onClick={() => setShowScreenshots(prev => !prev)}
            title={showScreenshots ? t("tool.switch_to_text") : t("tool.switch_to_screenshot")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="panel-list">
        {loading && <div className="empty-state"><p>{t("common.loading")}</p></div>}
        {!loading && Tools.length === 0 && (
          <div className="empty-state">
            <p>{search ? t("common.no_results") : t("common.no_items")}</p>
          </div>
        )}
        {Tools.map(e => (
          <ToolRow key={e.entity.id} Tool={e}
            showScreenshots={showScreenshots}
            onEdit={() => { setEditTool(e.entity); setEditItemTags(e.tags.map(t => t.id)); setEditItemImages(e.images || []); setShowEdit(true); }}
            onDelete={() => { try { bridge.dbDeleteTool(e.entity.id); load(); } catch {} }}
            onRun={() => { try { bridge.launchApp(e.entity.directory); } catch {} }}
            onOpenFolder={() => { bridge.openFolder(e.entity.directory).catch(e => showToast(e)); }}
            onStarToggle={async (star) => { try { await bridge.dbToggleToolStar(e.entity.id, star); load(); } catch {}}} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page.index <= 1}
            onClick={() => setPage(p => ({ ...p, index: p.index - 1 }))}>{'\u2039'}</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return <button key={p} className={"page-btn " + (page.index === p ? "active" : "")}
              onClick={() => setPage(prev => ({ ...prev, index: p }))}>{p}</button>;
          })}
          <button className="page-btn" disabled={page.index >= totalPages}
            onClick={() => setPage(p => ({ ...p, index: p.index + 1 }))}>{'\u203A'}</button>
        </div>
      )}

      {showEdit && (
        <ToolEditModal tool={editTool} initialTagIds={editItemTags} initialImages={editItemImages} onClose={() => setShowEdit(false)} onSaved={() => load().finally(() => setLoading(false))} />
      )}
    </div>
  );
};

export default ToolPanel;