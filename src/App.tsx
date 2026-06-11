import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { Bubble } from './components/Bubble';
import { PopupPanel } from './components/PopupPanel';
import EnginePanel from './panels/EnginePanel';
import ProjPanel from './panels/ProjPanel';
import AssetPanel from './panels/AssetPanel';
import ToolPanel from './panels/ToolPanel';
import DiaryPanel from './panels/DiaryPanel';
import SettingPanel, { SettingsStyles } from './panels/SettingPanel';
import { I18nProvider, type Language } from './i18n';
import * as bridge from './bridge';
import type { WindowMode, PanelName, SnapEdge, Settings } from './types';
import './styles/Bubble.css';
import './styles/PopupPanel.css';
import './styles/panels.css';

// Main application window component
function MainWindow() {
  const [windowMode, setWindowMode] = useState<WindowMode>('ball');
  const [activePanel, setActivePanel] = useState<PanelName>('Engine');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [snappedEdge, setSnappedEdge] = useState<SnapEdge>('None');
  const [initialized, setInitialized] = useState(false);

  const initDone = useRef(false);

  // Load settings on mount
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const load = async () => {
      try {
        const s = await bridge.getSettings();
        setSettings(s);
        setActivePanel((s.default_panel as PanelName) || 'Engine');
        setSnappedEdge(s.last_snap_edge || 'None');

        // Apply theme from system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

        setInitialized(true);
      } catch (e) {
        console.error('Failed to load settings', e);
        setInitialized(true);
      }
    };
    load();
  }, []);

  // Listen for window mode changes from system tray
  useEffect(() => {
    const unlisten = listen<string>('window:mode', (event) => {
      setWindowMode(event.payload as WindowMode);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Updates settings
  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);
    try {
      await bridge.saveSettings(newSettings);
    } catch (e) {
      console.error('Save settings failed', e);
    }
  }, [settings]);

  // Bubble drag handling
  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean }>({
    startX: 0, startY: 0, dragging: false,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
  }, []);

  const handleMouseMove = useCallback(async (e: React.MouseEvent) => {
    if (!dragRef.current.startX) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      if (!dragRef.current.dragging) {
        dragRef.current.dragging = true;
        try {
          await bridge.startDragging();
        } catch {}
      }
    }
  }, []);

  const handleMouseUp = useCallback(async (_e: React.MouseEvent, onClick: () => void) => {
    if (!dragRef.current.dragging) {
      onClick();
    }
    dragRef.current = { startX: 0, startY: 0, dragging: false };
  }, []);

  const switchToPanel = useCallback(async () => {
    try {
      await bridge.setWindowMode('panel');
      await bridge.resizeWindow(750, 1050);
    } catch {}
  }, []);

  const switchToBall = useCallback(async () => {
    try {
      await bridge.setWindowMode('ball');
    } catch {}
  }, []);

  const handleBubbleClick = useCallback(async () => {
    if (windowMode === 'ball') {
      await switchToPanel();
      setWindowMode('panel');
    }
  }, [windowMode, switchToPanel]);

  const handleClosePanel = useCallback(async () => {
    await switchToBall();
    setWindowMode('ball');
  }, [switchToBall]);

  const handlePanelChange = useCallback((panel: PanelName) => {
    setActivePanel(panel);
  }, []);

  // Panel rendering
  const renderPanel = () => {
    switch (activePanel) {
      case 'Engine': return <EnginePanel />;
      case 'Proj': return <ProjPanel />;
      case 'Asset': return <AssetPanel />;
      case 'Tool': return <ToolPanel />;
      case 'Diary': return <DiaryPanel />;
      case 'Setting': return (
        <SettingPanel settings={settings} onUpdateSettings={updateSettings} />
      );
      default: return <EnginePanel />;
    }
  };

  if (!initialized) return null;

  const lang = (settings?.language || 'zh_CN') as Language;

  return (
    <I18nProvider language={lang}>
    <div className="app-container">
      <SettingsStyles />

      {windowMode === 'ball' && (
        <Bubble
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={(e) => handleMouseUp(e, handleBubbleClick)}
          opacity={settings?.bubble_opacity ?? 0.85}
          size={settings?.bubble_size ?? 110}
        />
      )}

      {windowMode === 'panel' && (
        <PopupPanel
          visible={true}
          onClose={handleClosePanel}
          snappedEdge={snappedEdge}
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
        >
          {renderPanel()}
        </PopupPanel>
      )}
    </div>
    </I18nProvider>
  );
}

// Settings window component (opened separately)
function SettingsWindow() {
  return (
    <div className="w-full h-full p-4 text-sm" style={{ color: 'var(--color-ink-soft)' }}>
      <p>Settings are shown in the main panel under Setting tab.</p>
    </div>
  );
}

export default function App() {
  const [isSettings, setIsSettings] = useState(false);

  useEffect(() => {
    try {
      const label = getCurrentWindow().label;
      setIsSettings(label === 'settings');
    } catch {
      setIsSettings(false);
    }
  }, []);

  return isSettings ? <SettingsWindow /> : <MainWindow />;
}
