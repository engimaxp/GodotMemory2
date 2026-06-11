import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Proj, Engine, Tag, ImageRecord, EntityWithExtras, Page } from '../types';
import { TagType } from '../types';
import * as bridge from '../bridge';
import { useI18n } from '../i18n';
import { useDebounce } from '../hooks/usePanelManager';
import { useTagSelector } from '../hooks/useTagSelector';
import { useToast } from '../components/Toast';
import ScreenshotView from '../components/ScreenshotView';
import ImageManager from '../components/ImageManager';
import '../styles/panels.css';

interface ProjEditModalProps {
  proj: Partial<Proj> | null;
  initialTagIds?: string[];
  initialImages?: ImageRecord[];
  onClose: () => void;
  onSaved: () => void;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^["']|["']$/g, '');
}

const ProjEditModal: React.FC<ProjEditModalProps> = ({ proj, initialTagIds, initialImages, onClose, onSaved }) => {
  const { t } = useI18n();
  const isNew = !proj?.id;
  const [name, setName] = useState(proj?.name ?? "");
  const [dir, setDir] = useState(proj?.directory ?? "");
  const [version, setVersion] = useState(proj?.version ?? "");
  const [mainVersion, setMainVersion] = useState(String(proj?.main_version ?? ""));
  const [engineId, setEngineId] = useState(proj?.engine_id ?? "");
  const [desc, setDesc] = useState(proj?.desc ?? "");
  const [saving, setSaving] = useState(false);
  const [engines, setEngines] = useState<EntityWithExtras<Engine>[]>([]);
  const [imageRecords, setImageRecords] = useState<ImageRecord[]>(initialImages || []);
  const [iconId, setIconId] = useState<string | null>(proj?.icon ?? null);
  const [iconSrc, setIconSrc] = useState<string | null>(null);
  useEffect(() => {
    if (proj?.icon) {
      bridge.dbLoadImage(proj.icon).then(setIconSrc).catch(() => setIconSrc(null));
    }
  }, [proj?.icon]);

  const dirTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { bridge.dbListAllEngines().then(setEngines).catch(() => {}); }, []);

