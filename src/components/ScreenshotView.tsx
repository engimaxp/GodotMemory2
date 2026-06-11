import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageRecord } from '../types';
import * as bridge from '../bridge';

interface LoadedImage {
  id: string;
  src: string;
  naturalW: number;
  naturalH: number;
}

interface ZoomInfo {
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ScreenshotViewProps {
  images: ImageRecord[];
}

const ScreenshotView: React.FC<ScreenshotViewProps> = ({ images }) => {
  const [loadedImages, setLoadedImages] = useState<LoadedImage[]>([]);
  const [zoom, setZoom] = useState<ZoomInfo | null>(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    const id = ++loadIdRef.current;
    let cancelled = false;

    const loadAll = async () => {
      const results: LoadedImage[] = [];
      for (const img of images) {
        if (cancelled) return;
        try {
          const src = await bridge.dbLoadImage(img.id);
          if (!src || cancelled) continue;
          const { w, h } = await new Promise<{ w: number; h: number }>(resolve => {
            const temp = new Image();
            temp.onload = () => resolve({ w: temp.naturalWidth, h: temp.naturalHeight });
            temp.onerror = () => resolve({ w: img.width || 200, h: img.height || 200 });
            temp.src = src;
          });
          if (cancelled) return;
          results.push({ id: img.id, src, naturalW: w, naturalH: h });
        } catch {}
      }
      if (id === loadIdRef.current) setLoadedImages(results);
    };

    setLoadedImages([]);
    setZoom(null);
    loadAll();
    return () => { cancelled = true; };
  }, [images]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, img: LoadedImage) => {
    const maxW = window.innerWidth * 0.85;
    const maxH = window.innerHeight * 0.85;
    let w = img.naturalW;
    let h = img.naturalH;
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

    setZoom({ src: img.src, left, top, width: w, height: h });
  }, []);

  if (!images.length || !loadedImages.length) return null;

  return (
    <>
      <div className="screenshot-strip">
        {loadedImages.map(img => (
          <div
            key={img.id}
            className="screenshot-thumb"
            onMouseEnter={e => handleMouseEnter(e, img)}
            onMouseLeave={() => setZoom(null)}
          >
            <img src={img.src} alt="" draggable={false} />
          </div>
        ))}
      </div>
      {zoom && (
        <div className="screenshot-zoom" style={{ left: zoom.left, top: zoom.top, width: zoom.width, height: zoom.height }}>
          <img src={zoom.src} alt="" draggable={false} />
        </div>
      )}
    </>
  );
};

export default ScreenshotView;
