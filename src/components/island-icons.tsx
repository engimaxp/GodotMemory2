/**
 * IslandIcon — the cute icon set from animal-island-ui.
 *
 * The SVG artwork below is taken verbatim from
 * https://github.com/guokaigdg/animal-island-ui (`src/components/Icon/src/*Icon.tsx`,
 * 48×48 viewBox, palette `#2A2A2A / #264653 / #E76F51 / #E9C46A / #F4A6A4 /
 * #588157 / #2A9D8F / #FAEDCD`). It is vendored here — instead of being pulled in
 * as a runtime dependency — so the desktop app stays offline-safe and only ships
 * the icons it actually uses.
 *
 * animal-island-ui is licensed CC BY-NC 4.0 (non-commercial). See README.md.
 */
import React, { type SVGProps } from 'react';

const Svg = (props: SVGProps<SVGSVGElement>): React.ReactElement => (
  <svg
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="#2A2A2A"
    strokeWidth={3.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  />
);

export const CatIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M8 16 L14 8 L18 16 Z" fill="#E76F51" />
    <path d="M30 16 L34 8 L40 16 Z" fill="#E76F51" />
    <circle cx="24" cy="28" r="16" fill="#E76F51" />
    <circle cx="18" cy="26" r="2.5" fill="#FFFFFF" />
    <circle cx="30" cy="26" r="2.5" fill="#FFFFFF" />
    <circle cx="18" cy="27" r="1.3" fill="#2A2A2A" />
    <circle cx="30" cy="27" r="1.3" fill="#2A2A2A" />
    <path d="M24 30 L22 33 L26 33 Z" fill="#F4A6A4" />
    <path d="M19 34 Q 24 38 29 34" stroke="#2A2A2A" fill="none" />
  </Svg>
);

export const SettingsIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M24 6 L27 11 L33 10 L34 16 L40 18 L37 23 L40 28 L34 30 L33 36 L27 35 L24 40 L21 35 L15 36 L14 30 L8 28 L11 23 L8 18 L14 16 L15 10 L21 11 Z" fill="#264653" />
    <circle cx="24" cy="23" r="6" fill="#E9C46A" />
  </Svg>
);

export const RocketIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M24 6 C 16 6 14 18 14 26 L14 38 L34 38 L34 26 C 34 18 32 6 24 6 Z" fill="#FAEDCD" />
    <circle cx="24" cy="22" r="5" fill="#2A9D8F" />
    <path d="M14 30 L8 36 L8 42 L14 38" fill="#E76F51" />
    <path d="M34 30 L40 36 L40 42 L34 38" fill="#E76F51" />
    <path d="M18 42 L24 46 L30 42" fill="#E76F51" />
  </Svg>
);

export const LeafIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M8 40 C 8 18 24 6 40 8 C 40 24 26 40 8 40 Z" fill="#588157" />
    <path d="M8 40 L40 8" stroke="#2A2A2A" strokeWidth="2" />
  </Svg>
);

export const FishIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M6 24 C 8 14 22 10 30 14 C 38 18 38 30 30 34 C 22 38 8 34 6 24 Z" fill="#2A9D8F" />
    <path d="M30 24 L42 14 L42 34 Z" fill="#E76F51" />
    <circle cx="14" cy="22" r="2" fill="#FFFFFF" />
    <circle cx="14" cy="22" r="1" fill="#2A2A2A" />
  </Svg>
);

export const BookIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M8 10 L8 38 C 14 36 20 36 24 38 L24 10 C 20 8 14 8 8 10 Z" fill="#264653" />
    <path d="M24 10 L24 38 C 28 36 34 36 40 38 L40 10 C 34 8 28 8 24 10 Z" fill="#2A9D8F" />
    <path d="M24 10 L24 38" stroke="#2A2A2A" />
    <circle cx="16" cy="20" r="1.3" fill="#FFFFFF" />
    <circle cx="32" cy="20" r="1.3" fill="#FFFFFF" />
  </Svg>
);

