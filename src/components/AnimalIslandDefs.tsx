import React from 'react';

/**
 * AnimalIslandDefs — hidden SVG definitions for the island visual language.
 *
 * The single definition is the organic blob silhouette used by every modal
 * (`clip-path: url(#animal-modal-clip)` — see `styles/panels.css`, `.modal--blob`).
 * The path is expressed in `objectBoundingBox` units so the same clip works for
 * any modal size. It is a rectangle with slightly bowed edges, a fishtail dip on
 * the bottom-left and a rounded notch on the top-right — an island, not a box.
 */
export const AnimalIslandDefs: React.FC = () => (
  <svg className="modal-blob-defs" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="animal-modal-clip" clipPathUnits="objectBoundingBox">
        <path
          d="M0.055,0.012
             C0.13,0,0.30,0.004,0.47,0.006
             L0.50,0.006
             C0.66,0.006,0.83,0.004,0.925,0.022
             C0.975,0.032,0.996,0.075,0.995,0.15
             C0.992,0.28,0.984,0.36,0.989,0.47
             C0.994,0.58,1.0,0.70,0.986,0.845
             C0.976,0.945,0.925,0.981,0.83,0.987
             C0.70,0.995,0.56,0.992,0.45,0.994
             L0.39,0.996
             L0.315,0.965
             L0.24,0.996
             C0.165,0.998,0.08,0.986,0.038,0.945
             C0.0,0.905,-0.006,0.80,0.008,0.66
             C0.02,0.53,-0.004,0.42,0.006,0.30
             C0.014,0.19,0.008,0.075,0.055,0.012"
        />
      </clipPath>
    </defs>
  </svg>
);

export default AnimalIslandDefs;
