/**
 * Tauri IPC Bridge
 * All communication with Rust backend
 */
import { invoke } from '@tauri-apps/api/core';
import type {
  Engine, Proj, Asset, Tool, Diary, DiaryDetail,
  Tag, ImageRecord, EntityWithExtras,
  Page, Settings, WorkArea, SnapResult, PanelName,
} from './types/index';

// ═══════════════════════════ Engine CRUD ═══════════════════════════

export async function dbListEngines(page?: Page): Promise<{ items: EntityWithExtras<Engine>[]; total: number }> {
  return invoke('db_list_engines', { page: page ?? null });
}
export async function dbListAllEngines(): Promise<EntityWithExtras<Engine>[]> {
  return invoke('db_list_all_engines');
}
export async function dbSearchEngines(
  search: string, tagIds: string[], page: Page | null
): Promise<{ items: EntityWithExtras<Engine>[]; total: number }> {
  return invoke('db_search_engines', { search, tagIds, page });
}
export async function dbAddEngine(engine: Partial<Engine>, tagIds: string[]): Promise<string> {
  return invoke('db_add_engine', { engine, tagIds });
}
export async function dbUpdateEngine(engine: Engine, tagIds: string[]): Promise<void> {
  return invoke('db_update_engine', { engine, tagIds });
}
export async function dbDeleteEngine(id: string): Promise<void> {
  return invoke('db_delete_engine', { id });
}
export async function dbGetEngineById(id: string): Promise<Engine | null> {
  return invoke('db_get_engine_by_id', { id });
}

// ═══════════════════════════ Proj CRUD ═══════════════════════════

export async function dbListProjs(page?: Page): Promise<{ items: EntityWithExtras<Proj>[]; total: number }> {
  return invoke('db_list_projs', { page: page ?? null });
}
export async function dbListAllProjs(): Promise<EntityWithExtras<Proj>[]> {
  return invoke('db_list_all_projs');
}
export async function dbSearchProjs(
  search: string, tagIds: string[], page: Page | null
): Promise<{ items: EntityWithExtras<Proj>[]; total: number }> {
  return invoke('db_search_projs', { search, tagIds, page });
}
export async function dbAddProj(proj: Partial<Proj>, tagIds: string[], imageIds: string[]): Promise<string> {
  return invoke('db_add_proj', { proj, tagIds, imageIds });
}
export async function dbUpdateProj(proj: Proj, tagIds: string[], imageIds: string[]): Promise<void> {
  return invoke('db_update_proj', { proj, tagIds, imageIds });
}
export async function dbDeleteProj(id: string): Promise<void> {
  return invoke('db_delete_proj', { id });
}
export async function dbToggleProjStar(id: string, star: boolean): Promise<void> {
  return invoke('db_toggle_proj_star', { id, star });
}
export async function dbScanProjects(dir: string): Promise<number> {
  return invoke('db_scan_projects', { dir });
}

// ═══════════════════════════ Asset CRUD ═══════════════════════════

export async function dbListAssets(page?: Page): Promise<{ items: EntityWithExtras<Asset>[]; total: number }> {
  return invoke('db_list_assets', { page: page ?? null });
}
export async function dbListAllAssets(): Promise<EntityWithExtras<Asset>[]> {
  return invoke('db_list_all_assets');
}
export async function dbSearchAssets(
  search: string, tagIds: string[], page: Page | null
): Promise<{ items: EntityWithExtras<Asset>[]; total: number }> {
  return invoke('db_search_assets', { search, tagIds, page });
}
export async function dbAddAsset(asset: Partial<Asset>, tagIds: string[], imageIds: string[]): Promise<string> {
  return invoke('db_add_asset', { asset, tagIds, imageIds });
}
export async function dbUpdateAsset(asset: Asset, tagIds: string[], imageIds: string[]): Promise<void> {
  return invoke('db_update_asset', { asset, tagIds, imageIds });
}
export async function dbDeleteAsset(id: string): Promise<void> {
  return invoke('db_delete_asset', { id });
}
export async function dbToggleAssetStar(id: string, star: boolean): Promise<void> {
  return invoke('db_toggle_asset_star', { id, star });
}

// ═══════════════════════════ Tool CRUD ═══════════════════════════

export async function dbListTools(page?: Page): Promise<{ items: EntityWithExtras<Tool>[]; total: number }> {
  return invoke('db_list_tools', { page: page ?? null });
}
export async function dbListAllTools(): Promise<EntityWithExtras<Tool>[]> {
  return invoke('db_list_all_tools');
}
export async function dbSearchTools(
  search: string, tagIds: string[], page: Page | null
): Promise<{ items: EntityWithExtras<Tool>[]; total: number }> {
  return invoke('db_search_tools', { search, tagIds, page });
}
export async function dbAddTool(tool: Partial<Tool>, tagIds: string[], imageIds: string[]): Promise<string> {
  return invoke('db_add_tool', { tool, tagIds, imageIds });
}
export async function dbUpdateTool(tool: Tool, tagIds: string[], imageIds: string[]): Promise<void> {
  return invoke('db_update_tool', { tool, tagIds, imageIds });
}
export async function dbDeleteTool(id: string): Promise<void> {
  return invoke('db_delete_tool', { id });
}
export async function dbToggleToolStar(id: string, star: boolean): Promise<void> {
  return invoke('db_toggle_tool_star', { id, star });
}

