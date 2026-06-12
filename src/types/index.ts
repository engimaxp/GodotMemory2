// ─── Tag ───
export interface Tag {
  id: string;
  name: string;
  color: string;
  type: number;
  sub_type: number;
  is_fast: boolean;
}

// ─── Image ───
export interface ImageRecord {
  id: string;
  width: number;
  height: number;
  format?: string;
  path: string;      // original path
  new_path: string;  // cache path
}

// ─── Engine ───
export interface Engine {
  id: string;
  version: string;
  directory: string;
  is_enc: boolean;
  enc_key: string;
  has_console: boolean;
  console_dir: string;
  name: string;
  is_default: boolean;
  main_version: number;
  desc: string;
  sort: number;
  is_delete: boolean;
}

// ─── Proj (Project) ───
export interface Proj {
  id: string;
  version: string;
  directory: string;
  name: string;
  main_version: number;
  desc: string;
  sort: number;
  is_delete: boolean;
  engine_id: string;
  icon: string;
  star: boolean;
}

// ─── Asset ───
export interface Asset {
  id: string;
  directory: string;
  name: string;
  copy_right: string;
  link: string;
  desc: string;
  sort: number;
  is_delete: boolean;
  star: boolean;
}

// ─── Tool ───
export interface Tool {
  id: string;
  directory: string;
  link: string;
  name: string;
  desc: string;
  sort: number;
  is_delete: boolean;
  icon: string;
  star: boolean;
}

// ─── Diary ───
export interface Diary {
  id: string;
  name: string;
  desc: string;
  proj_id: string;
  sort: number;
  is_delete: boolean;
}

export interface DiaryDetail {
  id: string;
  create_date: string;
  diary_id: string;
  content: string;
}

// ─── Extras ───
export interface EntityWithExtras<T> {
  entity: T;
  tags: Tag[];
  images: ImageRecord[];
}

// ─── Pagination ───
export interface Page {
  index: number;
  size: number;
}

// ─── Window Mode ───
export type WindowMode = 'ball' | 'panel';
export type SnapEdge = 'Left' | 'Right' | 'Top' | 'Bottom' | 'None';
export type PanelName = 'Engine' | 'Proj' | 'Asset' | 'Tool' | 'Diary' | 'Setting';

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  x: number;
  y: number;
  edge: SnapEdge;
}

// ─── Settings ───
export interface Settings {
  language: string;
  default_panel: string;
  screen_shot_dir: string;
  bubble_opacity: number;
  bubble_size: number;
  snap_threshold: number;
  remember_position: boolean;
  auto_start: boolean;
  last_ball_x?: number;
  last_ball_y?: number;
  last_snap_edge: SnapEdge;
}

// Constants matching GDScript enums
export const TagType = {
  Engine: 0,
  Proj: 1,
  Asset: 2,
  Tool: 3,
  Diary: 4,
} as const;
