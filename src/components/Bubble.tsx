import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import * as bridge from '../bridge';
import type { BubbleDisplayMode, BubbleDock, ProviderQuota, QuotaNotice, QuotaSnapshot } from '../types';
import {
  formatResetCountdownShort,
  getQuotaLevel,
  getResetUrgencyTone,
} from '../utils/quotaFormat';
import { IslandIcon } from './island-icons';
import '../styles/Bubble.css';

interface BubbleProps {
  dock: BubbleDock;
  onActivate: () => void;
  opacity?: number;
  size?: number;
  displayMode?: BubbleDisplayMode;
  quota?: QuotaSnapshot | null;
  quotaLoading?: boolean;
  quotaNotice?: QuotaNotice | null;
}

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  frame: number | null;
}

interface CapsuleSlot {
  key: string;
  label: string;
  color: 'blue' | 'orange';
  icon: 'codex' | 'antigravity';
  percentage: number | null;
  resetAt?: string | null;
  isError: boolean;
  isLoading: boolean;
}

interface MiniBarItem {
  key: string;
  alias: string;
  percentage: number;
}

const BUBBLE_PADDING = 28;

function logGestureError(error: unknown) {
  console.error('Bubble interaction failed', error);
}

const CodexMiniIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 8L4 12L8 16" />
    <path d="M16 8L20 12L16 16" />
    <path d="M13.5 5.5L10.5 18.5" />
  </svg>
);

const AntigravityMiniIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3C12 8.2 15.8 12 21 12C15.8 12 12 15.8 12 21C12 15.8 8.2 12 3 12C8.2 12 12 8.2 12 3Z" />
  </svg>
);

const WaterTank: React.FC<{ percentage: number; color: 'blue' | 'orange' }> = ({ percentage, color }) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const isEmpty = clamped <= 0;
  let topValue = 100 - clamped;
  if (clamped > 92) {
    topValue -= 14;
  } else if (clamped < 8 && !isEmpty) {
    topValue += 6;
  }

  if (isEmpty) {
    return <div className={`water-tank water-tank--${color} water-tank--still`} />;
  }

  return (
    <div className={`water-tank water-tank--${color}`}>
      <div className="wave-group" style={{ top: `${topValue}%` }}>
        <div className="wave-layer wave-back" />
        <div className="wave-layer wave-front" />
      </div>
    </div>
  );
};

function buildSlot(
  key: string,
  label: string,
  color: 'blue' | 'orange',
  icon: 'codex' | 'antigravity',
  provider: ProviderQuota | null | undefined,
  loading: boolean,
): CapsuleSlot {
  if (!provider) {
    return { key, label, color, icon, percentage: null, isError: false, isLoading: loading };
  }
  if (provider.status === 'error') {
    return { key, label, color, icon, percentage: 0, isError: true, isLoading: false };
  }
  const win = provider.five_hour ?? provider.weekly;
  return {
    key,
    label,
    color,
    icon,
    percentage: win ? win.remaining_percent : null,
    resetAt: win?.reset_at ?? null,
    isError: false,
    isLoading: false,
  };
}

function buildMiniItems(mode: BubbleDisplayMode, quota: QuotaSnapshot | null | undefined): MiniBarItem[] {
  if (!quota) return [];
  const items: MiniBarItem[] = [];

  if (mode === 'both') {
    if (quota.codex.status === 'ok' && quota.codex.weekly) {
      items.push({ key: 'codex-w', alias: 'CDX W', percentage: quota.codex.weekly.remaining_percent });
    }
    if (quota.antigravity.status === 'ok' && quota.antigravity.weekly) {
      items.push({ key: 'agy-w', alias: 'AGY W', percentage: quota.antigravity.weekly.remaining_percent });
    }
  } else if (mode === 'codex') {
    if (quota.codex.status === 'ok' && quota.codex.weekly) {
      items.push({ key: 'codex-w', alias: 'WEEK', percentage: quota.codex.weekly.remaining_percent });
    }
  } else if (mode === 'antigravity') {
    if (quota.antigravity.status === 'ok') {
      if (quota.antigravity.weekly) {
        items.push({ key: 'agy-w', alias: 'GEM W', percentage: quota.antigravity.weekly.remaining_percent });
      }
      const secondGroup = quota.antigravity.groups.find(g => !g.name.toLowerCase().includes('gemini'));
      const secondWin = secondGroup?.five_hour ?? secondGroup?.weekly;
      if (secondWin) {
        items.push({ key: 'agy-3p', alias: '3P', percentage: secondWin.remaining_percent });
      }
    }
  }

  return items;
}