export const CalendarIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <rect x="8" y="12" width="32" height="28" rx="4" fill="#FAEDCD" />
    <path d="M8 20 L40 20" stroke="#2A2A2A" strokeWidth="3" />
    <rect x="8" y="12" width="32" height="8" fill="#E76F51" />
    <path d="M16 8 L16 16" stroke="#2A2A2A" strokeWidth="3" />
    <path d="M32 8 L32 16" stroke="#2A2A2A" strokeWidth="3" />
    <circle cx="18" cy="28" r="1.5" fill="#2A2A2A" />
    <circle cx="24" cy="28" r="1.5" fill="#2A2A2A" />
    <circle cx="30" cy="28" r="1.5" fill="#2A2A2A" />
  </Svg>
);

export const PlayIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <circle cx="24" cy="24" r="20" fill="#2A9D8F" />
    <path d="M19 16 L34 24 L19 32 Z" fill="#E9C46A" />
  </Svg>
);

export const FolderIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M6 16 L6 38 L42 38 L42 18 L22 18 L18 12 L6 12 Z" fill="#E9C46A" />
    <path d="M6 18 L42 18" stroke="#2A2A2A" strokeWidth="2" />
  </Svg>
);

export const EditIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M8 38 L8 32 L30 10 L38 18 L16 40 L10 40 Z" fill="#E9C46A" />
    <path d="M30 10 L36 4 L42 10 L38 16" fill="#F4A6A4" />
    <path d="M8 38 L14 38" stroke="#2A2A2A" strokeWidth="2" />
  </Svg>
);

export const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M10 16 L38 16 L36 42 L12 42 Z" fill="#E76F51" />
    <path d="M18 16 L18 10 L30 10 L30 16" fill="#F4A6A4" />
    <path d="M6 16 L42 16" stroke="#2A2A2A" strokeWidth="3.5" />
    <path d="M19 22 L19 36" stroke="#2A2A2A" strokeWidth="2.5" />
    <path d="M29 22 L29 36" stroke="#2A2A2A" strokeWidth="2.5" />
  </Svg>
);

export const StarIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M24 6 L29 18 L42 19 L32 28 L35 41 L24 34 L13 41 L16 28 L6 19 L19 18 Z" fill="#E9C46A" />
    <circle cx="20" cy="22" r="1.3" fill="#2A2A2A" />
    <circle cx="28" cy="22" r="1.3" fill="#2A2A2A" />
  </Svg>
);

export const BookmarkIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M12 6 L36 6 L36 42 L24 32 L12 42 Z" fill="#E76F51" />
    <path d="M20 16 L28 16" stroke="#2A2A2A" strokeWidth="2" />
  </Svg>
);

export const CameraIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <rect x="6" y="16" width="36" height="24" rx="3" fill="#264653" />
    <path d="M18 16 L20 10 L28 10 L30 16" fill="#264653" />
    <circle cx="24" cy="28" r="8" fill="#FAEDCD" />
    <circle cx="24" cy="28" r="4" fill="#E76F51" />
    <rect x="34" y="19" width="4" height="3" fill="#E9C46A" />
  </Svg>
);

export const ImageIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <rect x="6" y="10" width="36" height="28" rx="3" fill="#FAEDCD" />
    <circle cx="16" cy="20" r="3" fill="#E9C46A" />
    <path d="M10 36 L20 24 L28 32 L36 22 L42 36 Z" fill="#2A9D8F" />
    <path d="M10 36 L42 36" stroke="#2A2A2A" />
  </Svg>
);

export const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <circle cx="24" cy="24" r="17" fill="#E9C46A" />
    <path d="M24 15 L24 33" stroke="#2A2A2A" strokeWidth="4.5" />
    <path d="M15 24 L33 24" stroke="#2A2A2A" strokeWidth="4.5" />
  </Svg>
);

export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <circle cx="24" cy="24" r="17" fill="#FAEDCD" />
    <path d="M17 17 L31 31" stroke="#E76F51" strokeWidth="4.5" />
    <path d="M31 17 L17 31" stroke="#E76F51" strokeWidth="4.5" />
  </Svg>
);