  const handleDirChange = (value: string) => {
    const normalized = normalizePath(value);
    setDir(normalized);
    if (dirTimerRef.current) clearTimeout(dirTimerRef.current);
    dirTimerRef.current = setTimeout(async () => {
      if (!normalized.trim()) return;
      try {
        const info = await bridge.scanProjectFile(normalized.trim());
        if (info) {
          if (info.name && !proj?.id) setName(info.name);
          if (info.main_version) setMainVersion(info.main_version);
          if (info.version) setVersion(info.version);
          if (info.real_icon_path) {
            try {
              const record = await bridge.dbCopyImageToCache(info.real_icon_path);
              setIconId(record.id);
              const b64 = await bridge.dbLoadImage(record.id);
              if (b64) setIconSrc(b64);
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }, 600);
  };

  useEffect(() => () => { if (dirTimerRef.current) clearTimeout(dirTimerRef.current); }, []);

  const {
    tagIds, setTagIds, allTags, fastTags, tagInput, setTagInput,
    suggestions, showSuggestions, setShowSuggestions, suggestRef,
    handleAddTag, handleRemoveTag, handleSelectSuggestion,
  } = useTagSelector(TagType.Proj, 0, initialTagIds || []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Partial<Proj> = { version, directory: dir, name, main_version: parseInt(mainVersion) || 4, engine_id: engineId, desc, icon: iconId ?? proj?.icon ?? '' };
      const imageIds = imageRecords.map(r => r.id);
      if (isNew) await bridge.dbAddProj(data, tagIds, imageIds);
      else if (proj?.id) await bridge.dbUpdateProj({ ...data, id: proj.id } as Proj, tagIds, imageIds);
      onSaved(); onClose();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          {iconSrc && <img src={iconSrc} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "contain" }} />}
          {!iconSrc && <div className="item-icon" style={{ width: 28, height: 28, borderRadius: 4, background: ((parseInt(mainVersion) || 4) === 3 ? "#478bfb" : "#6d28d9"), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 10, fontWeight: 600 }}>{(parseInt(mainVersion) || 4) === 3 ? "G3" : "G4"}</span>
          </div>}
          <span className="modal-title">{isNew ? t("proj.add") : t("proj.edit")}</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">{t("proj.name")}</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t("proj.name_placeholder")} /></div>
          <div className="form-group"><label className="form-label">{t("proj.directory")}</label><input className="form-input" value={dir} onChange={e => handleDirChange(e.target.value)} placeholder={t("proj.dir_placeholder")} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">{t("engine.main_version")}</label><input className="form-input" value={mainVersion} onChange={e => setMainVersion(e.target.value)} placeholder={t("proj.main_version_placeholder")} /></div>
            <div className="form-group"><label className="form-label">{t("engine.version")}</label><input className="form-input" value={version} onChange={e => setVersion(e.target.value)} placeholder={t("proj.version_placeholder")} /></div>
          </div>
          <div className="form-group"><label className="form-label">{t("proj.engine")}</label>
            <select className="form-select" value={engineId} onChange={e => setEngineId(e.target.value)}>
              <option value="">{t("proj.select_engine")}</option>
              {engines.filter(eng => eng.entity.main_version === (parseInt(mainVersion) || 4)).map(eng => (
                <option key={eng.entity.id} value={eng.entity.id}>{eng.entity.name} ({eng.entity.version})</option>
              ))}
            </select>
          </div>
          <div className="form-group"><label className="form-label">{t("proj.desc")}</label><textarea className="form-textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t("proj.desc_placeholder")} /></div>
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
              <button className="btn btn-secondary btn-small" onClick={() => handleAddTag()}>{t("Add")}</button>
              {/* Auto-complete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--bg-popup)", border: "1px solid var(--border-color)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 150, overflowY: "auto" }}>
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
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name || !dir}>{saving ? t("common.saving") : t("Save")}</button>
        </div>
      </div>
    </div>
  );
};

interface ProjRowProps {
  Proj: EntityWithExtras<Proj>;
  engineName?: string;
  showScreenshots?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onOpenFolder: () => void;
  onStarToggle: (star: boolean) => void;
}

const ProjRow: React.FC<ProjRowProps> = ({ Proj, engineName, showScreenshots, onEdit, onDelete, onRun, onOpenFolder, onStarToggle }) => {
  const { t } = useI18n();
  const e = Proj.entity;
  const [iconSrc, setIconSrc] = useState<string | null>(null);
  useEffect(() => {
    if (e.icon) {
      bridge.dbLoadImage(e.icon).then(setIconSrc).catch(() => setIconSrc(null));
    }
  }, [e.icon]);
  if (showScreenshots) {
    return (
      <div className="item-row">
        <div className="item-icon" style={{ background: iconSrc ? "transparent" : (e.main_version === 3 ? "#478bfb" : "#6d28d9") }}>
          {iconSrc ? <img src={iconSrc} alt="" onError={() => setIconSrc(null)} /> : <span className="item-icon-placeholder" style={{ color: "white", fontSize: 12 }}>{e.main_version === 3 ? "G3" : "G4"}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <ScreenshotView images={Proj.images} />
        </div>
        <div className="item-actions">
          <button className="item-btn" onClick={() => onStarToggle(!e.star)} title={e.star ? t("common.unstar") : t("common.star")}>
            {e.star
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
          </button>
          <button className="item-btn" onClick={onRun} title={t("common.run")}>
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
      <div className="item-icon" style={{ background: iconSrc ? "transparent" : (e.main_version === 3 ? "#478bfb" : "#6d28d9") }}>
        {iconSrc ? <img src={iconSrc} alt="" onError={() => setIconSrc(null)} /> : <span className="item-icon-placeholder" style={{ color: "white", fontSize: 12 }}>{e.main_version === 3 ? "G3" : "G4"}</span>}
      </div>
      <div className="item-info">
        <div className="item-name">{e.name || t("proj.unnamed")}</div>
        <div className="item-sub">{e.version} | {e.directory}</div>
        {engineName && <div className="item-sub" style={{ fontSize: 11, opacity: 0.7 }}>{t("proj.engine_label", { name: engineName })}</div>}
      </div>
      <div className="item-tags">{Proj.tags.slice(0, 3).map(t => <span key={t.id} className="tag-chip" style={{ background: "#" + t.color + "22", color: "#" + t.color }}>{t.name}</span>)}</div>
      <div className="item-actions">
        <button className="item-btn" onClick={() => onStarToggle(!e.star)} title={e.star ? t("common.unstar") : t("common.star")}>
          {e.star
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
        </button>
        <button className="item-btn" onClick={onRun} title={t("common.run")}>
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

const ProjPanel: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [items, setItems] = useState<EntityWithExtras<Proj>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState<Page>({ index: 1, size: 30 });
  const [editItem, setEditItem] = useState<Partial<Proj> | null>(null);
  const [editItemTags, setEditItemTags] = useState<string[]>([]);
  const [editItemImages, setEditItemImages] = useState<ImageRecord[]>([]);
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
  // Engine map for displaying associated engine name
  const [engineMap, setEngineMap] = useState<Record<string, Engine>>({});

  useEffect(() => {
    bridge.dbListTags(TagType.Proj, 0).then(setAllSearchTags).catch(() => {});
    bridge.dbListAllEngines().then(engines => {
      const map: Record<string, Engine> = {};
      engines.forEach(e => { map[e.entity.id] = e.entity; });
      setEngineMap(map);
    }).catch(() => {});
  }, []);

  // Tag search autocomplete
  useEffect(() => {
    if (tagSearchText.trim().length < 1) { setTagSuggestions([]); setShowTagSuggestions(false); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await bridge.dbQueryTagByNameLike(tagSearchText.trim(), TagType.Proj, 0);
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
        const result = await bridge.dbSearchProjs(debouncedSearch, searchTagIds, page);
        setItems(result.items);
        setTotalCount(result.total);
      } else {
        const result = await bridge.dbListProjs(page);
        setItems(result.items);
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
          <span className="panel-count">({items.length}/{totalCount})</span>
          <button className="btn btn-primary btn-small" onClick={() => { setEditItem(null); setEditItemTags([]); setEditItemImages([]); setShowEdit(true); }}>+ {t("proj.add")}</button>
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
                  placeholder={t("proj.search_tags_placeholder")} style={{ width: 120, fontSize: 11, padding: "2px 6px" }} />
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
                  x {t("search.clear")}
                </span>
              )}
            </div>
          )}
          <button className={"screenshot-toggle-btn" + (showScreenshots ? " active" : "")}
            onClick={() => setShowScreenshots(prev => !prev)}
            title={showScreenshots ? t("proj.switch_to_text") : t("proj.switch_to_screenshot")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="panel-list">
        {loading && <div className="empty-state"><p>{t("common.loading")}</p></div>}
        {!loading && items.length === 0 && (
          <div className="empty-state">
            <p>{search ? t("common.no_results") : t("common.no_items")}</p>
          </div>
        )}
        {items.map(e => (
          <ProjRow key={e.entity.id} Proj={e}
            engineName={engineMap[e.entity.engine_id]?.name}
            showScreenshots={showScreenshots}
            onEdit={() => { setEditItem(e.entity); setEditItemTags(e.tags.map(t => t.id)); setEditItemImages(e.images || []); setShowEdit(true); }}
            onDelete={() => { try { bridge.dbDeleteProj(e.entity.id); load(); } catch {} }}
            onStarToggle={async (star) => { try { await bridge.dbToggleProjStar(e.entity.id, star); load(); } catch {} }}
            onRun={() => {
              const engine = engineMap[e.entity.engine_id];
              if (engine) {
                bridge.launchProject(engine.directory, e.entity.directory);
              } else {
                showToast(t("proj.no_engine"));
              }
            }}
            onOpenFolder={() => { bridge.openFolder(e.entity.directory).catch(e => showToast(e)); }} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page.index <= 1}
            onClick={() => setPage(p => ({ ...p, index: p.index - 1 }))}>{'\u2039'}</button>
          {(() => {
            const total = totalPages;
            const cur = page.index;
            const pages: (number | string)[] = [];
            if (total <= 7) {
              for (let i = 1; i <= total; i++) pages.push(i);
            } else {
              pages.push(1);
              if (cur > 4) pages.push('...');
              for (let i = Math.max(2, cur - 3); i <= Math.min(total - 1, cur + 3); i++) pages.push(i);
              if (cur < total - 3) pages.push('...');
              pages.push(total);
            }
            return pages.map((p, idx) =>
              p === '...'
                ? <span key={'e' + idx} className="page-btn" style={{ border: 'none', cursor: 'default', fontSize: 12, background: 'transparent' }}>...</span>
                : <button key={p} className={"page-btn " + (page.index === p ? "active" : "")}
                    onClick={() => setPage(prev => ({ ...prev, index: p as number }))}>{p}</button>
            );
          })()}
          <button className="page-btn" disabled={page.index >= totalPages}
            onClick={() => setPage(p => ({ ...p, index: p.index + 1 }))}>{'\u203A'}</button>
        </div>
      )}

      {showEdit && (
        <ProjEditModal proj={editItem} initialTagIds={editItemTags} initialImages={editItemImages} onClose={() => setShowEdit(false)} onSaved={() => load().finally(() => setLoading(false))} />
      )}
    </div>
  );
};

export default ProjPanel;