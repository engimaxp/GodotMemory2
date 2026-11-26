import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Bubble } from '../components/Bubble';
import { I18nProvider } from '../i18n';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

function pointer(target: Element, type: string, screenX = 0) {
  const event = new MouseEvent(type, { bubbles: true, screenX });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' },
    isPrimary: { value: true },
  });
  fireEvent(target, event);
}

function renderDockedBubble() {
  const onActivate = vi.fn();
  const renderBubble = (tucked: boolean, revision: number) => (
    <I18nProvider language="zh_CN">
      <Bubble dock={{ edge: 'Left', tucked, revision }} onActivate={onActivate} />
    </I18nProvider>
  );
  const { rerender } = render(renderBubble(true, 1));
  const button = screen.getByRole('button');
  const zone = button.closest<HTMLElement>('.bubble-zone')!;
  zone.setPointerCapture = vi.fn();
  return { button, zone, onActivate, update: (tucked: boolean, revision: number) => {
    rerender(renderBubble(tucked, revision));
  } };
}

describe('Bubble at a screen edge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('captures a drag starting at coordinate zero and snaps on release', () => {
    const { button, zone, onActivate } = renderDockedBubble();
    pointer(button, 'pointerdown');
    pointer(zone, 'pointermove', 12);
    pointer(zone, 'pointerup', 12);
    pointer(zone, 'lostpointercapture', 12);
    expect(zone.setPointerCapture).toHaveBeenCalledWith(1);
    expect(invoke).toHaveBeenNthCalledWith(1, 'begin_bubble_drag', { grabX: 0, grabY: 0 });
    expect(invoke).toHaveBeenNthCalledWith(2, 'end_bubble_drag', { moved: true });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('reveals on hover and keeps an ordinary click available', () => {
    const { button, zone, onActivate } = renderDockedBubble();
    expect(zone.dataset.dockEdge).toBe('Left');
    expect(zone.dataset.tucked).toBe('true');
    pointer(zone, 'pointerover');
    pointer(zone, 'pointerout');
    pointer(button, 'pointerdown');
    pointer(zone, 'pointerup');
    expect(invoke).toHaveBeenCalledWith('set_bubble_hover', { hovered: true });
    expect(invoke).toHaveBeenCalledWith('set_bubble_hover', { hovered: false });
    expect(invoke).toHaveBeenCalledWith('end_bubble_drag', { moved: false });
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it('waits for the slide before resizing and cancels an interrupted collapse', () => {
    vi.useFakeTimers();
    const { zone, update } = renderDockedBubble();
    act(() => vi.advanceTimersByTime(150));
    update(false, 2);
    act(() => vi.advanceTimersByTime(400));
    expect(zone.dataset.dockEdge).toBe('Left');
    expect(zone.dataset.tucked).toBeUndefined();
    expect(invoke).not.toHaveBeenCalled();

    update(true, 3);
    act(() => vi.advanceTimersByTime(209));
    expect(invoke).not.toHaveBeenCalled();
    const event = new Event('transitionend', { bubbles: true });
    Object.defineProperty(event, 'propertyName', { value: 'translate' });
    fireEvent(zone.querySelector('.bubble-slide')!, event);
    act(() => vi.advanceTimersByTime(400));
    expect(invoke).toHaveBeenCalledExactlyOnceWith('finish_bubble_tuck', { revision: 3 });
  });
});
