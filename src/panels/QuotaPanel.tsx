import React from 'react';
import type {
  BubbleDisplayMode,
  ProviderQuota,
  QuotaModelGroup,
  QuotaNotice,
  QuotaSnapshot,
  QuotaWindow,
  Settings,
} from '../types';
import { useI18n } from '../i18n';
import { IslandIcon } from '../components/island-icons';
import {
  formatLocalDateTime,
  formatLocalTime,
  formatResetCountdownDetailed,
  getQuotaLevel,
} from '../utils/quotaFormat';
import '../styles/quota.css';

interface QuotaPanelProps {
  snapshot: QuotaSnapshot | null;
  loading: boolean;
  notice: QuotaNotice | null;
  settings: Settings | null;
  onRefresh: () => void;
  onUpdateSettings: (partial: Partial<Settings>) => Promise<void> | void;
}

const BUBBLE_MODES: { value: BubbleDisplayMode; labelKey: string }[] = [
  { value: 'both', labelKey: 'quota.mode.both' },
  { value: 'codex', labelKey: 'quota.mode.codex' },
  { value: 'antigravity', labelKey: 'quota.mode.antigravity' },
  { value: 'icon', labelKey: 'quota.mode.icon' },
];

const CodexGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 8L4 12L8 16" />
    <path d="M16 8L20 12L16 16" />
    <path d="M13.5 5.5L10.5 18.5" />
  </svg>
);

const AntigravityGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3C12 8.2 15.8 12 21 12C15.8 12 12 15.8 12 21C12 15.8 8.2 12 3 12C8.2 12 12 8.2 12 3Z" />
  </svg>
);

const QuotaWindowRow: React.FC<{
  title: string;
  window: QuotaWindow | null;
  lang: string;
}> = ({ title, window, lang }) => {
  const { t } = useI18n();
  if (!window) {
    return (
      <div className="quota-window-row quota-window-row--empty">
        <div className="quota-window-top">
          <span className="quota-window-label">{title}</span>
          <span className="quota-window-pct quota-level--depleted">--</span>
        </div>
        <div className="quota-bar-track">
          <div className="quota-bar-fill quota-bar-fill--depleted" style={{ width: '0%' }} />
        </div>
        <div className="quota-window-meta">{t('quota.no_data')}</div>
      </div>
    );
  }

  const pct = Math.round(window.remaining_percent);
  const level = getQuotaLevel(window.remaining_percent);
  const countdown = formatResetCountdownDetailed(window.reset_at, lang);
  const localReset = formatLocalDateTime(window.reset_at);

  return (
    <div className="quota-window-row">
      <div className="quota-window-top">
        <span className="quota-window-label">{title}</span>
        <span className={`quota-window-pct quota-level--${level}`}>{pct}%</span>
      </div>
      <div className="quota-bar-track">
        <div
          className={`quota-bar-fill quota-bar-fill--${level}`}
          style={{ width: `${Math.max(0, Math.min(100, window.remaining_percent))}%` }}
        />
      </div>
      <div className="quota-window-meta">
        {countdown ? (
          <>
            <span>{t('quota.reset_in', { countdown })}</span>
            {localReset && <span className="quota-window-meta-sep">·</span>}
            {localReset && <span>{t('quota.reset_at', { time: localReset })}</span>}
          </>
        ) : pct >= 100 ? (
          <span>{t('quota.full_unused')}</span>
        ) : (
          <span>{window.description || '--'}</span>
        )}
      </div>
    </div>
  );
};

