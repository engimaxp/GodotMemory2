import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ImageRecord } from '../types';
import * as bridge from '../bridge';

interface ZoomInfo {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ScreenshotViewProps {
  images: ImageRecord[];
}

function Screenshot({ id, onMissing }: { id: string; onMissing: (id: string) => void }) {
  const [zoom, setZoom] = useState<ZoomInfo | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    bridge.dbLoadImage(id).then(value => {
      if (!active) return;
      if (value) setSrc(value);
      else onMissing(id);
    }).catch(() => { if (active) onMissing(id); });
    return () => { active = false; };
  }, [id, onMissing]);

  function showZoom(e: React.MouseEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const maxW = window.innerWidth * 0.85;
    const maxH = window.innerHeight * 0.85;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxW) { h = h * maxW / w; w = maxW; }
    if (h > maxH) { w = w * maxH / h; h = maxH; }
    w = Math.round(w);
    h = Math.round(h);

    let left = e.clientX + 15;
    let top = e.clientY + 15;
    if (left + w > window.innerWidth - 10) left = e.clientX - w - 15;
    if (top + h > window.innerHeight - 10) top = e.clientY - h - 15;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    setZoom({ left, top, width: w, height: h });
  }

  if (!src) return null;
  return (
    <>
      <img src={src} alt="" draggable={false} onMouseEnter={showZoom} onMouseLeave={() => setZoom(null)} />
      {zoom && createPortal(
        <div className="screenshot-zoom" style={{ left: zoom.left, top: zoom.top, width: zoom.width, height: zoom.height }}>
          <img src={src} alt="" draggable={false} />
        </div>, document.body
      )}
    </>
  );
}

const ScreenshotView: React.FC<ScreenshotViewProps> = ({ images }) => {
  const strip = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const hideMissing = useCallback((id: string) => setMissing(current => new Set(current).add(id)), []);
  useEffect(() => {
    setMissing(new Set());
    setVisible(current => new Set(images.map(img => img.id).filter(id => current.has(id))));
    const container = strip.current;
    if (!container) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(new Set(images.map(image => image.id)));
      return;
    }
    let active = true;
    const observer = new IntersectionObserver(entries => {
      if (!active) return;
      setVisible(current => {
        const next = new Set(current);
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.id!;
          if (entry.isIntersecting) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    }, { rootMargin: '80px' });
    for (const thumb of container.children) observer.observe(thumb);
    return () => { active = false; observer.disconnect(); };
  }, [images]);

  if (!images.length) return null;
  return (
    <div ref={strip} className="screenshot-strip" style={images.every(img => missing.has(img.id)) ? { display: 'none' } : undefined}>
      {images.map(img => (
        <div key={img.id} data-id={img.id} className="screenshot-thumb" hidden={missing.has(img.id)}>
          {visible.has(img.id) && !missing.has(img.id) && <Screenshot id={img.id} onMissing={hideMissing} />}
        </div>
      ))}
    </div>
  );
};

export default ScreenshotView;
