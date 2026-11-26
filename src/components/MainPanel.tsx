import { lazy, Suspense, useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import type { PanelName, QuotaNotice, QuotaSnapshot, Settings, SnapEdge } from '../types';
import { PopupPanel } from './PopupPanel';
import { TextFonts } from './TextFonts';
import { ToastProvider, useToast } from './Toast';
import '../styles/panels.css';
import '../styles/settings.css';

const panels = {
  Engine: lazy(() => import('../panels/EnginePanel')),
  Proj: lazy(() => import('../panels/ProjPanel')),
  Asset: lazy(() => import('../panels/AssetPanel')),
  Tool: lazy(() => import('../panels/ToolPanel')),
  Diary: lazy(() => import('../panels/DiaryPanel')),
  Notes: lazy(() => import('../panels/NotesPanel')),
};
const QuotaPanel = lazy(() => import('../panels/QuotaPanel'));
const SettingPanel = lazy(() => import('../panels/SettingPanel'));

interface MainPanelProps {
  activePanel: PanelName;
  snappedEdge: SnapEdge;
  settings: Settings | null;
  quota: QuotaSnapshot | null;
  quotaLoading: boolean;
  quotaNotice: QuotaNotice | null;
  onRefreshQuota: () => void;
  onPanelChange: (panel: PanelName) => void;
  onClose: () => void;
  onUpdateSettings: (partial: Partial<Settings>) => Promise<void>;
}

function QuotaToastBridge({ notice }: { notice: QuotaNotice | null }) {
  const { showToast } = useToast();
  const shownId = useRef<number>(0);

  useEffect(() => {
    if (!notice || notice.id === shownId.current) return;
    shownId.current = notice.id;
    showToast(notice.message, notice.tone);
  }, [notice, showToast]);

  return null;
}

export default function MainPanel({
  settings,
  quota,
  quotaLoading,
  quotaNotice,
  onRefreshQuota,
  onUpdateSettings,
  ...popup
}: MainPanelProps) {
  const { t } = useI18n();
  const isQuota = popup.activePanel === 'Quota';
  const isSetting = popup.activePanel === 'Setting';
  const Panel = !isQuota && !isSetting ? panels[popup.activePanel as keyof typeof panels] : null;

  return (
    <ToastProvider>
      <QuotaToastBridge notice={quotaNotice} />
      <TextFonts />
      <PopupPanel visible {...popup}>
        <Suspense fallback={<p>{t('common.loading')}</p>}>
          {isQuota ? (
            <QuotaPanel
              snapshot={quota}
              loading={quotaLoading}
              notice={quotaNotice}
              settings={settings}
              onRefresh={onRefreshQuota}
              onUpdateSettings={onUpdateSettings}
            />
          ) : isSetting ? (
            <SettingPanel settings={settings} onUpdateSettings={onUpdateSettings} />
          ) : (
            Panel && <Panel />
          )}
        </Suspense>
      </PopupPanel>
    </ToastProvider>
  );
}