const ProviderCard: React.FC<{
  kind: 'codex' | 'antigravity';
  title: string;
  data: ProviderQuota | null;
  loading: boolean;
  lang: string;
}> = ({ kind, title, data, loading, lang }) => {
  const { t } = useI18n();

  const statusText = loading && !data
    ? t('quota.status_loading')
    : !data
      ? t('quota.status_idle')
      : data.status === 'ok'
        ? t('quota.status_ok')
        : t('quota.status_error');

  const statusTone = loading && !data
    ? 'loading'
    : !data
      ? 'idle'
      : data.status === 'ok'
        ? 'ok'
        : 'error';

  const expiryText = data?.plan_expires_at
    ? formatLocalDateTime(data.plan_expires_at) || data.plan_expires_at
    : t('quota.plan_expiry_unavailable');

  const groups: QuotaModelGroup[] = data?.groups?.length
    ? data.groups
    : data && (data.five_hour || data.weekly)
      ? [{ name: title, description: null, five_hour: data.five_hour, weekly: data.weekly, extra_windows: [] }]
      : [];

  return (
    <section className={`quota-card quota-card--${kind}`}>
      <div className="quota-card-header">
        <div className="quota-card-title-wrap">
          <span className={`quota-provider-badge quota-provider-badge--${kind}`}>
            {kind === 'codex' ? <CodexGlyph /> : <AntigravityGlyph />}
          </span>
          <div className="quota-card-headings">
            <div className="quota-card-title-line">
              <h3 className="quota-card-title">{title}</h3>
              {data?.plan_type && <span className="quota-plan-chip">{data.plan_type}</span>}
            </div>
            {data?.account_email && (
              <span className="quota-account-email" title={data.account_email}>
                {data.account_email}
              </span>
            )}
          </div>
        </div>
        <span className={`quota-status-pill quota-status-pill--${statusTone}`}>
          {statusText}
        </span>
      </div>

      <div className="quota-meta-grid">
        <div className="quota-meta-item">
          <span className="quota-meta-label">{t('quota.plan_expiry')}</span>
          <span className="quota-meta-value">{expiryText}</span>
        </div>
        <div className="quota-meta-item">
          <span className="quota-meta-label">{t('quota.credits')}</span>
          <span className="quota-meta-value">
            {data?.credits_unlimited ? 'Unlimited' : (data?.credits_balance ?? '--')}
          </span>
        </div>
      </div>

      {data?.status === 'error' ? (
        <div className="quota-error-box" role="alert">
          {data.error || t('quota.status_error')}
        </div>
      ) : groups.length > 0 ? (
        <div className="quota-groups">
          {groups.map((group) => (
            <div key={group.name} className="quota-group">
              {groups.length > 1 && (
                <div className="quota-group-header">
                  <span className="quota-group-name">{group.name}</span>
                  {group.description && (
                    <span className="quota-group-desc" title={group.description}>
                      {group.description}
                    </span>
                  )}
                </div>
              )}
              <div className="quota-windows-grid">
                <QuotaWindowRow title={t('quota.five_hour')} window={group.five_hour} lang={lang} />
                <QuotaWindowRow title={t('quota.weekly')} window={group.weekly} lang={lang} />
                {group.extra_windows.map((extra) => (
                  <QuotaWindowRow key={extra.id} title={extra.label} window={extra} lang={lang} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="quota-empty-hint">
          {loading ? t('quota.refreshing') : t('quota.no_data')}
        </div>
      )}
    </section>
  );
};

const QuotaPanel: React.FC<QuotaPanelProps> = ({
  snapshot,
  loading,
  notice,
  settings,
  onRefresh,
  onUpdateSettings,
}) => {
  const { t, language } = useI18n();
  const mode: BubbleDisplayMode = settings?.bubble_display_mode || 'both';
  const updatedTime = snapshot?.fetched_at ? formatLocalTime(snapshot.fetched_at) : '';

  return (
    <div className="panel-container quota-panel">
      <div className="quota-toolbar">
        <div className="quota-toolbar-info">
          <span className="quota-updated-label">
            {updatedTime ? t('quota.last_updated', { time: updatedTime }) : t('quota.never_updated')}
          </span>
          <span className="quota-manual-hint">{t('quota.manual_only_hint')}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary quota-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
        >
          <span className={`quota-refresh-icon ${loading ? 'quota-refresh-icon--spin' : ''}`}>
            <IslandIcon name="Refresh" size={16} />
          </span>
          <span>{loading ? t('quota.refreshing') : t('quota.refresh')}</span>
        </button>
      </div>

      {notice && (
        <div className={`quota-notice quota-notice--${notice.tone}`} role="status">
          {notice.message}
        </div>
      )}

      <div className="quota-mode-card">
        <div className="quota-mode-header">
          <span className="quota-mode-title">{t('quota.bubble_mode')}</span>
          <span className="quota-mode-desc">{t('quota.bubble_mode_desc')}</span>
        </div>
        <div className="quota-mode-group" role="radiogroup" aria-label={t('quota.bubble_mode')}>
          {BUBBLE_MODES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={mode === opt.value}
              className={`quota-mode-btn ${mode === opt.value ? 'active' : ''}`}
              onClick={() => void onUpdateSettings({ bubble_display_mode: opt.value })}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="quota-cards-list">
        <ProviderCard
          kind="codex"
          title="Codex CLI"
          data={snapshot?.codex ?? null}
          loading={loading}
          lang={language}
        />
        <ProviderCard
          kind="antigravity"
          title="Antigravity CLI"
          data={snapshot?.antigravity ?? null}
          loading={loading}
          lang={language}
        />
      </div>
    </div>
  );
};

export default QuotaPanel;
