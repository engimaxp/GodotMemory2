import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { Bubble } from './components/Bubble';
import { I18nProvider, useI18n, type Language } from './i18n';
import * as bridge from './bridge';
import type {
  BubbleDisplayMode,
  BubbleDock,
  PanelName,
  QuotaNotice,
  QuotaSnapshot,
  Settings,
  WindowMode,
} from './types';

const MainPanel = lazy(() => import('./components/MainPanel'));

interface MainWindowBodyProps {
  settings: Settings | null;
  onUpdateSettings: (partial: Partial<Settings>) => Promise<void>;
}

function MainWindowBody({ settings, onUpdateSettings }: MainWindowBodyProps) {
  const { t } = useI18n();
  const [windowMode, setWindowMode] = useState<WindowMode>('ball');
  const [activePanel, setActivePanel] = useState<PanelName>(
    (settings?.default_panel as PanelName) || 'Engine',
  );
  const [dock, setDock] = useState<BubbleDock>({ edge: 'None', tucked: false, revision: 0 });
  const [quota, setQuota] = useState<QuotaSnapshot | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaNotice, setQuotaNotice] = useState<QuotaNotice | null>(null);

  const startupFetched = useRef(false);
  const refreshingRef = useRef(false);
  const noticeSeq = useRef(0);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (settings?.default_panel) {
      setActivePanel(settings.default_panel as PanelName);
    }
  }, [settings?.default_panel]);

  const emitNotice = useCallback((tone: QuotaNotice['tone'], message: string) => {
    noticeSeq.current += 1;
    setQuotaNotice({ id: noticeSeq.current, tone, message });
  }, []);

  const refreshQuota = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setQuotaLoading(true);
    try {
      const snap = await bridge.refreshQuota();
      setQuota(snap);

      const codexOk = snap.codex.status === 'ok';
      const agyOk = snap.antigravity.status === 'ok';

      if (codexOk && agyOk) {
        emitNotice('success', tRef.current('quota.toast_success'));
      } else if (codexOk || agyOk) {
        const failed = !codexOk
          ? `Codex: ${snap.codex.error || 'Error'}`
          : `Antigravity: ${snap.antigravity.error || 'Error'}`;
        emitNotice('warning', tRef.current('quota.toast_partial', { detail: failed }));
      } else {
        const detail = [
          snap.codex.error ? `Codex: ${snap.codex.error}` : null,
          snap.antigravity.error ? `Antigravity: ${snap.antigravity.error}` : null,
        ]
          .filter(Boolean)
          .join(' | ');
        emitNotice('error', tRef.current('quota.toast_error', { detail: detail || 'Unknown error' }));
      }
    } catch (error) {
      emitNotice('error', tRef.current('quota.toast_error', { detail: String(error) }));
    } finally {
      refreshingRef.current = false;
      setQuotaLoading(false);
    }
  }, [emitNotice]);

  // Initial dock sync + one-time startup quota query (no polling).
  useEffect(() => {
    if (startupFetched.current) return;
    startupFetched.current = true;

    void bridge.getBubbleDock().then(currentDock => {
      if (currentDock) setDock(currentDock);
    }).catch(() => {});

    void refreshQuota();
  }, [refreshQuota]);

  // Keep rendering in sync with the native window's size, position, and tray refresh trigger.
  useEffect(() => {
    const listeners = [
      listen<WindowMode>('window:mode', (event) => setWindowMode(event.payload)),
      listen<BubbleDock>('bubble:dock', (event) => setDock(event.payload)),
      listen<QuotaSnapshot>('quota:updated', (event) => setQuota(event.payload)),
      listen('quota:request-refresh', () => { void refreshQuota(); }),
    ];
    return () => { for (const listener of listeners) void listener.then(fn => fn()); };
  }, [refreshQuota]);

  // Listen for panel switch events from child panels
  useEffect(() => {
    const handler = (e: Event) => {
      const panel = (e as CustomEvent).detail as PanelName;
      if (panel) setActivePanel(panel);
    };
    window.addEventListener('switch-panel', handler);
    return () => window.removeEventListener('switch-panel', handler);
  }, []);

  const switchMode = useCallback(async (mode: WindowMode) => {
    try {
      await bridge.setWindowMode(mode);
      setWindowMode(mode);
    } catch (error) {
      console.error('Window mode change failed', error);
    }
  }, []);

  const displayMode: BubbleDisplayMode = settings?.bubble_display_mode || 'both';

  return (
    <div className="app-container">
      {windowMode === 'ball' && (
        <Bubble
          dock={dock}
          onActivate={() => { void switchMode('panel'); }}
          opacity={settings?.bubble_opacity ?? 0.85}
          size={settings?.bubble_size ?? 110}
          displayMode={displayMode}
          quota={quota}
          quotaLoading={quotaLoading}
          quotaNotice={quotaNotice}
        />
      )}

      {windowMode === 'panel' && (
        <Suspense fallback={null}>
          <MainPanel
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            snappedEdge={dock.edge}
            onClose={() => { void switchMode('ball'); }}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            quota={quota}
            quotaLoading={quotaLoading}
            quotaNotice={quotaNotice}
            onRefreshQuota={() => { void refreshQuota(); }}
          />
        </Suspense>
      )}
    </div>
  );
}

// Main application window component
function MainWindow() {
  const [settings, setSettings] = useState<Settings | null>(null);
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

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (!document.documentElement.dataset.themeExplicit) {
          document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setInitialized(true);
      }
    };
    void load();
  }, []);

  // Follow the OS colour scheme (island palette has a dimmed parchment night mode)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const explicit = document.documentElement.dataset.themeExplicit;
      if (explicit) return;
      document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
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

  if (!initialized) return null;

  const lang = (settings?.language || 'zh_CN') as Language;

  return (
    <I18nProvider language={lang}>
      <MainWindowBody settings={settings} onUpdateSettings={updateSettings} />
    </I18nProvider>
  );
}

// Settings window component (opened separately)
function SettingsWindow() {
  return (
    <div className="w-full h-full p-4 text-sm" style={{ color: 'var(--animal-text-muted)' }}>
      <p>Settings are shown in the main panel under Setting tab.</p>
    </div>
  );
}

export default function App() {
  let label = 'main';
  try { label = getCurrentWindow().label; } catch { /* Browser preview. */ }
  return label === 'settings' ? <SettingsWindow /> : <MainWindow />;
}
