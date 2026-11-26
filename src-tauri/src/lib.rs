use std::fs;
use tauri::{Emitter, Manager};

pub mod window;
pub mod edge_snap;
pub mod settings_store;
pub mod database;
pub mod quota;
mod sticky_notes;

use settings_store::SettingsStore;

// ─── Tauri Commands ───

// ═══════════════════ Engine Commands ═══════════════════

#[tauri::command]
fn db_list_engines(db: tauri::State<'_, database::DatabaseStore>, page: Option<database::Page>) -> Result<database::SearchResult<database::Engine>, String> {
    db.with(|db| db.list_engines(page.as_ref()))
}

#[tauri::command]
fn db_list_all_engines(db: tauri::State<'_, database::DatabaseStore>) -> Result<Vec<database::EntityWithExtras<database::Engine>>, String> {
    db.with(|db| db.list_all_engines())
}

#[tauri::command]
fn db_search_engines(db: tauri::State<'_, database::DatabaseStore>, search: String, tag_ids: Vec<String>, page: Option<database::Page>) -> Result<database::SearchResult<database::Engine>, String> {
    db.with(|db| db.search_engines(&search, &tag_ids, page.as_ref()))
}

#[tauri::command]
fn db_add_engine(db: tauri::State<'_, database::DatabaseStore>, engine: database::Engine, tag_ids: Vec<String>) -> Result<String, String> {
    db.with(|db| db.add_engine(&engine, &tag_ids))
}

#[tauri::command]
fn db_update_engine(db: tauri::State<'_, database::DatabaseStore>, engine: database::Engine, tag_ids: Vec<String>) -> Result<(), String> {
    db.with(|db| db.update_engine(&engine, &tag_ids))
}

#[tauri::command]
fn db_delete_engine(db: tauri::State<'_, database::DatabaseStore>, id: String) -> Result<(), String> {
    db.with(|db| db.delete_engine(&id))
}

#[tauri::command]
fn db_get_engine_by_id(db: tauri::State<'_, database::DatabaseStore>, id: String) -> Result<database::Engine, String> {
    db.with(|db| db.get_engine_by_id(&id))
}

// ═══════════════════ Proj Commands ═══════════════════

#[tauri::command]
fn db_list_projs(db: tauri::State<'_, database::DatabaseStore>, page: Option<database::Page>) -> Result<database::SearchResult<database::Proj>, String> {
    db.with(|db| db.list_projs(page.as_ref()))
}

#[tauri::command]
fn db_list_all_projs(db: tauri::State<'_, database::DatabaseStore>) -> Result<Vec<database::EntityWithExtras<database::Proj>>, String> {
    db.with(|db| db.list_all_projs())
}

#[tauri::command]
fn db_search_projs(db: tauri::State<'_, database::DatabaseStore>, search: String, tag_ids: Vec<String>, page: Option<database::Page>) -> Result<database::SearchResult<database::Proj>, String> {
    db.with(|db| db.search_projs(&search, &tag_ids, page.as_ref()))
}

#[tauri::command]
fn db_add_proj(db: tauri::State<'_, database::DatabaseStore>, proj: database::Proj, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<String, String> {
    db.with(|db| db.add_proj(&proj, &tag_ids, &image_ids))
}

#[tauri::command]
fn db_update_proj(db: tauri::State<'_, database::DatabaseStore>, proj: database::Proj, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<(), String> {
    db.with(|db| db.update_proj(&proj, &tag_ids, &image_ids))
}

#[tauri::command]
fn db_delete_proj(db: tauri::State<'_, database::DatabaseStore>, id: String) -> Result<(), String> {
    db.with(|db| db.delete_proj(&id))
}

#[tauri::command]
fn db_toggle_proj_star(db: tauri::State<'_, database::DatabaseStore>, id: String, star: bool) -> Result<(), String> {
    db.with(|db| db.toggle_proj_star(&id, star))
}

#[tauri::command]
fn db_scan_projects(db: tauri::State<'_, database::DatabaseStore>, dir: String) -> Result<i32, String> {
    db.with(|db| db.scan_projects(&dir))
}

