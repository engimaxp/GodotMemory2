import React from 'react';
import { PanelName, SnapEdge } from '../types';
import '../styles/PopupPanel.css';
import { useI18n } from '../i18n';
import { AnimalIslandDefs } from './AnimalIslandDefs';
import { IslandIcon, type IslandIconName } from './island-icons';

interface PopupPanelProps {
  visible: boolean;
  onClose: () => void;
  snappedEdge: SnapEdge;
  activePanel: PanelName;
  onPanelChange: (panel: PanelName) => void;
  children: React.ReactNode;
}

/** Island artwork per panel — the dock reads like the island home screen. */
const panelIcons: Record<PanelName, { icon: IslandIconName; label: string }> = {
  Engine: { icon: 'Settings', label: 'Engine' },
  Proj: { icon: 'Rocket', label: 'Proj' },
  Asset: { icon: 'Leaf', label: 'Asset' },
  Tool: { icon: 'Fish', label: 'Tool' },
  Diary: { icon: 'Book', label: 'Diary' },
  Setting: { icon: 'Compass', label: 'Setting' },
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
      <AnimalIslandDefs />
      <div className="popup-sidebar">
        <div className="sidebar-icons">
          {(Object.entries(panelIcons) as [PanelName, { icon: IslandIconName; label: string }][]).map(([name, info]) => (
            <button
              key={name}
              className={`sidebar-btn ${activePanel === name ? 'active' : ''}`}
              data-panel={name}
              onClick={() => onPanelChange(name)}
              title={t(info.label)}
              data-no-drag="true"
            >
              <IslandIcon name={info.icon} size={28} />
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-btn close-btn" onClick={onClose} title={t("common.collapse")} data-no-drag="true">
            <IslandIcon name="Close" size={26} />
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
