import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Tool, Tag, ImageRecord, EntityWithExtras, Page } from '../types';
import { TagType } from '../types';
import * as bridge from '../bridge';
import { useI18n } from '../i18n';
import { useDebounce } from '../hooks/usePanelManager';
import { useTagSelector } from '../hooks/useTagSelector';
import { useToast } from '../components/Toast';
import { IslandIcon } from '../components/island-icons';
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
      <div className="modal modal--blob" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? t("tool.add") : t("tool.edit")}</span>
          <button className="modal-close" onClick={onClose}><IslandIcon name="Close" size={22} /></button>
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
                <div className="suggest-panel suggest-panel--up">
                  {suggestions.map(tag => (
                    <div key={tag.id} className="tag-chip" style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, background: "#" + tag.color + "22", color: "#" + tag.color }}
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
        <div className="item-icon item-icon--sticker" style={{ background: iconSrc ? "transparent" : "#f0a92c" }}>
          {iconSrc ? <img src={iconSrc} alt="" onError={() => setIconSrc(null)} /> : <span className="item-icon-placeholder" style={{ color: "white", fontSize: 12 }}>T</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <ScreenshotView images={Tool.images} />
        </div>
        <div className="item-actions">
          <button className="item-btn" onClick={() => onStarToggle(!e.star)} title={e.star ? t("common.unstar") : t("common.star")}>
            <IslandIcon name={e.star ? "Star" : "Bookmark"} size={18} />
          </button>
          <button className="item-btn" onClick={onRun} title={t("tool.run")}><IslandIcon name="Play" size={18} /></button>
          <button className="item-btn" onClick={onOpenFolder} title={t("common.open_dir")}><IslandIcon name="Folder" size={18} /></button>
          <button className="item-btn" onClick={onEdit} title={t("common.edit")}><IslandIcon name="Edit" size={18} /></button>
          <button className="item-btn danger" onClick={onDelete} title={t("Delete")}><IslandIcon name="Trash" size={18} /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="item-row">
      <div className="item-icon item-icon--sticker" style={{ background: iconSrc ? "transparent" : "#f0a92c" }}>
        {iconSrc ? <img src={iconSrc} alt="" onError={() => setIconSrc(null)} /> : <span className="item-icon-placeholder" style={{ color: "white", fontSize: 12 }}>T</span>}
      </div>
      <div className="item-info">
        <div className="item-name">{e.name || t("tool.unnamed")}</div>
        <div className="item-sub">{e.directory || t("tool.no_path")}</div>
      </div>
      <div className="item-tags">{Tool.tags.slice(0, 3).map(t => <span key={t.id} className="tag-chip" style={{ background: "#" + t.color + "22", color: "#" + t.color }}>{t.name}</span>)}</div>
      <div className="item-actions">
        <button className="item-btn" onClick={() => onStarToggle(!e.star)} title={e.star ? t("common.unstar") : t("common.star")}>
          <IslandIcon name={e.star ? "Star" : "Bookmark"} size={18} />
        </button>
        <button className="item-btn" onClick={onRun} title={t("tool.run")}><IslandIcon name="Play" size={18} /></button>
        <button className="item-btn" onClick={onOpenFolder} title={t("common.open_dir")}><IslandIcon name="Folder" size={18} /></button>
        <button className="item-btn" onClick={onEdit} title={t("common.edit")}><IslandIcon name="Edit" size={18} /></button>
        <button className="item-btn danger" onClick={onDelete} title={t("Delete")}><IslandIcon name="Trash" size={18} /></button>
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
      <div className="panel-header panel-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input className="panel-search-input" value={search}
            onChange={e => { setSearch(e.target.value); setPage(p => ({ ...p, index: 1 })); }}
            placeholder={t("search.placeholder")} />
          <span className="panel-count">({Tools.length}/{totalCount})</span>
          <button className="btn btn-primary btn-small" onClick={() => { setEditTool(null); setEditItemTags([]); setEditItemImages([]); setShowEdit(true); }}><IslandIcon name="Plus" size={16} /> {t("tool.add")}</button>
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
                  placeholder={t("tool.search_tags_placeholder")} />
                {showTagSuggestions && tagSuggestions.length > 0 && (
                  <div className="suggest-panel suggest-panel--down">
                    {tagSuggestions.map(tag => (
                      <div key={tag.id} className="tag-chip" style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, background: "#" + tag.color + "22", color: "#" + tag.color }}
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
            <IslandIcon name="Camera" size={20} />
          </button>
        </div>
      </div>

      <div className="panel-list">
        {loading && <div className="empty-state"><IslandIcon name="Snail" size={56} /><p>{t("common.loading")}</p></div>}
        {!loading && Tools.length === 0 && (
          <div className="empty-state">
            <IslandIcon name="Snail" size={56} />
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