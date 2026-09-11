import React, { useState, useEffect, useRef } from 'react';
import type { Settings, Tag } from '../types';
import * as bridge from '../bridge';
import { useI18n } from '../i18n';
import { IslandIcon } from '../components/island-icons';

interface SettingPanelProps {
  settings: Settings | null;
  onUpdateSettings: (s: Partial<Settings>) => void;
}

const ColorSwatch: React.FC<{ color: string; onChange: (color: string) => void }> = ({ color, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 16, height: 16, borderRadius: 4,
          background: color, cursor: "pointer",
          border: "2px solid var(--border-color)",
          transition: "border-color 150ms ease",
          flexShrink: 0,
        }}
        className="color-swatch"
        title="Change color"
      />
      <input ref={inputRef} type="color" value={color} onChange={e => onChange(e.target.value)} style={{ display: "none" }} />
    </>
  );
};

const OLD_DB_PATH = "C:/AEntrance/tools/GodotMemory/data/GodotMemory.db";

const SettingPanel: React.FC<SettingPanelProps> = ({ settings, onUpdateSettings }) => {
  const { t } = useI18n();
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") || "light");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.themeExplicit = next;
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleLanguage = (lang: string) => onUpdateSettings({ language: lang });
  const handleDefaultPanel = (panel: string) => onUpdateSettings({ default_panel: panel });

  const handleScreenShotDir = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({ directory: true, multiple: false }) as string | null;
      if (path) onUpdateSettings({ screen_shot_dir: path });
    } catch {}
  };

  const handleImport = async () => {
    setImporting(true); setImportResult(null); setImportError(null);
    try {
      const result = await bridge.dbImportFromPath(OLD_DB_PATH);
      setImportResult(t("import.success", { engines: result.engines, projs: result.projs, assets: result.assets, tools: result.tools, tags: result.tags }));
    } catch (e: any) {
      setImportError(t("import.error", { error: String(e) }));
    } finally { setImporting(false); }
  };

  // Tag management state
  const [allTypeTags, setAllTypeTags] = useState<{ type: string; typeId: number; tags: Tag[] }[]>([
    { type: 'Engine', typeId: 0, tags: [] },
    { type: 'Proj', typeId: 1, tags: [] },
    { type: 'Asset', typeId: 2, tags: [] },
    { type: 'Tool', typeId: 3, tags: [] },
  ]);

  useEffect(() => {
    allTypeTags.forEach(group => {
      bridge.dbListTags(group.typeId, 0).then(tags => {
        setAllTypeTags(prev => prev.map(g => g.typeId === group.typeId ? { ...g, tags } : g));
      }).catch(() => {});
    });
  }, []);

  const handleToggleFast = async (tag: Tag) => {
    try { await bridge.dbSetFastTag(tag.id, !tag.is_fast); } catch {}
    // Refresh
    bridge.dbListTags(tag.type, 0).then(tags => {
      setAllTypeTags(prev => prev.map(g => g.typeId === tag.type ? { ...g, tags } : g));
    }).catch(() => {});
  };

  const handleColorChange = async (tag: Tag, newColor: string) => {
    try { await bridge.dbUpdateTagColor(tag.id, newColor); } catch {}
    bridge.dbListTags(tag.type, 0).then(tags => {
      setAllTypeTags(prev => prev.map(g => g.typeId === tag.type ? { ...g, tags } : g));
    }).catch(() => {});
  };

  const handleDeleteTag = async (tag: Tag) => {
    try { await bridge.dbDeleteTag(tag.id); } catch {}
    setAllTypeTags(prev => prev.map(g => g.typeId === tag.type ? { ...g, tags: g.tags.filter(t => t.id !== tag.id) } : g));
  };

  if (!settings) return null;

  return (
    <div className="panel-container">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="setting-item">
          <div className="setting-info"><span className="setting-label">{t("setting.theme")}</span><span className="setting-desc">{theme === "light" ? t("settings.Light") : t("settings.Dark")}</span></div>
          <div className={"switch " + (theme === "dark" ? "switch--active" : "")} onClick={toggleTheme}><div className="switch-thumb" /></div>
        </div>

        <div className="setting-item">
          <div className="setting-info"><span className="setting-label">{t("setting.auto_start")}</span><span className="setting-desc">{t("setting.auto_start_desc")}</span></div>
          <div className={"switch " + (settings.auto_start ? "switch--active" : "")} onClick={() => onUpdateSettings({ auto_start: !settings.auto_start })}><div className="switch-thumb" /></div>
        </div>

        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("setting.language")}</span></div>
          <select className="form-select" value={settings.language} onChange={e => handleLanguage(e.target.value)} style={{ marginTop: 4 }}>
            <option value="zh_CN">中文</option><option value="en_US">English</option>
          </select>
        </div>

        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("setting.default_panel")}</span></div>
          <select className="form-select" value={settings.default_panel} onChange={e => handleDefaultPanel(e.target.value)} style={{ marginTop: 4 }}>
            {["Engine", "Proj", "Asset", "Tool", "Diary", "Setting"].map(p => <option key={p} value={p}>{t(p)}</option>)}
          </select>
        </div>

        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("setting.screenshot_dir")}</span></div>
          <div className="form-row" style={{ marginTop: 4 }}>
            <input className="form-input" value={settings.screen_shot_dir} onChange={e => onUpdateSettings({ screen_shot_dir: e.target.value })} placeholder={t("setting.placeholder_path_to_screenshot_folder")} />
            <button className="btn btn-secondary" onClick={handleScreenShotDir}>{t("setting.browse")}</button>
          </div>
        </div>

        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("setting.bubble_opacity")}</span><span className="setting-desc">{Math.round(settings.bubble_opacity * 100)}%</span></div>
          <input type="range" className="slider" min="30" max="100" value={Math.round(settings.bubble_opacity * 100)} onChange={e => onUpdateSettings({ bubble_opacity: parseInt(e.target.value) / 100 })} />
        </div>

        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("setting.bubble_size")}</span><span className="setting-desc">{settings.bubble_size}px</span></div>
          <input type="range" className="slider" min="64" max="160" value={settings.bubble_size} onChange={e => onUpdateSettings({ bubble_size: parseInt(e.target.value) })} />
        </div>

        <div className="setting-item">
          <div className="setting-info"><span className="setting-label">{t("setting.remember_position")}</span><span className="setting-desc">{t("setting.remember_position_desc")}</span></div>
          <div className={"switch " + (settings.remember_position ? "switch--active" : "")} onClick={() => onUpdateSettings({ remember_position: !settings.remember_position })}><div className="switch-thumb" /></div>
        </div>

        <div className="animal-divider" />

        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("import.title")}</span><span className="setting-desc">{t("import.desc")}</span></div>
          <div className="form-row" style={{ marginTop: 4, width: "100%" }}>
            <input className="form-input" value={OLD_DB_PATH} readOnly style={{ flex: 1, fontSize: 11, opacity: 0.7 }} />
          </div>
          <button className="btn btn-primary" onClick={handleImport} disabled={importing} style={{ width: "100%", marginTop: 6 }}>
            {importing ? t("common.loading") : t("import.button")}
          </button>
          {importResult && <div className="setting-notice setting-notice--ok">{importResult}</div>}
          {importError && <div className="setting-notice setting-notice--err">{importError}</div>}
        </div>

        {/* Tag Management */}
        <div className="animal-divider" />
        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("settings.fast_tags_management")}</span></div>
          {allTypeTags.map(group => (
            <div key={group.type} style={{ width: "100%" }}>
              <div className="animal-section-title" style={{ marginTop: 10, marginBottom: 6 }}>{t(group.type)}</div>
              <div className="flex flex-wrap gap-1">
                {group.tags.map(tag => (
                  <div key={tag.id} className="tag-chip" style={{ background: "#" + tag.color + "22", color: "#" + tag.color, border: "1px solid #" + tag.color + "44", display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", width: "auto" }}>
                    <input type="checkbox" checked={tag.is_fast} onChange={() => handleToggleFast(tag)} title="Quick tag" />
                    <span className="text-xs">{tag.name}</span>
                    <ColorSwatch color={"#" + tag.color} onChange={c => handleColorChange(tag, c.replace("#", ""))} />
                    <button className="tag-chip-delete" onClick={() => handleDeleteTag(tag)}>
                      <IslandIcon name="Trash" size={14} />
                    </button>
                  </div>
                ))}
                {group.tags.length === 0 && <span className="text-xs" style={{ color: "var(--animal-text-muted)" }}>No tags</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const settingStyles = `
.setting-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: var(--animal-bg-input);
  border: 2px solid var(--animal-border-soft);
  border-radius: 18px;
}
.setting-item--column { flex-direction: column; align-items: flex-start; gap: 6px; width: 100%; }
.setting-info { display: flex; flex-direction: column; gap: 2px; }
.setting-label { font-size: 13px; font-weight: 700; letter-spacing: 0.02em; color: var(--animal-text); }
.setting-desc { font-size: 11px; font-weight: 500; color: var(--animal-text-muted); }

/* Island switch — flat handle on an inset-shadowed track, no outer shadow */
.switch {
  position: relative;
  min-width: 52px; height: 28px;
  border: 2.5px solid var(--animal-border-light);
  border-radius: 50px;
  background: var(--animal-shadow-input);
  box-shadow: inset 0 2px 4px rgba(114, 93, 66, 0.15);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.25s var(--animal-ease), border-color 0.25s var(--animal-ease), box-shadow 0.25s var(--animal-ease);
}
.switch--active {
  background: #86d67a;
  border-color: var(--animal-success);
  box-shadow: inset 0 2px 4px rgba(90, 158, 30, 0.2);
}
.switch-thumb {
  position: absolute; top: 50%; left: 2px;
  width: 21px; height: 21px;
  border: 2.5px solid var(--animal-border-light);
  border-radius: 50%;
  background: var(--animal-bg-content);
  transform: translateY(-50%);
  transition: left 0.25s var(--animal-ease), border-color 0.25s var(--animal-ease);
}
.switch--active .switch-thumb { left: calc(100% - 24px); border-color: var(--animal-success); }
.switch:focus-visible { outline: 2px solid var(--animal-focus-yellow); outline-offset: 2px; }

/* Slider — cream track, teal handle with a 3D base */
.slider {
  width: 100%; margin-top: 6px;
  -webkit-appearance: none; appearance: none;
  height: 10px; border-radius: 50px;
  background: var(--animal-bg-secondary);
  border: 2px solid var(--animal-border-soft);
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--animal-primary);
  border: 2.5px solid var(--animal-primary-active);
  cursor: pointer;
  box-shadow: 0 3px 0 0 var(--animal-shadow-btn);
}
.slider::-moz-range-thumb {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--animal-primary);
  border: 2.5px solid var(--animal-primary-active);
  cursor: pointer;
}

.color-swatch:hover { border-color: var(--animal-primary) !important; }
.color-swatch { box-shadow: 0 2px 0 0 var(--animal-shadow-input); }

.tag-chip input[type="checkbox"] {
  appearance: none;
  width: 16px; height: 16px;
  border: 2px solid var(--animal-border-light);
  border-radius: 50%;
  background: var(--animal-bg-content);
  cursor: pointer; position: relative; flex-shrink: 0;
}
.tag-chip input[type="checkbox"]:checked { background: var(--animal-primary); border-color: var(--animal-primary-active); }
.tag-chip input[type="checkbox"]:checked::after {
  content: ''; position: absolute; left: 4px; top: 1px;
  width: 4px; height: 8px;
  border: solid #fffbe7; border-width: 0 2px 2px 0;
  transform: rotate(42deg);
}

.tag-chip-delete {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px;
  border: none; border-radius: 50%;
  background: rgba(114, 93, 66, 0.14);
  color: inherit; cursor: pointer; padding: 0; flex-shrink: 0;
  transition: background 0.15s var(--animal-ease);
}
.tag-chip-delete:hover { background: rgba(224, 90, 90, 0.35); color: var(--animal-error); }

/* Status notices */
.setting-notice {
  font-size: 12px; font-weight: 700;
  margin-top: 8px; padding: 8px 14px;
  border-radius: 14px;
  border: 2px solid currentColor;
  width: 100%;
}
.setting-notice--ok { color: #5a9e1e; background: rgba(111, 186, 44, 0.12); }
.setting-notice--err { color: #c94444; background: rgba(224, 90, 90, 0.12); }
.animal-divider { margin: 4px 0; }
`;

export const SettingsStyles = () => <style>{settingStyles}</style>;

export default SettingPanel;