// ═══════════════════ Asset Commands ═══════════════════

#[tauri::command]
fn db_list_assets(db: tauri::State<'_, database::DatabaseStore>, page: Option<database::Page>) -> Result<database::SearchResult<database::Asset>, String> {
    db.with(|db| db.list_assets(page.as_ref()))
}

#[tauri::command]
fn db_list_all_assets(db: tauri::State<'_, database::DatabaseStore>) -> Result<Vec<database::EntityWithExtras<database::Asset>>, String> {
    db.with(|db| db.list_all_assets())
}

#[tauri::command]
fn db_search_assets(db: tauri::State<'_, database::DatabaseStore>, search: String, tag_ids: Vec<String>, page: Option<database::Page>) -> Result<database::SearchResult<database::Asset>, String> {
    db.with(|db| db.search_assets(&search, &tag_ids, page.as_ref()))
}

#[tauri::command]
fn db_add_asset(db: tauri::State<'_, database::DatabaseStore>, asset: database::Asset, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<String, String> {
    db.with(|db| db.add_asset(&asset, &tag_ids, &image_ids))
}

#[tauri::command]
fn db_update_asset(db: tauri::State<'_, database::DatabaseStore>, asset: database::Asset, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<(), String> {
    db.with(|db| db.update_asset(&asset, &tag_ids, &image_ids))
}

#[tauri::command]
fn db_delete_asset(db: tauri::State<'_, database::DatabaseStore>, id: String) -> Result<(), String> {
    db.with(|db| db.delete_asset(&id))
}

#[tauri::command]
fn db_toggle_asset_star(db: tauri::State<'_, database::DatabaseStore>, id: String, star: bool) -> Result<(), String> {
    db.with(|db| db.toggle_asset_star(&id, star))
}

// ═══════════════════ Tool Commands ═══════════════════

#[tauri::command]
fn db_list_tools(db: tauri::State<'_, database::DatabaseStore>, page: Option<database::Page>) -> Result<database::SearchResult<database::Tool>, String> {
    db.with(|db| db.list_tools(page.as_ref()))
}

#[tauri::command]
fn db_list_all_tools(db: tauri::State<'_, database::DatabaseStore>) -> Result<Vec<database::EntityWithExtras<database::Tool>>, String> {
    db.with(|db| db.list_all_tools())
}

#[tauri::command]
fn db_search_tools(db: tauri::State<'_, database::DatabaseStore>, search: String, tag_ids: Vec<String>, page: Option<database::Page>) -> Result<database::SearchResult<database::Tool>, String> {
    db.with(|db| db.search_tools(&search, &tag_ids, page.as_ref()))
}

#[tauri::command]
fn db_add_tool(db: tauri::State<'_, database::DatabaseStore>, tool: database::Tool, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<String, String> {
    db.with(|db| db.add_tool(&tool, &tag_ids, &image_ids))
}

#[tauri::command]
fn db_update_tool(db: tauri::State<'_, database::DatabaseStore>, tool: database::Tool, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<(), String> {
    db.with(|db| db.update_tool(&tool, &tag_ids, &image_ids))
}

#[tauri::command]
fn db_delete_tool(db: tauri::State<'_, database::DatabaseStore>, id: String) -> Result<(), String> {
    db.with(|db| db.delete_tool(&id))
}

#[tauri::command]
fn db_toggle_tool_star(db: tauri::State<'_, database::DatabaseStore>, id: String, star: bool) -> Result<(), String> {
    db.with(|db| db.toggle_tool_star(&id, star))
}

// ═══════════════════ Diary Commands ═══════════════════

#[tauri::command]
fn db_list_diaries(db: tauri::State<'_, database::DatabaseStore>) -> Result<Vec<database::Diary>, String> {
    db.with(|db| db.list_diaries())
}

#[tauri::command]
fn db_add_diary(db: tauri::State<'_, database::DatabaseStore>, diary: database::Diary) -> Result<String, String> {
    db.with(|db| db.add_diary(&diary))
}

