import React, { useState, useEffect, useRef } from 'react';
import type { Settings, Tag } from '../types';
import * as bridge from '../bridge';
import { useI18n } from '../i18n';

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

  if (!settings) return null;

  return (
    <div className="panel-container">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="setting-item">
          <div className="setting-info"><span className="setting-label">{t("setting.theme")}</span><span className="setting-desc">{theme === "light" ? t("settings.Light") : t("settings.Dark")}</span></div>
          <div className={"switch " + (theme === "dark" ? "switch--active" : "")} onClick={toggleTheme}><div className="switch-thumb" /></div>
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

        <div className="settings-divider" style={{ height: 1, background: "var(--border-color)", margin: "4px 0" }} />

        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("import.title")}</span><span className="setting-desc">{t("import.desc")}</span></div>
          <div className="form-row" style={{ marginTop: 4, width: "100%" }}>
            <input className="form-input" value={OLD_DB_PATH} readOnly style={{ flex: 1, fontSize: 11, opacity: 0.7 }} />
          </div>
          <button className="btn btn-primary" onClick={handleImport} disabled={importing} style={{ width: "100%", marginTop: 6 }}>
            {importing ? "导入中..." : t("import.button")}
          </button>
          {importResult && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6, padding: "6px 8px", background: "rgba(34,197,94,0.08)", borderRadius: 6 }}>{importResult}</div>}
          {importError && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, padding: "6px 8px", background: "rgba(239,68,68,0.08)", borderRadius: 6 }}>{importError}</div>}
        </div>

        {/* Tag Management */}
        <div className="h-px" style={{ background: "var(--border-color)" }} />
        <div className="setting-item setting-item--column">
          <div className="setting-info"><span className="setting-label">{t("settings.fast_tags_management")}</span></div>
          {allTypeTags.map(group => (
            <div key={group.type} style={{ width: "100%" }}>
              <div className="setting-label" style={{ marginTop: 8, marginBottom: 4, fontSize: 11, opacity: 0.7 }}>{t(group.type)}</div>
              <div className="flex flex-wrap gap-1">
                {group.tags.map(tag => (
                  <div key={tag.id} className="tag-chip" style={{ background: "#" + tag.color + "22", color: "#" + tag.color, border: "1px solid #" + tag.color + "44", display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", width: "auto" }}>
                    <input type="checkbox" checked={tag.is_fast} onChange={() => handleToggleFast(tag)} style={{ width: 12, height: 12, accentColor: "#" + tag.color }} title="Quick tag" />
                    <span className="text-xs">{tag.name}</span>
                    <ColorSwatch color={"#" + tag.color} onChange={c => handleColorChange(tag, c.replace("#", ""))} />
                    <button className="tag-chip-delete" onClick={async () => {}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                ))}
                {group.tags.length === 0 && <span className="text-xs" style={{ color: "var(--ink-faint)" }}>No tags</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const settingStyles = `
.setting-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; }
.setting-item--column { flex-direction: column; align-items: flex-start; gap: 4px; }
.setting-info { display: flex; flex-direction: column; gap: 1px; }
.setting-label { font-size: 13px; font-weight: 500; color: var(--ink-strong); }
.setting-desc { font-size: 11px; color: var(--ink-faint); }
.switch { width: 36px; height: 20px; border-radius: 10px; background: var(--border-color); cursor: pointer; position: relative; transition: background 150ms ease; flex-shrink: 0; }
.switch--active { background: var(--accent-blue); }
.switch-thumb { width: 16px; height: 16px; border-radius: 50%; background: white; position: absolute; top: 2px; left: 2px; transition: transform 150ms ease; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.switch--active .switch-thumb { transform: translateX(16px); }
.slider { width: 100%; margin-top: 4px; -webkit-appearance: none; height: 4px; border-radius: 2px; background: var(--border-color); outline: none; }
.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent-blue); cursor: pointer; }
.color-swatch:hover { border-color: var(--accent-blue) !important; }
.tag-chip-delete { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: none; border-radius: 4px; background: rgba(0,0,0,0.08); color: inherit; cursor: pointer; padding: 0; flex-shrink: 0; transition: background 150ms ease; opacity: 0.5; }
.tag-chip-delete:hover { background: rgba(239,68,68,0.2); color: var(--danger); opacity: 1; }
`;

export const SettingsStyles = () => <style>{settingStyles}</style>;

export default SettingPanel;