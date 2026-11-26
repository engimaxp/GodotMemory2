export type QuotaLevel = 'normal' | 'warning' | 'critical' | 'depleted';

export function getQuotaLevel(percentage: number, warningThreshold = 50, criticalThreshold = 30): QuotaLevel {
  if (percentage <= 0) return 'depleted';
  if (percentage < criticalThreshold) return 'critical';
  if (percentage < warningThreshold) return 'warning';
  return 'normal';
}

export function formatResetCountdownShort(resetAt?: string | null, nowMs = Date.now()): string {
  if (!resetAt) return '';
  const ts = Date.parse(resetAt);
  if (Number.isNaN(ts)) return '';
  const diffMs = ts - nowMs;
  if (diffMs <= 0) return '';

  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays >= 1) return `${diffDays}D`;
  if (diffHours >= 1) return `${diffHours}H`;
  return `${Math.max(1, diffMins)}m`;
}

export function getResetUrgencyTone(resetAt?: string | null, nowMs = Date.now()): 'cool' | 'warm' | 'urgent' | '' {
  if (!resetAt) return '';
  const ts = Date.parse(resetAt);
  if (Number.isNaN(ts)) return '';
  const diffMs = ts - nowMs;
  if (diffMs <= 0) return '';
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins >= 24 * 60) return 'cool';
  if (diffMins >= 60) return 'warm';
  return 'urgent';
}

export function formatResetCountdownDetailed(resetAt?: string | null, lang = 'zh_CN', nowMs = Date.now()): string {
  if (!resetAt) return '';
  const ts = Date.parse(resetAt);
  if (Number.isNaN(ts)) return '';
  const diffMs = ts - nowMs;
  if (diffMs <= 0) return '';

  const totalMins = Math.max(1, Math.floor(diffMs / 60_000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;

  const isZh = lang.startsWith('zh');
  if (days > 0) {
    return isZh ? `${days}天${hours}小时` : `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return isZh ? `${hours}小时${mins}分` : `${hours}h ${mins}m`;
  }
  return isZh ? `${mins}分钟` : `${mins}m`;
}

export function formatLocalDateTime(isoOrEpoch?: string | number | null): string {
  if (isoOrEpoch === null || isoOrEpoch === undefined || isoOrEpoch === '') return '';
  const date = typeof isoOrEpoch === 'number' ? new Date(isoOrEpoch) : new Date(isoOrEpoch);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function formatLocalTime(epochMs?: number | null): string {
  if (!epochMs) return '';
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