#[tauri::command]
fn db_update_diary(db: tauri::State<'_, database::DatabaseStore>, diary: database::Diary) -> Result<(), String> {
    db.with(|db| db.update_diary(&diary))
}

#[tauri::command]
fn db_delete_diary(db: tauri::State<'_, database::DatabaseStore>, id: String) -> Result<(), String> {
    db.with(|db| db.delete_diary(&id))
}

#[tauri::command]
fn db_get_diary_detail(db: tauri::State<'_, database::DatabaseStore>, diary_id: String, create_date: String) -> Result<Option<database::DiaryDetail>, String> {
    db.with(|db| db.get_diary_detail(&diary_id, &create_date))
}

#[tauri::command]
fn db_save_diary_detail(db: tauri::State<'_, database::DatabaseStore>, detail: database::DiaryDetail) -> Result<String, String> {
    db.with(|db| db.save_diary_detail(&detail))
}

#[tauri::command]
fn db_query_diary_details(db: tauri::State<'_, database::DatabaseStore>, diary_id: String, year: i32) -> Result<Vec<database::DiaryDetail>, String> {
    db.with(|db| db.query_diary_details(&diary_id, year))
}

#[tauri::command]
fn db_query_all_diary_details(db: tauri::State<'_, database::DatabaseStore>, diary_id: String) -> Result<Vec<database::DiaryDetail>, String> {
    db.with(|db| db.query_all_diary_details(&diary_id))
}

// ═══════════════════ Tag Commands ═══════════════════

