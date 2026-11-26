import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ScreenshotView from '../components/ScreenshotView';
import { dbLoadImage } from '../bridge';

vi.mock('../bridge', () => ({ dbLoadImage: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

it('loads visible screenshots and releases their previews when scrolled away', async () => {
  let notify!: IntersectionObserverCallback;
  const disconnect = vi.fn();
  class Observer {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe = vi.fn();
    disconnect = disconnect;
  }
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.mocked(dbLoadImage).mockResolvedValue('data:image/png;base64,YQ==');
  const records = ['first', 'second'].map(id => ({ id, path: '', new_path: '', width: 0, height: 0 }));
  const { container, unmount } = render(<ScreenshotView images={records} />);
  const [first, second] = container.querySelectorAll('.screenshot-thumb');
  const entry = (target: Element, isIntersecting: boolean) => ({ target, isIntersecting }) as IntersectionObserverEntry;
  const observer = {} as IntersectionObserver;

  expect(dbLoadImage).not.toHaveBeenCalled();
  act(() => notify([entry(first, true), entry(second, false)], observer));
  await waitFor(() => expect(first.querySelector('img')).not.toBeNull());
  expect(dbLoadImage).toHaveBeenCalledTimes(1);
  const image = first.querySelector('img')!;
  Object.defineProperties(image, { naturalWidth: { value: 80 }, naturalHeight: { value: 50 } });
  fireEvent.mouseEnter(image);
  expect(document.querySelector('.screenshot-zoom')).not.toBeNull();

  act(() => notify([entry(first, false), entry(second, true)], observer));
  await waitFor(() => expect(second.querySelector('img')).not.toBeNull());
  expect(first.querySelector('img')).toBeNull();
  expect(document.querySelector('.screenshot-zoom')).toBeNull();
  expect(dbLoadImage).toHaveBeenLastCalledWith('second');
  unmount();
  expect(disconnect).toHaveBeenCalled();
});
