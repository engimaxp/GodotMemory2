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

export interface BubbleDock {
  edge: SnapEdge;
  tucked: boolean;
  revision: number;
}
export type PanelName = 'Quota' | 'Engine' | 'Proj' | 'Asset' | 'Tool' | 'Diary' | 'Notes' | 'Setting';

export type BubbleDisplayMode = 'both' | 'codex' | 'antigravity' | 'icon';

export interface QuotaWindow {
  id: string;
  label: string;
  window_kind: '5h' | 'weekly' | 'other' | string;
  remaining_percent: number;
  reset_at: string | null;
  reset_at_epoch: number | null;
  description: string | null;
}

export interface QuotaModelGroup {
  name: string;
  description: string | null;
  five_hour: QuotaWindow | null;
  weekly: QuotaWindow | null;
  extra_windows: QuotaWindow[];
}

export interface ProviderQuota {
  provider: 'codex' | 'antigravity' | string;
  status: 'ok' | 'error' | string;
  error: string | null;
  account_email: string | null;
  plan_type: string | null;
  plan_expires_at: string | null;
  credits_balance: string | null;
  credits_unlimited: boolean;
  five_hour: QuotaWindow | null;
  weekly: QuotaWindow | null;
  groups: QuotaModelGroup[];
}

export interface QuotaSnapshot {
  fetched_at: number;
  codex: ProviderQuota;
  antigravity: ProviderQuota;
}

export type QuotaNoticeTone = 'success' | 'warning' | 'error';

export interface QuotaNotice {
  id: number;
  tone: QuotaNoticeTone;
  message: string;
}

export const noteColors = ['honey', 'mint', 'peach', 'lilac', 'sky'] as const;
export type NoteColor = typeof noteColors[number];

export interface NoteDraft {
  content: string;
  color: NoteColor;
}

export interface StickyNote extends NoteDraft {
  id: string;
  updated_at: string;
}

export interface NoteWindowView {
  edge: SnapEdge;
  peeking: boolean;
  retreating: boolean;
  revision: number;
}

export type NoteWindowAction = 'ready' | 'minimize' | 'toggle_maximize' | 'tuck' | 'peek' | 'hide_peek' | 'finish_peek' | 'restore' | 'close';
export type NoteDrag = 'begin' | 'move' | 'end' | 'cancel';

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
  bubble_display_mode: BubbleDisplayMode;
  snap_threshold: number;
  remember_position: boolean;
  auto_start: boolean;
  last_ball_x?: number;
  last_ball_y?: number;
  last_snap_edge: SnapEdge;
  diary_sidebar_collapsed: boolean;
  diary_selected_id: string;
  diary_selected_date: string;
  diary_cursor_pos: number;
}

// Constants matching GDScript enums
export const TagType = {
  Engine: 0,
  Proj: 1,
  Asset: 2,
  Tool: 3,
  Diary: 4,
} as const;