export const GlobeIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <circle cx="24" cy="21" r="14" fill="#2A9D8F" />
    <ellipse cx="24" cy="21" rx="6" ry="14" stroke="#2A2A2A" strokeWidth="2" fill="none" />
    <path d="M10 21 L38 21" stroke="#2A2A2A" strokeWidth="2" />
    <path d="M17 13 C 19 10 24 10 25 13 C 23 15 19 16 17 13 Z" fill="#588157" />
    <path d="M26 27 C 28 25 32 26 31 29 C 29 31 25 30 26 27 Z" fill="#588157" />
    <path d="M24 35 L24 39" stroke="#2A2A2A" strokeWidth="3" />
    <path d="M15 42 L33 42" stroke="#2A2A2A" strokeWidth="3.5" />
  </Svg>
);

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <circle cx="20" cy="20" r="12" fill="#2A9D8F" />
    <circle cx="20" cy="20" r="6" fill="#FFFFFF" />
    <path d="M30 30 L42 42" stroke="#2A2A2A" strokeWidth="4.5" />
  </Svg>
);

export const RefreshIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M37 16 A 14.5 14.5 0 1 0 38.5 24" stroke="#2A9D8F" strokeWidth="3.5" fill="none" />
    <path d="M30 10 L39 11 L35 19 Z" fill="#E76F51" />
  </Svg>
);

export const TagIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M28 6 L42 6 L42 20 L24 38 L10 24 Z" fill="#F4A6A4" />
    <circle cx="34" cy="14" r="3" fill="#FFFFFF" />
  </Svg>
);

export const SunIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <circle cx="24" cy="24" r="10" fill="#E9C46A" />
    <path d="M24 4 L24 10" stroke="#2A2A2A" />
    <path d="M24 38 L24 44" stroke="#2A2A2A" />
    <path d="M4 24 L10 24" stroke="#2A2A2A" />
    <path d="M38 24 L44 24" stroke="#2A2A2A" />
    <path d="M10 10 L14 14" stroke="#2A2A2A" />
    <path d="M34 34 L38 38" stroke="#2A2A2A" />
    <path d="M10 38 L14 34" stroke="#2A2A2A" />
    <path d="M34 14 L38 10" stroke="#2A2A2A" />
  </Svg>
);

export const SnailIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M6 38 L42 38 C 42 33 39 31 35 31 L18 31 C 11 31 6 33 6 38 Z" fill="#588157" />
    <circle cx="13" cy="27" r="5" fill="#588157" />
    <path d="M10.5 23 L8 14" stroke="#2A2A2A" strokeWidth="2" />
    <path d="M15.5 23 L18 14" stroke="#2A2A2A" strokeWidth="2" />
    <circle cx="8" cy="12.5" r="1.8" fill="#2A2A2A" />
    <circle cx="18" cy="12.5" r="1.8" fill="#2A2A2A" />
    <circle cx="31" cy="22" r="10" fill="#E76F51" />
    <circle cx="31" cy="22" r="2" fill="#2A2A2A" />
    <path d="M31 16 A 6 6 0 1 1 25 22" stroke="#2A2A2A" strokeWidth="2" fill="none" />
    <path d="M10 29 Q 12 31 14 29.5" stroke="#2A2A2A" fill="none" strokeWidth="1.5" />
  </Svg>
);

export const CactusIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <rect x="20" y="12" width="8" height="30" rx="4" fill="#588157" />
    <path d="M20 26 L15 26 C 10 26 9 16 14 16 C 16 16 16 18 16 20 L16 22 L20 22 Z" fill="#588157" />
    <path d="M28 32 L33 32 C 38 32 39 22 34 22 C 32 22 32 24 32 26 L32 28 L28 28 Z" fill="#588157" />
    <circle cx="24" cy="9" r="2" fill="#E9C46A" />
    <circle cx="21" cy="10" r="2.5" fill="#F4A6A4" />
    <circle cx="27" cy="10" r="2.5" fill="#F4A6A4" />
    <circle cx="24" cy="12.5" r="2.5" fill="#F4A6A4" />
    <circle cx="23" cy="20" r="1.3" fill="#2A2A2A" />
    <circle cx="26" cy="20" r="1.3" fill="#2A2A2A" />
    <path d="M23 23 Q 24.5 24.5 26 23" stroke="#2A2A2A" fill="none" strokeWidth="1.5" />
    <path d="M14 44 L34 44" stroke="#8B5E3C" strokeWidth="3" />
  </Svg>
);

