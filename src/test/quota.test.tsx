import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Bubble } from '../components/Bubble';
import QuotaPanel from '../panels/QuotaPanel';
import { I18nProvider } from '../i18n';
import type { BubbleDisplayMode, QuotaSnapshot, Settings } from '../types';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const sampleSnapshot: QuotaSnapshot = {
  fetched_at: Date.parse('2026-11-26T03:20:00Z'),
  codex: {
    provider: 'codex',
    status: 'ok',
    error: null,
    account_email: 'dev@example.com',
    plan_type: 'Plus',
    plan_expires_at: '2026-12-31T00:00:00Z',
    credits_balance: '0',
    credits_unlimited: false,
    five_hour: {
      id: 'primary',
      label: '5h',
      window_kind: '5h',
      remaining_percent: 88,
      reset_at: '2026-11-26T08:00:00Z',
      reset_at_epoch: 1795680000,
      description: null,
    },
    weekly: {
      id: 'secondary',
      label: 'weekly',
      window_kind: 'weekly',
      remaining_percent: 25,
      reset_at: '2026-12-01T00:00:00Z',
      reset_at_epoch: 1796083200,
      description: null,
    },
    groups: [
      {
        name: 'Codex',
        description: null,
        five_hour: {
          id: 'primary',
          label: '5h',
          window_kind: '5h',
          remaining_percent: 88,
          reset_at: '2026-11-26T08:00:00Z',
          reset_at_epoch: 1795680000,
          description: null,
        },
        weekly: {
          id: 'secondary',
          label: 'weekly',
          window_kind: 'weekly',
          remaining_percent: 25,
          reset_at: '2026-12-01T00:00:00Z',
          reset_at_epoch: 1796083200,
          description: null,
        },
        extra_windows: [],
      },
    ],
  },
  antigravity: {
    provider: 'antigravity',
    status: 'ok',
    error: null,
    account_email: null,
    plan_type: 'Antigravity',
    plan_expires_at: null,
    credits_balance: '12',
    credits_unlimited: false,
    five_hour: {
      id: 'gemini-5h',
      label: 'Five Hour Limit Remaining',
      window_kind: '5h',
      remaining_percent: 30,
      reset_at: '2026-11-26T04:19:50Z',
      reset_at_epoch: 1795666790,
      description: null,
    },
    weekly: {
      id: 'gemini-weekly',
      label: 'Weekly Limit Remaining',
      window_kind: 'weekly',
      remaining_percent: 79,
      reset_at: '2026-12-02T11:45:05Z',
      reset_at_epoch: 1796211905,
      description: null,
    },
    groups: [
      {
        name: 'Gemini Models',
        description: 'Gemini 4 Neon, Flash',
        five_hour: {
          id: 'gemini-5h',
          label: 'Five Hour Limit Remaining',
          window_kind: '5h',
          remaining_percent: 30,
          reset_at: '2026-11-26T04:19:50Z',
          reset_at_epoch: 1795666790,
          description: null,
        },
        weekly: {
          id: 'gemini-weekly',
          label: 'Weekly Limit Remaining',
          window_kind: 'weekly',
          remaining_percent: 79,
          reset_at: '2026-12-02T11:45:05Z',
          reset_at_epoch: 1796211905,
          description: null,
        },
        extra_windows: [],
      },
    ],
  },
};

const baseSettings: Settings = {
  language: 'zh_CN',
  default_panel: 'Engine',
  screen_shot_dir: '',
  bubble_opacity: 0.85,
  bubble_size: 110,
  bubble_display_mode: 'both',
  snap_threshold: 30,
  remember_position: false,
  auto_start: false,
  last_snap_edge: 'None',
  diary_sidebar_collapsed: false,
  diary_selected_id: '',
  diary_selected_date: '',
  diary_cursor_pos: 0,
};

describe('Bubble quota capsule modes', () => {
  const renderWithMode = (displayMode: BubbleDisplayMode) =>
    render(
      <I18nProvider language="zh_CN">
        <Bubble
          dock={{ edge: 'None', tucked: false, revision: 0 }}
          onActivate={vi.fn()}
          displayMode={displayMode}
          quota={sampleSnapshot}
        />
      </I18nProvider>,
    );

  it('renders both Codex and Antigravity capsules with weekly mini bar in both mode', () => {
    renderWithMode('both');
    expect(screen.getByText('CODEX')).toBeInTheDocument();
    expect(screen.getByText('AGY')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('CDX W')).toBeInTheDocument();
    expect(screen.getByText('AGY W')).toBeInTheDocument();
  });

  it('renders only Codex in codex mode', () => {
    renderWithMode('codex');
    expect(screen.getByText('CODEX')).toBeInTheDocument();
    expect(screen.queryByText('AGY')).not.toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('WEEK')).toBeInTheDocument();
  });

  it('renders only Antigravity in antigravity mode', () => {
    renderWithMode('antigravity');
    expect(screen.getByText('AGY')).toBeInTheDocument();
    expect(screen.queryByText('CODEX')).not.toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('GEM W')).toBeInTheDocument();
  });

  it('renders classic icon bubble with /icon.svg in icon mode', () => {
    const { container } = renderWithMode('icon');
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/icon.svg');
    expect(screen.queryByText('CODEX')).not.toBeInTheDocument();
  });
});

describe('QuotaPanel', () => {
  it('displays 5h/weekly quotas, plan expiry, switches modes, and refreshes on click', () => {
    const onRefresh = vi.fn();
    const onUpdateSettings = vi.fn();

    render(
      <I18nProvider language="zh_CN">
        <QuotaPanel
          snapshot={sampleSnapshot}
          loading={false}
          notice={{ id: 1, tone: 'success', message: '用量刷新成功（Codex & Antigravity）' }}
          settings={baseSettings}
          onRefresh={onRefresh}
          onUpdateSettings={onUpdateSettings}
        />
      </I18nProvider>,
    );

    expect(screen.getByText('Codex CLI')).toBeInTheDocument();
    expect(screen.getByText('Antigravity CLI')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('79%')).toBeInTheDocument();
    expect(screen.getByText('CLI 未返回到期日')).toBeInTheDocument();
    expect(screen.getByText('用量刷新成功（Codex & Antigravity）')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '仅 Codex' }));
    expect(onUpdateSettings).toHaveBeenCalledWith({ bubble_display_mode: 'codex' });

    fireEvent.click(screen.getByRole('radio', { name: '老版图标' }));
    expect(onUpdateSettings).toHaveBeenCalledWith({ bubble_display_mode: 'icon' });

    fireEvent.click(screen.getByRole('button', { name: '刷新用量' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('surfaces provider query errors clearly', () => {
    const errored: QuotaSnapshot = {
      ...sampleSnapshot,
      antigravity: {
        ...sampleSnapshot.antigravity,
        status: 'error',
        error: 'Antigravity CLI 未登录',
        five_hour: null,
        weekly: null,
        groups: [],
      },
    };

    render(
      <I18nProvider language="zh_CN">
        <QuotaPanel
          snapshot={errored}
          loading={false}
          notice={{ id: 2, tone: 'warning', message: '部分用量查询失败：Antigravity: Antigravity CLI 未登录' }}
          settings={baseSettings}
          onRefresh={vi.fn()}
          onUpdateSettings={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Antigravity CLI 未登录');
  });
});
