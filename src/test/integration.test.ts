/**
 * GodotMemory Integration Tests
 * 
 * Tests cover all 6 panels + core functionality.
 * Uses Vitest with mocked Tauri IPC for frontend testing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Tauri IPC ───
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────── Module: Engine ───────────────

describe('Engine Module', () => {
  it('should call db_list_engines IPC command', async () => {
    const { dbListEngines } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue([]);
    const result = await dbListEngines();
    expect(invoke).toHaveBeenCalledWith('db_list_engines', expect.anything());
    expect(result).toEqual([]);
  });

  it('should call db_add_engine with correct parameters', async () => {
    const { dbAddEngine } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue('new-id-123');
    const id = await dbAddEngine({ name: 'Godot 4.2', version: '4.2' }, ['tag-1']);
    expect(invoke).toHaveBeenCalledWith('db_add_engine', {
      engine: { name: 'Godot 4.2', version: '4.2' },
      tagIds: ['tag-1'],
    });
    expect(id).toBe('new-id-123');
  });

  it('should call db_search_engines IPC command', async () => {
    const { dbSearchEngines } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue({ items: [], total: 0 });
    const result = await dbSearchEngines('godot', [], { index: 1, size: 10 });
    expect(invoke).toHaveBeenCalledWith('db_search_engines', {
      search: 'godot', tagIds: [], page: { index: 1, size: 10 }
    });
    expect(result.total).toBe(0);
  });
});

// ─────────────── Module: Proj ───────────────

describe('Project Module', () => {
  it('should call db_list_projs', async () => {
    const { dbListProjs } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue([]);
    await dbListProjs({ index: 1, size: 30 });
    expect(invoke).toHaveBeenCalledWith('db_list_projs', { page: { index: 1, size: 30 } });
  });

  it('should call db_scan_projects', async () => {
    const { dbScanProjects } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue(5);
    const count = await dbScanProjects('C:/projects');
    expect(invoke).toHaveBeenCalledWith('db_scan_projects', { dir: 'C:/projects' });
    expect(count).toBe(5);
  });

  it('should call db_toggle_proj_star', async () => {
    const { dbToggleProjStar } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue(undefined);
    await dbToggleProjStar('proj-1', true);
    expect(invoke).toHaveBeenCalledWith('db_toggle_proj_star', { id: 'proj-1', star: true });
  });
});

// ─────────────── Module: Asset ───────────────

describe('Asset Module', () => {
  it('should call db_list_assets', async () => {
    const { dbListAssets } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue([]);
    await dbListAssets({ index: 1, size: 10 });
    expect(invoke).toHaveBeenCalledWith('db_list_assets', { page: { index: 1, size: 10 } });
  });

  it('should call db_add_asset with copyright', async () => {
    const { dbAddAsset } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue('asset-1');
    await dbAddAsset({ name: 'Texture Pack', copy_right: 'CC0' }, [], []);
    expect(invoke).toHaveBeenCalledWith('db_add_asset', {
      asset: { name: 'Texture Pack', copy_right: 'CC0' },
      tagIds: [], imagePaths: [],
    });
  });

  it('should call db_toggle_asset_star', async () => {
    const { dbToggleAssetStar } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue(undefined);
    await dbToggleAssetStar('asset-1', false);
    expect(invoke).toHaveBeenCalledWith('db_toggle_asset_star', { id: 'asset-1', star: false });
  });
});

// ─────────────── Module: Tool ───────────────

describe('Tool Module', () => {
  it('should call db_list_tools', async () => {
    const { dbListTools } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue([]);
    await dbListTools();
    expect(invoke).toHaveBeenCalledWith('db_list_tools', { page: null });
  });

  it('should call db_add_tool with directory', async () => {
    const { dbAddTool } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue('tool-1');
    await dbAddTool({ name: 'Blender', directory: 'C:/blender.exe' }, ['tag-1'], []);
    expect(invoke).toHaveBeenCalledWith('db_add_tool', {
      tool: { name: 'Blender', directory: 'C:/blender.exe' },
      tagIds: ['tag-1'], imagePaths: [],
    });
  });
});

// ─────────────── Module: Diary ───────────────

describe('Diary Module', () => {
  it('should call db_list_diaries', async () => {
    const { dbListDiaries } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue([{ id: '1', name: 'Dev Log', desc: '', sort: 1, is_delete: false, proj_id: '' }]);
    const diaries = await dbListDiaries();
    expect(invoke).toHaveBeenCalledWith('db_list_diaries');
    expect(diaries.length).toBe(1);
    expect(diaries[0].name).toBe('Dev Log');
  });

  it('should call db_save_diary_detail', async () => {
    const { dbSaveDiaryDetail } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue('detail-1');
    await dbSaveDiaryDetail({
      diary_id: 'diary-1',
      create_date: '2026-06-11',
      content: 'Today I worked on the Tauri migration...',
    });
    expect(invoke).toHaveBeenCalledWith('db_save_diary_detail', {
      detail: {
        diary_id: 'diary-1',
        create_date: '2026-06-11',
        content: 'Today I worked on the Tauri migration...',
      },
    });
  });

  it('should call db_query_diary_details by year', async () => {
    const { dbQueryDiaryDetails } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue([]);
    await dbQueryDiaryDetails('diary-1', 2026);
    expect(invoke).toHaveBeenCalledWith('db_query_diary_details', { diaryId: 'diary-1', year: 2026 });
  });
});

// ─────────────── Module: Tags ───────────────

describe('Tags Module', () => {
  it('should call db_list_tags', async () => {
    const { dbListTags } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue([]);
    await dbListTags(0, 0);
    expect(invoke).toHaveBeenCalledWith('db_list_tags', { type: 0, subType: 0 });
  });

  it('should call db_insert_tag', async () => {
    const { dbInsertTag } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue({ id: 'tag-1', name: 'game', color: 'ff0000', type: 0, sub_type: 0, is_fast: false });
    const tag = await dbInsertTag('game', 'ff0000', 0, 0);
    expect(invoke).toHaveBeenCalledWith('db_insert_tag', { name: 'game', color: 'ff0000', type: 0, subType: 0 });
    expect(tag.name).toBe('game');
  });
});

// ─────────────── Module: Settings ───────────────

describe('Settings Module', () => {
  it('should call get_settings', async () => {
    const { getSettings } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue({
      language: 'zh_CN',
      default_panel: 'Engine',
      bubble_opacity: 0.85,
      bubble_size: 110,
      snap_threshold: 30,
      remember_position: true,
      last_snap_edge: 'None',
      screen_shot_dir: '',
    });
    const s = await getSettings();
    expect(invoke).toHaveBeenCalledWith('get_settings');
    expect(s.language).toBe('zh_CN');
    expect(s.default_panel).toBe('Engine');
  });

  it('should call save_settings', async () => {
    const { saveSettings } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue({
      language: 'en_US',
      default_panel: 'Proj',
      bubble_opacity: 0.9,
      bubble_size: 120,
      snap_threshold: 40,
      remember_position: false,
      last_snap_edge: 'Right',
      screen_shot_dir: '',
    });
    await saveSettings({ language: 'en_US', default_panel: 'Proj', bubble_opacity: 0.9, bubble_size: 120, snap_threshold: 40, remember_position: false, last_snap_edge: 'Right', screen_shot_dir: '' });
    expect(invoke).toHaveBeenCalledWith('save_settings', expect.anything());
  });
});

// ─────────────── Module: Window Management ───────────────

describe('Window Management Module', () => {
  it('should call set_window_mode', async () => {
    const { setWindowMode } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue(undefined);
    await setWindowMode('panel');
    expect(invoke).toHaveBeenCalledWith('set_window_mode', { mode: 'panel' });
  });

  it('should call get_window_mode', async () => {
    const { getWindowMode } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue('ball');
    const mode = await getWindowMode();
    expect(invoke).toHaveBeenCalledWith('get_window_mode');
    expect(mode).toBe('ball');
  });

  it('should call launch_app', async () => {
    const { launchApp } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue(undefined);
    await launchApp('C:/godot.exe');
    expect(invoke).toHaveBeenCalledWith('launch_app', { path: 'C:/godot.exe' });
  });

  it('should call detect_engine_version', async () => {
    const { detectEngineVersion } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue(['4', '2', '1']);
    const ver = await detectEngineVersion('C:/godot.exe');
    expect(invoke).toHaveBeenCalledWith('detect_engine_version', { path: 'C:/godot.exe' });
    expect(ver[0]).toBe('4');
  });

  it('should call scan_project_file', async () => {
    const { scanProjectFile } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue({ name: 'My Game', version: '4.2', main_version: '4' });
    const info = await scanProjectFile('C:/mygame');
    expect(invoke).toHaveBeenCalledWith('scan_project_file', { path: 'C:/mygame' });
    expect(info.name).toBe('My Game');
  });
});

// ─────────────── Module: Image Cache ───────────────

describe('Image Cache Module', () => {
  it('should call db_copy_image_to_cache', async () => {
    const { dbCopyImageToCache } = await import('../bridge');
    vi.mocked(invoke).mockResolvedValue({
      id: 'img-1', width: 256, height: 256,
      path: 'C:/screenshot.png', new_path: 'C:/cache/abc123.png',
    });
    const img = await dbCopyImageToCache('C:/screenshot.png');
    expect(invoke).toHaveBeenCalledWith('db_copy_image_to_cache', { srcPath: 'C:/screenshot.png' });
    expect(img.width).toBe(256);
  });
});