// ═══════════════════════════ Diary CRUD ═══════════════════════════

export async function dbListDiaries(): Promise<Diary[]> {
  return invoke('db_list_diaries');
}
export async function dbAddDiary(diary: Partial<Diary>): Promise<string> {
  return invoke('db_add_diary', { diary });
}
export async function dbUpdateDiary(diary: Diary): Promise<void> {
  return invoke('db_update_diary', { diary });
}
export async function dbDeleteDiary(id: string): Promise<void> {
  return invoke('db_delete_diary', { id });
}
export async function dbGetDiaryDetail(diaryId: string, createDate: string): Promise<DiaryDetail | null> {
  return invoke('db_get_diary_detail', { diaryId, createDate });
}
export async function dbSaveDiaryDetail(detail: Partial<DiaryDetail>): Promise<string> {
  return invoke('db_save_diary_detail', { detail });
}
export async function dbQueryDiaryDetails(diaryId: string, year: number): Promise<DiaryDetail[]> {
  return invoke('db_query_diary_details', { diaryId, year });
}
export async function dbQueryAllDiaryDetails(diaryId: string): Promise<DiaryDetail[]> {
  return invoke('db_query_all_diary_details', { diaryId });
}

// ═══════════════════════════ Tags ═══════════════════════════

export async function dbListTags(type: number, subType: number): Promise<Tag[]> {
  return invoke('db_list_tags', { type, subType });
}
export async function dbQueryTagByNameLike(text: string, type: number, subType: number): Promise<Tag[]> {
  return invoke('db_query_tag_by_name_like', { text, type, subType });
}
export async function dbInsertTag(name: string, color: string, type: number, subType: number): Promise<Tag> {
  return invoke('db_insert_tag', { name, color, type, subType });
}
export async function dbSetFastTag(id: string, isFast: boolean): Promise<void> {
  return invoke('db_set_fast_tag', { id, isFast });
}
export async function dbUpdateTagColor(id: string, color: string): Promise<void> {
  return invoke('db_update_tag_color', { id, color });
}
export async function dbDeleteTag(id: string): Promise<void> {
  return invoke('db_delete_tag', { id });
}

// ═══════════════════════════ Images ═══════════════════════════

export async function dbCopyImageToCache(srcPath: string): Promise<ImageRecord> {
  return invoke('db_copy_image_to_cache', { srcPath });
}
export async function dbLoadImage(id: string): Promise<string | null> {
  return invoke('db_load_image', { id });
}

export async function dbLoadIcon(iconPath: string, baseDir: string, entityId: string, entityType: number): Promise<string | null> {
  return invoke('db_load_icon', { iconPath, baseDir, entityId, entityType });
}
export async function dbExtractExeIcon(exePath: string): Promise<ImageRecord> {
  return invoke('db_extract_exe_icon', { exePath });
}

// ═══════════════════════════ Settings ═══════════════════════════

export async function getSettings(): Promise<Settings> {
  return invoke('get_settings');
}
export async function saveSettings(settings: Settings): Promise<Settings> {
  return invoke('save_settings', { newSettings: settings });
}

// ═══════════════════════════ Window ═══════════════════════════

export async function setWindowMode(mode: string): Promise<void> {
  return invoke('set_window_mode', { mode });
}
export async function getWindowMode(): Promise<string> {
  return invoke<string>('get_window_mode');
}
export async function startDragging(): Promise<void> {
  return invoke('start_dragging');
}
export async function togglePanel(): Promise<void> {
  return invoke('toggle_panel');
}
export async function resizeWindow(width: number, height: number): Promise<void> {
  return invoke('resize_window', { width, height });
}
export async function getScreenWorkArea(): Promise<WorkArea> {
  return invoke('get_screen_work_area');
}
export async function snapToEdge(): Promise<SnapResult> {
  return invoke('snap_to_edge');
}

// ═══════════════════════════ Utils ═══════════════════════════

export async function launchApp(path: string): Promise<void> {
  return invoke('launch_app', { path });
}
export async function launchProject(enginePath: string, projectDir: string): Promise<void> {
  return invoke('launch_project', { enginePath, projectDir });
}
export async function openFolder(path: string): Promise<void> {
  return invoke('open_folder', { path });
}
export async function detectEngineVersion(path: string): Promise<string[]> {
  return invoke('detect_engine_version', { path });
}
export async function scanProjectFile(path: string): Promise<Record<string, string>> {
  return invoke('scan_project_file', { path });
}
// ═══════════════════════════ Data Import ═══════════════════════════

export interface ImportResult {
  engines: number;
  projs: number;
  assets: number;
  tools: number;
  diaries: number;
  tags: number;
}

export async function dbImportFromPath(sourcePath: string): Promise<ImportResult> {
  const result = await invoke<string>('db_import_from_path', { sourcePath });
  return JSON.parse(result);
}
