import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Asset, Tag, ImageRecord, EntityWithExtras, Page } from '../types';
import { TagType } from '../types';
import * as bridge from '../bridge';
import { useI18n } from '../i18n';
import { useDebounce } from '../hooks/usePanelManager';
import { useTagSelector } from '../hooks/useTagSelector';
import { useToast } from '../components/Toast';
import ScreenshotView from '../components/ScreenshotView';
import ImageManager from '../components/ImageManager';
import { open } from '@tauri-apps/plugin-shell';
import '../styles/panels.css';

interface AssetEditModalProps {
  asset: Partial<Asset> | null;
  initialTagIds?: string[];
  initialImages?: ImageRecord[];
  onClose: () => void;
  onSaved: () => void;
}

const AssetEditModal: React.FC<AssetEditModalProps> = ({ asset, initialTagIds, initialImages, onClose, onSaved }) => {
  const { t } = useI18n();
  const isNew = !asset?.id;
  const [name, setName] = useState(asset?.name ?? "");
  const [dir, setDir] = useState(asset?.directory ?? "");
  const [link, setLink] = useState(asset?.link ?? "");
  const [copyRight, setCopyRight] = useState(asset?.copy_right ?? "");
  const [desc, setDesc] = useState(asset?.desc ?? "");
  const [saving, setSaving] = useState(false);
  const [imageRecords, setImageRecords] = useState<ImageRecord[]>(initialImages || []);

  const {
    tagIds, setTagIds, allTags, fastTags, tagInput, setTagInput,
    suggestions, showSuggestions, setShowSuggestions, suggestRef,
    handleAddTag, handleRemoveTag, handleSelectSuggestion,
  } = useTagSelector(TagType.Asset, 0, initialTagIds || []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Partial<Asset> = { name, directory: dir, link, copy_right: copyRight, desc };
      const imageIds = imageRecords.map(r => r.id);
      if (isNew) await bridge.dbAddAsset(data, tagIds, imageIds);
      else if (asset?.id) await bridge.dbUpdateAsset({ ...data, id: asset.id } as Asset, tagIds, imageIds);
      onSaved(); onClose();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? t("asset.add") : t("asset.edit")}</span>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">{t("asset.name")}</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t("asset.placeholder_name")} /></div>
          <div className="form-group"><label className="form-label">{t("asset.directory")}</label><input className="form-input" value={dir} onChange={e => setDir(e.target.value)} placeholder={t("asset.placeholder_directory")} /></div>
          <div className="form-group"><label className="form-label">{t("asset.link")}</label><input className="form-input" value={link} onChange={e => setLink(e.target.value)} placeholder={t("asset.placeholder_link")} /></div>
          <div className="form-group"><label className="form-label">{t("asset.copyright")}</label><input className="form-input" value={copyRight} onChange={e => setCopyRight(e.target.value)} placeholder={t("asset.placeholder_copyright")} /></div>
          <div className="form-group"><label className="form-label">{t("asset.desc")}</label><textarea className="form-textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t("asset.placeholder_desc")} /></div>
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
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name || !dir}>{saving ? t("asset.saving") : t("Save")}</button>
        </div>
      </div>
    </div>
  );
};

interface AssetRowProps {
  Asset: EntityWithExtras<Asset>;
  showScreenshots?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onOpenFolder: () => void;
  onStarToggle: (star: boolean) => void;
}

