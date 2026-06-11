import React, { useState, useEffect, useCallback } from 'react';
import type { ImageRecord } from '../types';
import * as bridge from '../bridge';

interface ManagedImage {
  record: ImageRecord;
  src: string;
}

interface ImageManagerProps {
  initialImages: ImageRecord[];
  onChange: (records: ImageRecord[]) => void;
}

const ImageManager: React.FC<ImageManagerProps> = ({ initialImages, onChange }) => {
  const [images, setImages] = useState<ManagedImage[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const results: ManagedImage[] = [];
      for (const img of initialImages) {
        try {
          const src = await bridge.dbLoadImage(img.id);
          if (src && !cancelled) results.push({ record: img, src });
        } catch {}
      }
      if (!cancelled) setImages(results);
    };
    setImages([]);
    load();
    return () => { cancelled = true; };
  }, [initialImages]);

  const handleAdd = useCallback(async () => {
    setAdding(true);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: true,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp"] }],
      }) as string | string[] | null;
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const newImages: ManagedImage[] = [];
      for (const p of paths) {
        try {
          const record = await bridge.dbCopyImageToCache(p);
          const src = await bridge.dbLoadImage(record.id);
          if (src) newImages.push({ record, src });
        } catch {}
      }
      if (newImages.length > 0) {
        setImages(prev => {
          const updated = [...prev, ...newImages];
          onChange(updated.map(i => i.record));
          return updated;
        });
      }
    } catch (e) { console.error(e); }
    setAdding(false);
  }, [onChange]);

  const handleRemove = useCallback((id: string) => {
    setImages(prev => {
      const updated = prev.filter(i => i.record.id !== id);
      onChange(updated.map(i => i.record));
      return updated;
    });
  }, [onChange]);

  return (
    <div className="image-manager">
      {images.length > 0 && (
        <div className="image-manager-grid">
          {images.map(img => (
            <div key={img.record.id} className="image-manager-item">
              <img src={img.src} alt="" draggable={false} />
              <button className="image-manager-remove" onClick={() => handleRemove(img.record.id)} title="删除">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-secondary btn-small" onClick={handleAdd} disabled={adding}>
        {adding ? "..." : "+ 添加截图"}
      </button>
    </div>
  );
};

export default ImageManager;