#[tauri::command]
fn db_list_tags(db: tauri::State<'_, database::DatabaseStore>, r#type: i32, sub_type: i32) -> Result<Vec<database::Tag>, String> {
    db.with(|db| db.list_tags(r#type, sub_type))
}

#[tauri::command]
fn db_query_tag_by_name_like(db: tauri::State<'_, database::DatabaseStore>, text: String, r#type: i32, sub_type: i32) -> Result<Vec<database::Tag>, String> {
    db.with(|db| db.query_tag_by_name_like(&text, r#type, sub_type))
}

#[tauri::command]
fn db_insert_tag(db: tauri::State<'_, database::DatabaseStore>, name: String, color: String, r#type: i32, sub_type: i32) -> Result<database::Tag, String> {
    db.with(|db| db.insert_tag(&name, &color, r#type, sub_type))
}

#[tauri::command]
fn db_set_fast_tag(db: tauri::State<'_, database::DatabaseStore>, id: String, is_fast: bool) -> Result<(), String> {
    db.with(|db| db.set_fast_tag(&id, is_fast))
}

#[tauri::command]
fn db_update_tag_color(db: tauri::State<'_, database::DatabaseStore>, id: String, color: String) -> Result<(), String> {
    db.with(|db| db.update_tag_color(&id, &color))
}

#[tauri::command]
fn db_delete_tag(db: tauri::State<'_, database::DatabaseStore>, id: String) -> Result<(), String> {
    db.with(|db| db.delete_tag(&id))
}

// ═══════════════════ Image Commands ═══════════════════

#[tauri::command]
fn db_copy_image_to_cache(db: tauri::State<'_, database::DatabaseStore>, src_path: String) -> Result<database::ImageRecord, String> {
    db.with(|db| db.copy_to_cache(&src_path))
}

#[tauri::command]
fn db_load_image(db: tauri::State<'_, database::DatabaseStore>, id: String) -> Result<Option<String>, String> {
    db.with(|db| db.load_image_base64(&id))
}

#[tauri::command]
fn db_load_icon(db: tauri::State<'_, database::DatabaseStore>, icon_path: String, base_dir: String, entity_id: String, entity_type: i32) -> Result<Option<String>, String> {
    db.with(|db| db.load_entity_icon(&icon_path, &base_dir, &entity_id, entity_type))
}

#[tauri::command]
fn db_extract_exe_icon(db: tauri::State<'_, database::DatabaseStore>, exe_path: String) -> Result<database::ImageRecord, String> {
    db.with(|db| db.extract_exe_icon(&exe_path))
}

// ═══════════════════ Settings Commands ═══════════════════

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<settings_store::Settings, String> {
    let settings = app.state::<SettingsStore>();
    Ok(settings.get())
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, new_settings: settings_store::Settings) -> Result<settings_store::Settings, String> {
    use tauri_plugin_autostart::ManagerExt;
    {
        let store = app.state::<SettingsStore>();
        let old = store.get();
        if old.auto_start != new_settings.auto_start {
            if new_settings.auto_start {
                app.autolaunch().enable().map_err(|e| e.to_string())?;
            } else {
                app.autolaunch().disable().map_err(|e| e.to_string())?;
            }
        }
    }
    let settings = app.state::<SettingsStore>();
    let updated = settings.update(new_settings)?;
    if let Some(window) = app.get_webview_window("main") {
        let _ = app
            .state::<window::WindowState>()
            .apply_settings(&window, &updated);
    }
    Ok(updated)
}

// ═══════════════════ Quota Commands ═══════════════════

#[tauri::command]
fn get_quota_snapshot(state: tauri::State<'_, quota::QuotaState>) -> Option<quota::QuotaSnapshot> {
    state.get()
}

#[tauri::command]
async fn refresh_quota(app: tauri::AppHandle) -> Result<quota::QuotaSnapshot, String> {
    let snapshot = tauri::async_runtime::spawn_blocking(quota::fetch_all_quotas)
        .await
        .map_err(|e| format!("配额查询任务异常: {e}"))?;
    app.state::<quota::QuotaState>().set(snapshot.clone());
    let _ = app.emit("quota:updated", &snapshot);
    Ok(snapshot)
}

// ═══════════════════ Window Commands ═══════════════════

#[tauri::command]
fn set_window_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("window not found")?;
    let settings = app.state::<SettingsStore>().get();
    app.state::<window::WindowState>().set_mode(&window, &settings, &mode)
}

#[tauri::command]
fn get_window_mode(state: tauri::State<window::WindowState>) -> &'static str {
    state.mode()
}

#[tauri::command]
fn get_bubble_dock(state: tauri::State<window::WindowState>) -> window::BubbleDock {
    state.dock()
}

#[tauri::command]
fn set_bubble_hover(
    window: tauri::WebviewWindow,
    state: tauri::State<window::WindowState>,
    store: tauri::State<SettingsStore>,
    hovered: bool,
) -> Result<(), String> {
    state.set_hover(&window, &store.get(), hovered)
}

#[tauri::command]
fn finish_bubble_tuck(
    window: tauri::WebviewWindow,
    state: tauri::State<window::WindowState>,
    store: tauri::State<SettingsStore>,
    revision: u32,
) -> Result<(), String> {
    state.finish_tuck(&window, &store.get(), revision)
}

#[tauri::command]
fn begin_bubble_drag(
    window: tauri::WebviewWindow,
    state: tauri::State<window::WindowState>,
    grab_x: f64,
    grab_y: f64,
) -> Result<(), String> {
    state.begin_drag(&window, grab_x, grab_y)
}

#[tauri::command]
fn move_bubble_drag(
    window: tauri::WebviewWindow,
    state: tauri::State<window::WindowState>,
    store: tauri::State<SettingsStore>,
) -> Result<(), String> {
    state.move_drag(&window, &store.get())
}

#[tauri::command]
fn end_bubble_drag(
    window: tauri::WebviewWindow,
    state: tauri::State<window::WindowState>,
    store: tauri::State<SettingsStore>,
    moved: bool,
) -> Result<(), String> {
    state.end_drag(&window, &store, moved)
}

#[tauri::command]
fn toggle_panel(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("window not found")?;
    let state = app.state::<window::WindowState>();
    let mode = if state.mode() == "panel" { "ball" } else { "panel" };
    state.set_mode(&window, &app.state::<SettingsStore>().get(), mode)?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

// ═══════════════════ Utility Commands ═══════════════════

fn normalize_path(p: &str) -> String {
    p.replace('\\', "/").trim_matches('"').trim_matches('\'').to_string()
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    let path = normalize_path(&path);
    if path.is_empty() {
        return Err("path is empty".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        let path = path.replace('/', "\\");
        let p = std::path::Path::new(&path);
        if p.is_dir() {
            std::process::Command::new("explorer")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("Failed to open folder '{}': {}", path, e))?;
        } else if p.is_file() {
            std::process::Command::new("explorer")
                .arg("/select,")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("Failed to open folder '{}': {}", path, e))?;
        } else if p.parent().is_some_and(|pp| pp.exists()) {
            std::process::Command::new("explorer")
                .arg("/select,")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("Failed to open folder '{}': {}", path, e))?;
        } else {
            return Err(format!("Path does not exist: {}", path));
        }
    }
    #[cfg(target_os = "macos")]
    {
        let p = std::path::Path::new(&path);
        if p.is_file() {
            if let Some(parent) = p.parent() {
                std::process::Command::new("open")
                    .arg(parent.to_string_lossy().as_ref())
                    .spawn()
                    .map_err(|e| format!("Failed to open folder '{}': {}", path, e))?;
            } else {
                std::process::Command::new("open")
                    .arg(&path)
                    .spawn()
                    .map_err(|e| format!("Failed to open folder '{}': {}", path, e))?;
            }
        } else {
            std::process::Command::new("open")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("Failed to open folder '{}': {}", path, e))?;
        }
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder '{}': {}", path, e))?;
    }
    Ok(())
}

#[tauri::command]
fn launch_app(path: String) -> Result<(), String> {
    let path = normalize_path(&path);
    let mut cmd = std::process::Command::new(&path);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x00000010); // CREATE_NEW_CONSOLE
    }

    cmd.spawn()
        .map_err(|e| format!("Failed to launch '{}': {}", path, e))?;
    Ok(())
}