export const Bubble: React.FC<BubbleProps> = ({
  dock,
  onActivate,
  opacity = 0.85,
  size = 110,
  displayMode = 'icon',
  quota = null,
  quotaLoading = false,
  quotaNotice = null,
}) => {
  const [iconSrc, setIconSrc] = useState<'/icon.svg' | '/icon.png' | 'fallback'>('/icon.svg');
  const [flashNotice, setFlashNotice] = useState<QuotaNotice | null>(null);
  const lastNoticeId = useRef<number>(0);
  const slide = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const tuckFallback = useRef<number | null>(null);
  const { t } = useI18n();
  const hint = t('bubble.click_hint');

  const diameter = Math.max(64, Math.min(160, size));
  const scale = diameter / 110;
  const isCapsule = displayMode !== 'icon';
  const isDual = displayMode === 'both';

  const baseWidth = isCapsule ? (isDual ? 284 : 176) : diameter;
  const baseHeight = isCapsule ? 112 : diameter;
  const bubbleWidth = isCapsule ? Math.round(baseWidth * scale) : diameter;
  const bubbleHeight = isCapsule ? Math.round(baseHeight * scale) : diameter;
  const windowWidth = bubbleWidth + 2 * BUBBLE_PADDING;
  const windowHeight = bubbleHeight + 2 * BUBBLE_PADDING;

  useEffect(() => {
    if (!quotaNotice || quotaNotice.id === lastNoticeId.current) return;
    lastNoticeId.current = quotaNotice.id;
    setFlashNotice(quotaNotice);
    const timer = window.setTimeout(() => setFlashNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [quotaNotice]);

  useEffect(() => {
    if (!dock.tucked) return;
    const timeout = window.setTimeout(() => {
      tuckFallback.current = null;
      void bridge.finishBubbleTuck(dock.revision).catch(logGestureError);
    }, 350);
    tuckFallback.current = timeout;
    return () => {
      window.clearTimeout(timeout);
      tuckFallback.current = null;
    };
  }, [dock.tucked, dock.revision]);

  function onSlideEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (!dock.tucked || event.target !== event.currentTarget || event.propertyName !== 'translate') return;
    if (tuckFallback.current === null) return;
    window.clearTimeout(tuckFallback.current);
    tuckFallback.current = null;
    void bridge.finishBubbleTuck(dock.revision).catch(logGestureError);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || gesture.current || !slide.current) return;
    const bounds = slide.current.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.screenX,
      startY: event.screenY,
      moved: false,
      frame: null,
    };
    void bridge.beginBubbleDrag(event.clientX - bounds.left, event.clientY - bounds.top).catch(logGestureError);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.screenX - drag.startX, event.screenY - drag.startY) < 4) return;
    drag.moved = true;
    if (drag.frame !== null) return;
    drag.frame = requestAnimationFrame(() => {
      drag.frame = null;
      void bridge.moveBubbleDrag().catch(logGestureError);
    });
  }

  function finishGesture(event: React.PointerEvent<HTMLDivElement>, activate: boolean) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (drag.frame !== null) cancelAnimationFrame(drag.frame);
    void bridge.endBubbleDrag(drag.moved).catch(logGestureError);
    if (activate && !drag.moved) onActivate();
  }

  function setHover(event: React.PointerEvent<HTMLDivElement>, hovered: boolean) {
    if (event.pointerType === 'mouse' && !gesture.current && dock.edge !== 'None') {
      void bridge.setBubbleHover(hovered).catch(logGestureError);
    }
  }

  const slots: CapsuleSlot[] = [];
  if (displayMode === 'both') {
    slots.push(buildSlot('codex', 'CODEX', 'blue', 'codex', quota?.codex, quotaLoading));
    slots.push(buildSlot('antigravity', 'AGY', 'orange', 'antigravity', quota?.antigravity, quotaLoading));
  } else if (displayMode === 'codex') {
    slots.push(buildSlot('codex', 'CODEX', 'blue', 'codex', quota?.codex, quotaLoading));
  } else if (displayMode === 'antigravity') {
    slots.push(buildSlot('antigravity', 'AGY', 'orange', 'antigravity', quota?.antigravity, quotaLoading));
  }

  const miniItems = isCapsule ? buildMiniItems(displayMode, quota) : [];

  const handleIconError = () => {
    setIconSrc(prev => (prev === '/icon.svg' ? '/icon.png' : 'fallback'));
  };

  return (
    <div
      className={`bubble-zone ${isCapsule ? 'bubble-zone--capsule' : 'bubble-zone--icon'}`}
      style={{
        '--bubble-size': `${diameter}px`,
        '--bubble-width': `${bubbleWidth}px`,
        '--bubble-height': `${bubbleHeight}px`,
        '--window-width': `${windowWidth}px`,
        '--window-height': `${windowHeight}px`,
        '--capsule-scale': `${scale}`,
      } as React.CSSProperties}
      data-dock-edge={dock.edge === 'None' ? undefined : dock.edge}
      data-tucked={dock.tucked || undefined}
      data-display-mode={displayMode}
      onPointerEnter={event => setHover(event, true)}
      onPointerLeave={event => setHover(event, false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={event => finishGesture(event, true)}
      onPointerCancel={event => finishGesture(event, false)}
      onLostPointerCapture={event => finishGesture(event, false)}
    >
      <div className="bubble-frame">
        <div className="bubble-slide" ref={slide} onTransitionEnd={onSlideEnd}>
          {!isCapsule ? (
            <button
              type="button"
              className="bubble"
              style={{ opacity }}
              title={hint}
              aria-label={hint}
              onClick={event => { if (event.detail === 0) onActivate(); }}
              onDragStart={event => event.preventDefault()}
            >
              <span className="bubble-ring" />
              <span className="bubble-icon">
                {iconSrc === 'fallback' ? (
                  <IslandIcon name="Cat" size={diameter * 0.62} />
                ) : (
                  <img
                    src={iconSrc}
                    alt=""
                    draggable={false}
                    style={{ width: diameter * 0.62, height: diameter * 0.62, objectFit: 'contain' }}
                    onError={handleIconError}
                  />
                )}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={`capsule-trigger ${isDual ? 'capsule-trigger--dual' : 'capsule-trigger--single'}`}
              style={{ opacity }}
              title={hint}
              aria-label={hint}
              onClick={event => { if (event.detail === 0) onActivate(); }}
              onDragStart={event => event.preventDefault()}
            >
              <div
                className="capsule-scale-wrap"
                style={{
                  width: `${baseWidth}px`,
                  height: `${baseHeight}px`,
                  transform: `scale(${scale})`,
                }}
              >
                <div className={`capsule-outer capsule-outer--${displayMode}`}>
                  <div className="capsule-body">
                    <div className={`capsule-ambient-left ${displayMode === 'antigravity' ? 'capsule-ambient--orange' : 'capsule-ambient--blue'}`} />
                    {isDual && <div className="capsule-ambient-right capsule-ambient--orange" />}

                    <div className="capsule-sections">
                      {slots.map((slot, index) => {
                        const pct = slot.percentage ?? 0;
                        const level = slot.isError
                          ? 'critical'
                          : slot.percentage === null
                            ? 'depleted'
                            : getQuotaLevel(pct);
                        const resetShort = formatResetCountdownShort(slot.resetAt);
                        const resetTone = getResetUrgencyTone(slot.resetAt);
                        const sectionClass = isDual
                          ? index === 0
                            ? 'capsule-section capsule-section--left'
                            : 'capsule-section capsule-section--right'
                          : 'capsule-section capsule-section--solo';

                        return (
                          <div key={slot.key} className={sectionClass}>
                            <WaterTank percentage={slot.isError ? 0 : pct} color={slot.color} />
                            <div className="capsule-content">
                              <div className="capsule-label-row">
                                {slot.icon === 'codex' ? (
                                  <CodexMiniIcon className="capsule-glyph capsule-glyph--blue" />
                                ) : (
                                  <AntigravityMiniIcon className="capsule-glyph capsule-glyph--orange" />
                                )}
                                <span className="capsule-name">{slot.label}</span>
                              </div>
                              <div className={`capsule-value capsule-value--${level}`}>
                                {slot.isLoading
                                  ? '...'
                                  : slot.isError
                                    ? 'ERR'
                                    : slot.percentage === null
                                      ? '--'
                                      : `${Math.round(pct)}%`}
                              </div>
                              {resetShort && !slot.isError && (
                                <span className={`capsule-reset capsule-reset--${resetTone || 'cool'}`}>
                                  ↻ {resetShort}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="capsule-gloss" />
                    <div className="capsule-rim-light" />
                  </div>
                </div>

                <div className="mini-quota-bar">
                  {miniItems.length > 0 ? (
                    miniItems.map((item) => {
                      const level = getQuotaLevel(item.percentage);
                      return (
                        <div key={item.key} className="mini-quota-item">
                          <div className="mini-progress-bar">
                            <div
                              className={`mini-progress-fill mini-progress-fill--${level}`}
                              style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}
                            />
                          </div>
                          <span className="mini-quota-value">{Math.round(item.percentage)}%</span>
                          <span className="mini-quota-alias">{item.alias}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="mini-quota-placeholder">
                      {quotaLoading ? t('quota.bubble_loading') : t('quota.manual_only_hint')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {flashNotice && !dock.tucked && (
            <div className={`bubble-flash bubble-flash--${flashNotice.tone}`} aria-live="polite">
              {flashNotice.tone === 'success'
                ? t('quota.bubble_updated')
                : t('quota.bubble_failed')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bubble;
