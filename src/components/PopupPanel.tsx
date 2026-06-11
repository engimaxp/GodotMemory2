import React from 'react';
import { PanelName, SnapEdge } from '../types';
import '../styles/PopupPanel.css';
import { useI18n } from '../i18n';

interface PopupPanelProps {
  visible: boolean;
  onClose: () => void;
  snappedEdge: SnapEdge;
  activePanel: PanelName;
  onPanelChange: (panel: PanelName) => void;
  children: React.ReactNode;
}

const panelIcons: Record<PanelName, { icon: string; label: string }> = {
  Engine: { icon: 'gamepad', label: 'Engine' },
  Proj: { icon: 'boxes', label: 'Proj' },
  Asset: { icon: 'paint-brush', label: 'Asset' },
  Tool: { icon: 'server', label: 'Tool' },
  Diary: { icon: 'bookshelf', label: 'Diary' },
  Setting: { icon: 'cog', label: 'Setting' },
};

function getSnapClass(edge: string): string {
  switch (edge) {
    case 'Right': return 'popup--snap-right';
    case 'Left': return 'popup--snap-left';
    case 'Bottom': return 'popup--snap-bottom';
    case 'Top': return 'popup--snap-top';
    default: return 'popup--snap-right';
  }
}

export const PopupPanel: React.FC<PopupPanelProps> = ({
  visible, onClose, snappedEdge, activePanel, onPanelChange, children
}) => {
  const { t } = useI18n();
  return (
    <div className={`popup ${visible ? 'popup--visible' : ''} ${getSnapClass(snappedEdge)}`}>
      <div className="popup-sidebar">
        <div className="sidebar-icons">
          {(Object.entries(panelIcons) as [PanelName, { icon: string; label: string }][]).map(([name, info]) => (
            <button
              key={name}
              className={`sidebar-btn ${activePanel === name ? 'active' : ''}`}
              onClick={() => onPanelChange(name)}
              title={t(info.label)}
              data-no-drag="true"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {name === 'Engine' && <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>}
                {name === 'Proj' && <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>}
                {name === 'Asset' && <><circle cx="13.5" cy="6.5" r="2.5" /><path d="M3 17l4-8 4 8" /><path d="M11 17l2-4 2 4" /><path d="M17 17l2-6 2 6" /><path d="M3 21h18" /></>}
                {name === 'Tool' && <><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></>}
                {name === 'Diary' && <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" /></>}
                {name === 'Setting' && <><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>}
              </svg>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-btn close-btn" onClick={onClose} title="收起" data-no-drag="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="popup-content" data-tauri-drag-region>
        <div className="popup-header" data-tauri-drag-region>
          <h2 className="popup-title">{t(panelIcons[activePanel].label)}</h2>
        </div>
        <div className="popup-body" data-no-drag="true">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PopupPanel;