#[tauri::command]
fn launch_project(engine_path: String, project_dir: String) -> Result<(), String> {
    let engine_path = normalize_path(&engine_path);
    let project_dir = normalize_path(&project_dir);
    std::process::Command::new(&engine_path)
        .arg("-e")
        .arg("--path")
        .arg(&project_dir)
        .spawn()
        .map_err(|e| format!("Failed to launch project: {}", e))?;
    Ok(())
}

/// Import data from old GodotMemory installation (copy the SQLite DB)
/// Returns a JSON with import counts
#[tauri::command]
fn db_import_from_path(app: tauri::AppHandle, source_path: String) -> Result<String, String> {
    app.state::<database::DatabaseStore>().replace(|dir| import_database(dir, &source_path))
}

fn import_database(data_dir: &std::path::Path, source_path: &str) -> Result<String, String> {
    let src = std::path::Path::new(source_path);
    if !src.exists() {
        return Err(format!("Source DB not found: {}", source_path));
    }

    // Get the destination path in app data dir
    let dest = data_dir.join("GodotMemory.db");
    if dest.exists() && src.canonicalize().map_err(|e| e.to_string())? == dest.canonicalize().map_err(|e| e.to_string())? {
        return Err("Source is the current database".into());
    }

    // Copy cached images before switching databases. Cache entries are content-addressed.
    let src_cache = src.parent().unwrap_or(src).join("cache");
    let dest_cache = data_dir.join("cache");
    if src_cache.is_dir() && src_cache.canonicalize().ok() != dest_cache.canonicalize().ok() {
        copy_dir_recursive(&src_cache, &dest_cache)?;
    }

    // Restore a consistent SQLite snapshot, including uncheckpointed WAL data.
    // Another running instance may still have the destination open.
    let mut conn = rusqlite::Connection::open(&dest).map_err(|e| e.to_string())?;
    conn.restore(rusqlite::DatabaseName::Main, src, None::<fn(rusqlite::backup::Progress)>)
        .map_err(|e| format!("Failed to import DB: {e}"))?;

    // Read counts from imported DB
    let counts: Vec<(&str, i64)> = vec![
        ("engines", "Engine"),
        ("projs", "Proj"),
        ("assets", "Asset"),
        ("tools", "Tool"),
        ("diaries", "Diary"),
        ("tags", "Tag"),
    ].into_iter().map(|(key, table)| {
        let count: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM \"{}\" WHERE IsDelete=0", table),
            [],
            |row| row.get(0),
        ).unwrap_or(0);
        (key, count)
    }).collect();

    let result = serde_json::json!({
        "engines": counts[0].1,
        "projs": counts[1].1,
        "assets": counts[2].1,
        "tools": counts[3].1,
        "diaries": counts[4].1,
        "tags": counts[5].1,
    });

    Ok(result.to_string())
}

