(function() {
  let callbackCounter = 0;
  const callbacks = {};

  const defaultEngines = [
    { entity: { id: 'eng-1', name: 'Godot 4.2', version: '4.2', directory: 'C:/godot/4.2/godot.exe', main_version: 4, has_console: false, console_dir: '', is_enc: false, enc_key: '', is_default: true, desc: 'Stable', sort: 0, is_delete: false }, tags: [], images: [] },
    { entity: { id: 'eng-2', name: 'Godot 4.3', version: '4.3', directory: 'C:/godot/4.3/godot.exe', main_version: 4, has_console: true, console_dir: 'C:/godot/4.3/godot_console.exe', is_enc: false, enc_key: '', is_default: false, desc: 'Latest', sort: 1, is_delete: false }, tags: [], images: [] },
    { entity: { id: 'eng-3', name: 'Godot 3.5', version: '3.5', directory: 'C:/godot/3.5/godot.exe', main_version: 3, has_console: false, console_dir: '', is_enc: true, enc_key: 'abc123', is_default: false, desc: 'Legacy', sort: 2, is_delete: false }, tags: [], images: [] }
  ];

  const defaultProjs = [
    { entity: { id: 'proj-1', name: 'My Game', version: '4.2', directory: 'C:/projects/my-game', main_version: 4, engine_id: 'eng-1', desc: 'A great game', sort: 0, is_delete: false, icon: '', star: true }, tags: [], images: [] },
    { entity: { id: 'proj-2', name: 'Test Project', version: '4.3', directory: 'C:/projects/test', main_version: 4, engine_id: '', desc: '', sort: 1, is_delete: false, icon: '', star: false }, tags: [], images: [] }
  ];

  const defaultAssets = [
    { entity: { id: 'ast-1', name: 'Pixel Font', directory: 'C:/assets/fonts/pixel', link: '', copy_right: 'MIT', desc: '', sort: 0, is_delete: false, star: false }, tags: [], images: [] },
    { entity: { id: 'ast-2', name: 'Terrain Pack', directory: 'C:/assets/terrains', link: 'https://example.com', copy_right: 'CC0', desc: 'Terrain textures', sort: 1, is_delete: false, star: true }, tags: [], images: [] }
  ];

  const defaultTools = [
    { entity: { id: 'tl-1', name: 'Aseprite', directory: 'C:/tools/aseprite/aseprite.exe', link: '', desc: 'Pixel art editor', sort: 0, is_delete: false, icon: '', star: false }, tags: [], images: [] },
    { entity: { id: 'tl-2', name: 'Blender', directory: 'C:/tools/blender/blender.exe', link: '', desc: '3D modeling', sort: 1, is_delete: false, icon: '', star: true }, tags: [], images: [] }
  ];

  const defaultDiaries = [
    { id: 'd-1', name: '开发日志', desc: '日常开发记录', proj_id: '', sort: 0, is_delete: false },
    { id: 'd-2', name: '学习笔记', desc: 'Godot 学习', proj_id: '', sort: 1, is_delete: false }
  ];

  window.__TAURI_INTERNALS__ = {
    invoke: async function(cmd, args) {
      switch (cmd) {
        case 'get_settings':
          return { language: 'zh_CN', default_panel: 'Engine', screen_shot_dir: '', bubble_opacity: 0.85, bubble_size: 110, snap_threshold: 20, remember_position: false, last_snap_edge: 'Right' };
        case 'save_settings':
          return args.newSettings;
        case 'get_window_mode':
          return 'panel';
        case 'set_window_mode':
          return;
        case 'resize_window':
          return;
        case 'start_dragging':
          return;
        case 'snap_to_edge':
          return { x: 0, y: 0, edge: 'Right' };
        case 'get_screen_work_area':
          return { x: 0, y: 0, width: 1920, height: 1080 };
        case 'db_list_engines':
          return { items: defaultEngines, total: defaultEngines.length };
        case 'db_list_all_engines':
          return defaultEngines;
        case 'db_search_engines':
          return { items: defaultEngines.slice(0, 1), total: 1 };
        case 'db_add_engine':
          return 'mock-engine-id-' + Date.now();
        case 'db_update_engine':
          return;
        case 'db_delete_engine':
          return;
        case 'db_get_engine_by_id':
          return null;
        case 'db_list_projs':
          return { items: defaultProjs, total: defaultProjs.length };
        case 'db_list_all_projs':
          return defaultProjs;
        case 'db_search_projs':
          return { items: defaultProjs.slice(0, 1), total: 1 };
        case 'db_add_proj':
          return 'mock-proj-id-' + Date.now();
        case 'db_update_proj':
          return;
        case 'db_delete_proj':
          return;
        case 'db_toggle_proj_star':
          return;
        case 'db_list_assets':
          return { items: defaultAssets, total: defaultAssets.length };
        case 'db_list_all_assets':
          return defaultAssets;
        case 'db_search_assets':
          return { items: defaultAssets.slice(0, 1), total: 1 };
        case 'db_add_asset':
          return 'mock-asset-id-' + Date.now();
        case 'db_update_asset':
          return;
        case 'db_delete_asset':
          return;
        case 'db_toggle_asset_star':
          return;
        case 'db_list_tools':
          return { items: defaultTools, total: defaultTools.length };
        case 'db_list_all_tools':
          return defaultTools;
        case 'db_search_tools':
          return { items: defaultTools.slice(0, 1), total: 1 };
        case 'db_add_tool':
          return 'mock-tool-id-' + Date.now();
        case 'db_update_tool':
          return;
        case 'db_delete_tool':
          return;
        case 'db_toggle_tool_star':
          return;
        case 'db_list_diaries':
          return defaultDiaries;
        case 'db_add_diary':
          return 'mock-diary-id-' + Date.now();
        case 'db_update_diary':
          return;
        case 'db_delete_diary':
          return;
        case 'db_get_diary_detail':
          return null;
        case 'db_save_diary_detail':
          return 'mock-detail-id-' + Date.now();
        case 'db_query_diary_details':
          return [];
        case 'db_query_all_diary_details':
          return [];
        case 'db_list_tags':
          return [];
        case 'db_query_tag_by_name_like':
          return [];
        case 'db_insert_tag':
          return { id: 'mock-tag-id-' + Date.now(), name: args.name, color: args.color, type: args.type, sub_type: args.sub_type, is_fast: false };
        case 'db_set_fast_tag':
          return;
        case 'db_update_tag_color':
          return;
        case 'db_delete_tag':
          return;
        case 'db_copy_image_to_cache':
          return { id: 'mock-img-id-' + Date.now(), width: 100, height: 100, format: 'png', path: args.srcPath, new_path: args.srcPath };
        case 'db_load_image':
          return null;
        case 'db_load_icon':
          return null;
        case 'db_extract_exe_icon':
          return { id: 'mock-icon-id-' + Date.now(), width: 64, height: 64, format: 'png', path: args.exePath, new_path: args.exePath };
        case 'open_folder':
          if (!args.path || args.path.trim() === '') return Promise.reject('path is empty');
          return;
        case 'launch_app':
          return;
        case 'launch_project':
          return;
        case 'detect_engine_version':
          return ['4', '4.2', 'stable'];
        case 'scan_project_file':
          return { name: 'TestProject', version: '4.2', main_version: '4', icon_path: '', real_icon_path: '' };
        case 'db_scan_projects':
          return 5;
        case 'db_import_from_path':
          return JSON.stringify({ engines: 1, projs: 2, assets: 1, tools: 1, diaries: 0, tags: 5 });
        case 'open_settings_window':
          return;
        case 'toggle_panel':
          return;
        default:
          return;
      }
    },
    transformCallback: function(callback, once) {
      const id = ++callbackCounter;
      callbacks[id] = callback;
      return id;
    },
    unregisterCallback: function(id) {
      delete callbacks[id];
    },
    convertFileSrc: function(filePath) {
      return filePath;
    }
  };
  window.isTauri = true;
})();
