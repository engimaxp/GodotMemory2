import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { IslandIcon } from './island-icons';
import '../styles/Bubble.css';

interface BubbleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  opacity?: number;
  size?: number;
}

export const Bubble: React.FC<BubbleProps> = ({
  onMouseDown, onMouseMove, onMouseUp,
  opacity = 0.85, size = 110,
}) => {
  const [showFallback, setShowFallback] = useState(false);
  const { t } = useI18n();

  return (
    <div
      className="bubble"
      style={{ width: size, height: size, opacity }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      title={t("bubble.click_hint")}
    >
      <div className="bubble-ring" />
      <div className="bubble-icon">
        {showFallback ? (
          <IslandIcon name="Cat" size={size * 0.62} />
        ) : (
          <img
            src="/icon.png"
            alt=""
            style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }}
            onError={() => setShowFallback(true)}
          />
        )}
      </div>
    </div>
  );
};

export default Bubble;