fn copy_dir_recursive(src: &std::path::Path, dest: &std::path::Path) -> Result<(), String> {
    if !dest.exists() {
        std::fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    }
    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if path.is_dir() {
            copy_dir_recursive(&path, &dest_path)?;
        } else {
            std::fs::copy(&path, &dest_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn detect_engine_version(path: String) -> Result<Vec<String>, String> {
    let output = std::process::Command::new(&path)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to run '{} --version': {}", path, e))?;

    if !output.status.success() {
        return Err("Engine --version failed".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<String> = stdout.split(['.', ' '])
        .filter_map(|s| {
            let s = s.trim();
            if s.parse::<i32>().is_ok() { Some(s.to_string()) } else { None }
        })
        .collect();

    if parts.is_empty() {
        return Err("Could not parse version".to_string());
    }
    Ok(parts)
}

#[tauri::command]
fn scan_project_file(path: String) -> Result<serde_json::Value, String> {
    let config_path = format!("{}/project.godot", path);
    let content = fs::read_to_string(&config_path).map_err(|e| format!("Cannot read project.godot: {}", e))?;

    let mut name = "".to_string();
    let mut version = "".to_string();
    let mut main_version = "".to_string();
    let mut icon_path = "".to_string();
    let mut real_icon_path = "".to_string();

    for line in content.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("config/name=\"") {
            name = val.trim_end_matches('"').to_string();
        } else if let Some(val) = line.strip_prefix("config/features=PackedStringArray(") {
            let feat = val.trim_end_matches(')');
            if feat.contains("4.") {
                main_version = "4".to_string();
                let v: Vec<&str> = feat.split(',').collect();
                if !v.is_empty() {
                    version = v[0].trim().trim_matches('"').to_string();
                }
            }
        } else if let Some(val) = line.strip_prefix("config_version=") {
            let cv: i32 = val.trim().parse().unwrap_or(5);
            if cv == 4 { main_version = "3".to_string(); version = "3.5".to_string(); }
        } else if let Some(val) = line.strip_prefix("config/icon=\"") {
            icon_path = val.trim_end_matches('"').to_string();
            if icon_path.starts_with("res://") {
                real_icon_path = std::path::Path::new(&path).join(&icon_path[6..]).to_string_lossy().to_string();
            } else if !icon_path.is_empty() {
                real_icon_path = std::path::Path::new(&path).join(&icon_path).to_string_lossy().to_string();
            }
        }
    }

    // Also handle Godot 3 fallback: config_version=4, features don't contain "4."
    if main_version.is_empty() {
        main_version = "4".to_string();
        version = "4.0".to_string();
    }

    let mut result = serde_json::Map::new();
    result.insert("name".into(), serde_json::Value::String(name));
    result.insert("version".into(), serde_json::Value::String(version));
    result.insert("main_version".into(), serde_json::Value::String(main_version));
    result.insert("icon_path".into(), serde_json::Value::String(icon_path));
    result.insert("real_icon_path".into(), serde_json::Value::String(real_icon_path));

    Ok(serde_json::Value::Object(result))
}

// ───────────────────────────── Entry Point ─────────────────────────────

fn toggle_main_visibility(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            if window.hide().is_ok() {
                window::set_idle_memory_target(&window, true);
            }
        } else if window.show().is_ok() {
            let idle = app.state::<window::WindowState>().mode() == "ball";
            window::set_idle_memory_target(&window, idle);
            let _ = window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--from-autostart"]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Ensure app data dir exists
            let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

            // Initialize settings store
            let settings_store = SettingsStore::new(app.handle().clone());
            app.manage(settings_store);
            app.manage(database::DatabaseStore::new(data_dir));
            app.manage(window::WindowState::default());
            app.manage(sticky_notes::NoteWindows::default());
            app.manage(quota::QuotaState::default());

            // Build system tray
            let show_hide = tauri::menu::MenuItemBuilder::with_id("show_hide", "显示/隐藏").build(app)?;
            let refresh_quota_item = tauri::menu::MenuItemBuilder::with_id("refresh_quota", "刷新用量").build(app)?;
            let quit = tauri::menu::MenuItemBuilder::with_id("quit", "退出").build(app)?;
            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&show_hide)
                .item(&refresh_quota_item)
                .separator()
                .item(&quit)
                .build()?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(tauri::include_image!("./icons/32x32.png"))
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show_hide" => {
                            toggle_main_visibility(app);
                        }
                        "refresh_quota" => {
                            let _ = app.emit("quota:request-refresh", ());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left, ..
                    } = event {
                        let app = tray.app_handle();
                        toggle_main_visibility(app);
                    }
                })
                .build(app)?;

            // Window initialization
            if let Some(window) = app.get_webview_window("main") {
                let settings = app.state::<SettingsStore>().get();
                app.state::<window::WindowState>().initialize(&window, &settings)?;
                window.show()?;
                window::set_idle_memory_target(&window, true);
            }

            // Windows: remove maximize box
            #[cfg(target_os = "windows")]
            {
                use windows::Win32::Foundation::HWND;
                use windows::Win32::UI::WindowsAndMessaging::{SetWindowLongW, GetWindowLongW, GWL_STYLE};
                use raw_window_handle::HasWindowHandle;

                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(handle) = window.window_handle() {
                        if let raw_window_handle::RawWindowHandle::Win32(w32) = handle.as_raw() {
                            let hwnd = HWND(w32.hwnd.get() as *mut _);
                            let current_style = unsafe { GetWindowLongW(hwnd, GWL_STYLE) };
                            let ws_maximizebox: i32 = 0x00010000;
                            unsafe { SetWindowLongW(hwnd, GWL_STYLE, current_style & !ws_maximizebox); }
                        }
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db_list_engines, db_list_all_engines, db_search_engines,
            db_add_engine, db_update_engine, db_delete_engine, db_get_engine_by_id,
            db_list_projs, db_list_all_projs, db_search_projs,
            db_add_proj, db_update_proj, db_delete_proj, db_toggle_proj_star,
            db_scan_projects,
            db_list_assets, db_list_all_assets, db_search_assets,
            db_add_asset, db_update_asset, db_delete_asset, db_toggle_asset_star,
            db_list_tools, db_list_all_tools, db_search_tools,
            db_add_tool, db_update_tool, db_delete_tool, db_toggle_tool_star,
            db_list_diaries, db_add_diary, db_update_diary, db_delete_diary,
            db_get_diary_detail, db_save_diary_detail, db_query_diary_details, db_query_all_diary_details,
            db_list_tags, db_query_tag_by_name_like, db_insert_tag,
            db_set_fast_tag, db_update_tag_color, db_delete_tag,
            db_copy_image_to_cache, db_load_image, db_load_icon, db_extract_exe_icon,
            get_settings, save_settings,
            get_quota_snapshot, refresh_quota,
            set_window_mode, get_window_mode, get_bubble_dock, set_bubble_hover, toggle_panel,
            finish_bubble_tuck, begin_bubble_drag, move_bubble_drag, end_bubble_drag,
            sticky_notes::list_sticky_notes, sticky_notes::create_sticky_note,
            sticky_notes::get_sticky_note, sticky_notes::save_sticky_note,
            sticky_notes::delete_sticky_note, sticky_notes::open_sticky_note,
            sticky_notes::sticky_note_window_action, sticky_notes::drag_sticky_note,
            open_folder, launch_app, launch_project, detect_engine_version, scan_project_file,
            db_import_from_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