export const FlowerIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <circle cx="24" cy="16" r="7" fill="#F4A6A4" />
    <circle cx="14" cy="22" r="7" fill="#F4A6A4" />
    <circle cx="34" cy="22" r="7" fill="#F4A6A4" />
    <circle cx="18" cy="32" r="7" fill="#F4A6A4" />
    <circle cx="30" cy="32" r="7" fill="#F4A6A4" />
    <circle cx="24" cy="24" r="6" fill="#E9C46A" />
  </Svg>
);

export const MoonIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <path d="M32 6 C 22 8 14 16 14 26 C 14 36 22 42 32 42 C 24 40 20 32 22 24 C 24 16 28 10 32 6 Z" fill="#E9C46A" />
    <circle cx="36" cy="14" r="1.5" fill="#2A2A2A" />
    <circle cx="40" cy="22" r="1.5" fill="#2A2A2A" />
  </Svg>
);

export const CompassIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <circle cx="24" cy="24" r="18" fill="#264653" />
    <path d="M24 10 L29 24 L24 38 L19 24 Z" fill="#E76F51" />
    <path d="M24 10 L24 24" stroke="#2A2A2A" strokeWidth="2" />
  </Svg>
);

export const GaugeIcon = (props: SVGProps<SVGSVGElement>) => (
  <Svg {...props}>
    <rect x="8" y="12" width="32" height="24" rx="12" fill="#FAEDCD" />
    <path d="M14 28 A 10 10 0 0 1 34 28" fill="none" stroke="#2A9D8F" strokeWidth="4" />
    <path d="M24 28 L31 19" stroke="#E76F51" strokeWidth="3.5" />
    <circle cx="24" cy="28" r="3" fill="#E9C46A" />
  </Svg>
);

export type IslandIconName =
  | 'Cat' | 'Settings' | 'Rocket' | 'Leaf' | 'Fish' | 'Book' | 'Calendar'
  | 'Play' | 'Folder' | 'Edit' | 'Trash' | 'Star' | 'Bookmark' | 'Camera'
  | 'Image' | 'Plus' | 'Close' | 'Globe' | 'Search' | 'Refresh' | 'Tag'
  | 'Sun' | 'Snail' | 'Cactus' | 'Flower' | 'Moon' | 'Compass' | 'Gauge';

/** Name → artwork registry (key = file name without the `Icon` suffix, like upstream). */
export const ISLAND_ICONS: Record<IslandIconName, React.FC<SVGProps<SVGSVGElement>>> = {
  Cat: CatIcon,
  Settings: SettingsIcon,
  Rocket: RocketIcon,
  Leaf: LeafIcon,
  Fish: FishIcon,
  Book: BookIcon,
  Calendar: CalendarIcon,
  Play: PlayIcon,
  Folder: FolderIcon,
  Edit: EditIcon,
  Trash: TrashIcon,
  Star: StarIcon,
  Bookmark: BookmarkIcon,
  Camera: CameraIcon,
  Image: ImageIcon,
  Plus: PlusIcon,
  Close: CloseIcon,
  Globe: GlobeIcon,
  Search: SearchIcon,
  Refresh: RefreshIcon,
  Tag: TagIcon,
  Sun: SunIcon,
  Snail: SnailIcon,
  Cactus: CactusIcon,
  Flower: FlowerIcon,
  Moon: MoonIcon,
  Compass: CompassIcon,
  Gauge: GaugeIcon,
};

export interface IslandIconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** Which cute island icon to draw. */
  name: IslandIconName;
  /** Square size in px (or any CSS length). Default 24. */
  size?: number | string;
  /** Optional inner SVG class (for animation hooks). */
  svgClassName?: string;
}

/**
 * Renders one of the island icons inside a `<span>`, sized by the `size` prop.
 * The artwork keeps its own multi-colour palette, so the surrounding CSS only
 * controls size, spacing and hover motion — like upstream's `<Icon>`.
 */
export const IslandIcon: React.FC<IslandIconProps> = ({
  name, size = 24, className, svgClassName, style, ...rest
}) => {
  const Art = ISLAND_ICONS[name];
  return (
    <span
      className={['island-icon', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
      {...rest}
    >
      <Art className={['island-icon-svg', svgClassName].filter(Boolean).join(' ')} />
    </span>
  );
};

export default IslandIcon;