const AssetRow: React.FC<AssetRowProps> = ({ Asset, showScreenshots, onEdit, onDelete, onRun, onOpenFolder, onStarToggle }) => {
  const e = Asset.entity;
  const [iconSrc, setIconSrc] = useState<string | null>(null);
  useEffect(() => {
    if (Asset.images.length > 0) {
      bridge.dbLoadImage(Asset.images[0].id).then(setIconSrc).catch(() => setIconSrc(null));
    }
  }, [Asset.images]);
  const { t } = useI18n();
  if (showScreenshots) {
    return (
      <div className="item-row">
        <div className="item-icon" style={{ background: iconSrc ? "transparent" : "#6366f1" }}>
          {iconSrc ? <img src={iconSrc} alt="" onError={() => setIconSrc(null)} /> : <span className="item-icon-placeholder" style={{ color: "white", fontSize: 12 }}>A</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <ScreenshotView images={Asset.images} />
        </div>
        <div className="item-actions">
          <button className="item-btn" onClick={() => onStarToggle(!e.star)} title={e.star ? t("common.unstar") : t("common.star")}>
            {e.star
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
          </button>
          {e.link && <button className="item-btn" onClick={onRun} title={t("asset.open_link")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </button>}
          <button className="item-btn" onClick={onOpenFolder} title={t("asset.open_folder")}>
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
      <div className="item-icon" style={{ background: iconSrc ? "transparent" : "#6366f1" }}>
        {iconSrc ? <img src={iconSrc} alt="" onError={() => setIconSrc(null)} /> : <span className="item-icon-placeholder" style={{ color: "white", fontSize: 12 }}>A</span>}
      </div>
      <div className="item-info">
        <div className="item-name">{e.name || t("asset.unnamed")}</div>
        <div className="item-sub">{e.link || e.directory || t("asset.no_path")}</div>
      </div>
      <div className="item-tags">{Asset.tags.slice(0, 3).map(t => <span key={t.id} className="tag-chip" style={{ background: "#" + t.color + "22", color: "#" + t.color }}>{t.name}</span>)}</div>
      <div className="item-actions">
        <button className="item-btn" onClick={() => onStarToggle(!e.star)} title={e.star ? t("common.unstar") : t("common.star")}>
          {e.star
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
        </button>
        {e.link && <button className="item-btn" onClick={onRun} title={t("asset.open_link")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
        </button>}
        <button className="item-btn" onClick={onOpenFolder} title={t("asset.open_folder")}>
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

const AssetPanel: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [Assets, setAssets] = useState<EntityWithExtras<Asset>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState<Page>({ index: 1, size: 30 });
  const [editItemTags, setEditItemTags] = useState<string[]>([]);
  const [editItemImages, setEditItemImages] = useState<ImageRecord[]>([]);
  const [editAsset, setEditAsset] = useState<Partial<Asset> | null>(null);
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

  useEffect(() => { bridge.dbListTags(TagType.Asset, 0).then(setAllSearchTags).catch(() => {}); }, []);

  // Tag search autocomplete
  useEffect(() => {
    if (tagSearchText.trim().length < 1) { setTagSuggestions([]); setShowTagSuggestions(false); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await bridge.dbQueryTagByNameLike(tagSearchText.trim(), TagType.Asset, 0);
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
        const result = await bridge.dbSearchAssets(debouncedSearch, searchTagIds, page);
        setAssets(result.items);
        setTotalCount(result.total);
      } else {
        const result = await bridge.dbListAssets(page);
        setAssets(result.items);
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
          <span className="panel-count">({Assets.length}/{totalCount})</span>
          <button className="btn btn-primary btn-small" onClick={() => { setEditAsset(null); setEditItemTags([]); setEditItemImages([]); setShowEdit(true); }}>+ {t("Add")}</button>
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
                  placeholder={t("asset.placeholder_search_tags")} style={{ width: 120, fontSize: 11, padding: "2px 6px" }} />
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
                  {t("asset.filter_clear")}
                </span>
              )}
            </div>
          )}
          <button className={"screenshot-toggle-btn" + (showScreenshots ? " active" : "")}
            onClick={() => setShowScreenshots(prev => !prev)}
            title={showScreenshots ? t("asset.switch_to_text") : t("asset.switch_to_screenshot")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="panel-list">
        {loading && <div className="empty-state"><p>{t("common.loading")}</p></div>}
        {!loading && Assets.length === 0 && (
          <div className="empty-state">
            <p>{search ? t("common.no_results") : t("common.no_items")}</p>
          </div>
        )}
        {Assets.map(e => (
          <AssetRow key={e.entity.id} Asset={e}
            showScreenshots={showScreenshots}
            onEdit={() => { setEditAsset(e.entity); setEditItemTags(e.tags.map(t => t.id)); setEditItemImages(e.images || []); setShowEdit(true); }}
            onDelete={() => { try { bridge.dbDeleteAsset(e.entity.id); load(); } catch {} }}
            onRun={() => { const link = e.entity.link; if (link) open(link).catch(() => {}); }}
            onOpenFolder={() => { bridge.openFolder(e.entity.directory).catch(e => showToast(e)); }}
            onStarToggle={async (star) => { try { await bridge.dbToggleAssetStar(e.entity.id, star); load(); } catch {}}} />
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
        <AssetEditModal asset={editAsset} initialTagIds={editItemTags} initialImages={editItemImages} onClose={() => setShowEdit(false)} onSaved={() => load().finally(() => setLoading(false))} />
      )}
    </div>
  );
};

export default AssetPanel;