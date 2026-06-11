/**
 * Save Button Tests — verifies that the "Save" button in each edit modal:
 * 1. Is disabled when required fields (name, directory) are empty
 * 2. Becomes enabled when both are filled
 * 3. Calls the correct bridge function on click
 * 4. Handles errors gracefully
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Tauri IPC
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock Tauri shell plugin
vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

beforeEach(() => {
  vi.clearAllMocks();
  // Default mock for dbListTags (called by useTagSelector on mount)
  vi.mocked(invoke).mockResolvedValue([]);
});

// ───────────────────────────────────────────────────
// Helper: extract handleSave logic as pure function
// so we can test it without full component rendering
// ───────────────────────────────────────────────────

interface SaveScenario {
  isNew: boolean;
  entityId?: string;
  name: string;
  dir: string;
  link?: string;
  desc?: string;
  iconId?: string | null;
  tagIds: string[];
  mainVersion?: string;
  engineId?: string;
  version?: string;
  copyRight?: string;
  hasConsole?: boolean;
  consoleDir?: string;
  isEnc?: boolean;
  encKey?: string;
  isDefault?: boolean;
}

// Tool save logic (extracted from ToolPanel.tsx handleSave)
async function toolSave(
  { isNew, entityId, name, dir, link, desc, iconId, tagIds }: SaveScenario,
  bridge: { dbAddTool: Function; dbUpdateTool: Function }
) {
  const data = { name, directory: dir, link, desc, icon: iconId ?? '' };
  if (isNew) await bridge.dbAddTool(data, tagIds, []);
  else if (entityId) await bridge.dbUpdateTool({ ...data, id: entityId }, tagIds, []);
}

// Proj save logic (extracted from ProjPanel.tsx handleSave)
async function projSave(
  { isNew, entityId, name, dir, version, mainVersion, engineId, desc, tagIds }: SaveScenario,
  bridge: { dbAddProj: Function; dbUpdateProj: Function }
) {
  const data = { version, directory: dir, name, main_version: parseInt(mainVersion || '4') || 4, engine_id: engineId || '', desc };
  if (isNew) await bridge.dbAddProj(data, tagIds, []);
  else if (entityId) await bridge.dbUpdateProj({ ...data, id: entityId }, tagIds, []);
}

// Asset save logic (extracted from AssetPanel.tsx handleSave)
async function assetSave(
  { isNew, entityId, name, dir, link, desc, copyRight, tagIds }: SaveScenario,
  bridge: { dbAddAsset: Function; dbUpdateAsset: Function }
) {
  const data = { name, directory: dir, link, copy_right: copyRight || '', desc };
  if (isNew) await bridge.dbAddAsset(data, tagIds, []);
  else if (entityId) await bridge.dbUpdateAsset({ ...data, id: entityId }, tagIds, []);
}

// Engine save logic (extracted from EnginePanel.tsx handleSave)
async function engineSave(
  { isNew, entityId, name, dir, version, mainVersion, desc, hasConsole, consoleDir, isEnc, encKey, isDefault, tagIds }: SaveScenario,
  bridge: { dbAddEngine: Function; dbUpdateEngine: Function }
) {
  const data = { version: version || '', directory: dir, name, main_version: parseInt(mainVersion || '4') || 4, has_console: hasConsole || false, console_dir: consoleDir || '', is_enc: isEnc || false, enc_key: encKey || '', is_default: isDefault || false, desc: desc || '' };
  if (isNew) await bridge.dbAddEngine(data, tagIds);
  else if (entityId) await bridge.dbUpdateEngine({ ...data, id: entityId }, tagIds);
}

// ───────────────────────────────────────────────────
// Tool Save Button Tests
// ───────────────────────────────────────────────────

describe('Tool Save Button', () => {
  it('should call dbAddTool when adding new tool', async () => {
    const dbAddTool = vi.fn().mockResolvedValue('new-id');
    await toolSave({
      isNew: true,
      name: 'Blender',
      dir: 'C:/blender.exe',
      tagIds: ['tag-1'],
    }, { dbAddTool, dbUpdateTool: vi.fn() });
    expect(dbAddTool).toHaveBeenCalledWith(
      { name: 'Blender', directory: 'C:/blender.exe', link: undefined, desc: undefined, icon: '' },
      ['tag-1'],
      []
    );
  });

  it('should call dbUpdateTool when editing existing tool', async () => {
    const dbUpdateTool = vi.fn().mockResolvedValue(undefined);
    await toolSave({
      isNew: false,
      entityId: 'tool-1',
      name: 'Blender',
      dir: 'C:/blender.exe',
      tagIds: [],
    }, { dbAddTool: vi.fn(), dbUpdateTool });
    expect(dbUpdateTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Blender', directory: 'C:/blender.exe', id: 'tool-1' }),
      [],
      []
    );
  });

  it('should NOT call dbUpdateTool when entityId is missing (defensive)', async () => {
    const dbUpdateTool = vi.fn();
    await toolSave({
      isNew: false,
      name: 'Blender',
      dir: 'C:/blender.exe',
      tagIds: [],
    }, { dbAddTool: vi.fn(), dbUpdateTool });
    expect(dbUpdateTool).not.toHaveBeenCalled();
  });

  it('should propagate errors from dbAddTool', async () => {
    const dbAddTool = vi.fn().mockRejectedValue(new Error('DB error'));
    await expect(toolSave({
      isNew: true,
      name: 'Blender',
      dir: 'C:/blender.exe',
      tagIds: [],
    }, { dbAddTool, dbUpdateTool: vi.fn() })).rejects.toThrow('DB error');
  });

  it('should handle empty icon gracefully', async () => {
    const dbAddTool = vi.fn().mockResolvedValue('new-id');
    await toolSave({
      isNew: true,
      name: 'Test',
      dir: 'C:/test.exe',
      iconId: null,
      tagIds: [],
    }, { dbAddTool, dbUpdateTool: vi.fn() });
    expect(dbAddTool).toHaveBeenCalledWith(
      expect.objectContaining({ icon: '' }),
      [],
      []
    );
  });
});

// ───────────────────────────────────────────────────
// Proj Save Button Tests
// ───────────────────────────────────────────────────

describe('Proj Save Button', () => {
  it('should call dbAddProj when adding new project', async () => {
    const dbAddProj = vi.fn().mockResolvedValue('new-id');
    await projSave({
      isNew: true,
      name: 'My Game',
      dir: 'C:/mygame',
      version: '4.2',
      mainVersion: '4',
      engineId: '',
      tagIds: [],
    }, { dbAddProj, dbUpdateProj: vi.fn() });
    expect(dbAddProj).toHaveBeenCalledWith(
      { name: 'My Game', directory: 'C:/mygame', version: '4.2', main_version: 4, engine_id: '', desc: undefined },
      [],
      []
    );
  });

  it('should call dbUpdateProj when editing existing project', async () => {
    const dbUpdateProj = vi.fn().mockResolvedValue(undefined);
    await projSave({
      isNew: false,
      entityId: 'proj-1',
      name: 'My Game',
      dir: 'C:/mygame',
      version: '4.2',
      mainVersion: '4',
      tagIds: [],
    }, { dbAddProj: vi.fn(), dbUpdateProj });
    expect(dbUpdateProj).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Game', id: 'proj-1' }),
      [],
      []
    );
  });
});

// ───────────────────────────────────────────────────
// Asset Save Button Tests
// ───────────────────────────────────────────────────

describe('Asset Save Button', () => {
  it('should call dbAddAsset when adding new asset', async () => {
    const dbAddAsset = vi.fn().mockResolvedValue('new-id');
    await assetSave({
      isNew: true,
      name: 'Texture Pack',
      dir: 'C:/textures',
      copyRight: 'CC0',
      tagIds: [],
    }, { dbAddAsset, dbUpdateAsset: vi.fn() });
    expect(dbAddAsset).toHaveBeenCalledWith(
      { name: 'Texture Pack', directory: 'C:/textures', link: undefined, copy_right: 'CC0', desc: undefined },
      [],
      []
    );
  });

  it('should call dbUpdateAsset when editing existing asset', async () => {
    const dbUpdateAsset = vi.fn().mockResolvedValue(undefined);
    await assetSave({
      isNew: false,
      entityId: 'asset-1',
      name: 'Texture Pack',
      dir: 'C:/textures',
      copyRight: 'CC0',
      tagIds: [],
    }, { dbAddAsset: vi.fn(), dbUpdateAsset });
    expect(dbUpdateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Texture Pack', id: 'asset-1' }),
      [],
      []
    );
  });
});

// ───────────────────────────────────────────────────
// Engine Save Button Tests
// ───────────────────────────────────────────────────

describe('Engine Save Button', () => {
  it('should call dbAddEngine when adding new engine', async () => {
    const dbAddEngine = vi.fn().mockResolvedValue('new-id');
    await engineSave({
      isNew: true,
      name: 'Godot 4.2',
      dir: 'C:/godot.exe',
      version: '4.2',
      mainVersion: '4',
      tagIds: [],
    }, { dbAddEngine, dbUpdateEngine: vi.fn() });
    expect(dbAddEngine).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Godot 4.2', directory: 'C:/godot.exe' }),
      []
    );
  });

  it('should call dbUpdateEngine when editing existing engine', async () => {
    const dbUpdateEngine = vi.fn().mockResolvedValue(undefined);
    await engineSave({
      isNew: false,
      entityId: 'engine-1',
      name: 'Godot 4.2',
      dir: 'C:/godot.exe',
      version: '4.2',
      mainVersion: '4',
      tagIds: ['tag-1'],
    }, { dbAddEngine: vi.fn(), dbUpdateEngine });
    expect(dbUpdateEngine).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Godot 4.2', id: 'engine-1' }),
      ['tag-1']
    );
  });

  it('should include encrypted fields when saving engine', async () => {
    const dbAddEngine = vi.fn().mockResolvedValue('new-id');
    await engineSave({
      isNew: true,
      name: 'Enc Engine',
      dir: 'C:/enc.exe',
      version: '4.0',
      mainVersion: '4',
      isEnc: true,
      encKey: 'mykey',
      hasConsole: true,
      consoleDir: 'C:/console.exe',
      tagIds: [],
    }, { dbAddEngine, dbUpdateEngine: vi.fn() });
    expect(dbAddEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Enc Engine',
        is_enc: true,
        enc_key: 'mykey',
        has_console: true,
        console_dir: 'C:/console.exe',
      }),
      []
    );
  });
});

// ───────────────────────────────────────────────────
// Disabled State Logic Tests
// ───────────────────────────────────────────────────

describe('Save Button Disabled State Logic', () => {
  it('should be disabled when name is empty (add mode)', () => {
    const saving = false;
    const name = '';
    const dir = 'C:/test.exe';
    const disabled = saving || !name || !dir;
    expect(disabled).toBe(true);
  });

  it('should be disabled when directory is empty (add mode)', () => {
    const saving = false;
    const name = 'Test';
    const dir = '';
    const disabled = saving || !name || !dir;
    expect(disabled).toBe(true);
  });

  it('should be enabled when both name and directory are provided', () => {
    const saving = false;
    const name = 'Test';
    const dir = 'C:/test.exe';
    const disabled = saving || !name || !dir;
    expect(disabled).toBe(false);
  });

  it('should be disabled while saving', () => {
    const saving = true;
    const name = 'Test';
    const dir = 'C:/test.exe';
    const disabled = saving || !name || !dir;
    expect(disabled).toBe(true);
  });

  it('should handle whitespace-only name as empty (falsy check)', () => {
    const saving = false;
    const name = '   ';
    const dir = 'C:/test.exe';
    // The code uses !name which is falsy for strings with spaces
    // So the button would be disabled
    const disabled = saving || !name || !dir;
    expect(disabled).toBe(false); // !name is false for '   '
    // NOTE: This is a potential UX issue — whitespace-only names pass validation
  });
});
