use std::fs;
use tauri::Manager;
use tauri::Emitter;

pub mod window;
pub mod edge_snap;
pub mod settings_store;
pub mod database;

use settings_store::SettingsStore;

// ─── Tauri Commands ───

// ═══════════════════ Engine Commands ═══════════════════

#[tauri::command]
fn db_list_engines(app: tauri::AppHandle, page: Option<database::Page>) -> Result<database::SearchResult<database::Engine>, String> {
    let db = database::Database::new(&app)?;
    db.list_engines(page.as_ref())
}

#[tauri::command]
fn db_list_all_engines(app: tauri::AppHandle) -> Result<Vec<database::EntityWithExtras<database::Engine>>, String> {
    let db = database::Database::new(&app)?;
    db.list_all_engines()
}

#[tauri::command]
fn db_search_engines(app: tauri::AppHandle, search: String, tag_ids: Vec<String>, page: Option<database::Page>) -> Result<database::SearchResult<database::Engine>, String> {
    let db = database::Database::new(&app)?;
    db.search_engines(&search, &tag_ids, page.as_ref())
}

#[tauri::command]
fn db_add_engine(app: tauri::AppHandle, engine: database::Engine, tag_ids: Vec<String>) -> Result<String, String> {
    let db = database::Database::new(&app)?;
    db.add_engine(&engine, &tag_ids)
}

#[tauri::command]
fn db_update_engine(app: tauri::AppHandle, engine: database::Engine, tag_ids: Vec<String>) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.update_engine(&engine, &tag_ids)
}

#[tauri::command]
fn db_delete_engine(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.delete_engine(&id)
}

#[tauri::command]
fn db_get_engine_by_id(app: tauri::AppHandle, id: String) -> Result<database::Engine, String> {
    let db = database::Database::new(&app)?;
    db.get_engine_by_id(&id)
}

// ═══════════════════ Proj Commands ═══════════════════

#[tauri::command]
fn db_list_projs(app: tauri::AppHandle, page: Option<database::Page>) -> Result<database::SearchResult<database::Proj>, String> {
    let db = database::Database::new(&app)?;
    db.list_projs(page.as_ref())
}

#[tauri::command]
fn db_list_all_projs(app: tauri::AppHandle) -> Result<Vec<database::EntityWithExtras<database::Proj>>, String> {
    let db = database::Database::new(&app)?;
    db.list_all_projs()
}

#[tauri::command]
fn db_search_projs(app: tauri::AppHandle, search: String, tag_ids: Vec<String>, page: Option<database::Page>) -> Result<database::SearchResult<database::Proj>, String> {
    let db = database::Database::new(&app)?;
    db.search_projs(&search, &tag_ids, page.as_ref())
}

#[tauri::command]
fn db_add_proj(app: tauri::AppHandle, proj: database::Proj, tag_ids: Vec<String>, image_paths: Vec<String>) -> Result<String, String> {
    let db = database::Database::new(&app)?;
    db.add_proj(&proj, &tag_ids, &image_paths)
}

#[tauri::command]
fn db_update_proj(app: tauri::AppHandle, proj: database::Proj, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.update_proj(&proj, &tag_ids, &image_ids)
}

#[tauri::command]
fn db_delete_proj(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.delete_proj(&id)
}

#[tauri::command]
fn db_toggle_proj_star(app: tauri::AppHandle, id: String, star: bool) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.toggle_proj_star(&id, star)
}

#[tauri::command]
fn db_scan_projects(app: tauri::AppHandle, dir: String) -> Result<i32, String> {
    let db = database::Database::new(&app)?;
    db.scan_projects(&dir)
}

// ═══════════════════ Asset Commands ═══════════════════

#[tauri::command]
fn db_list_assets(app: tauri::AppHandle, page: Option<database::Page>) -> Result<database::SearchResult<database::Asset>, String> {
    let db = database::Database::new(&app)?;
    db.list_assets(page.as_ref())
}

#[tauri::command]
fn db_list_all_assets(app: tauri::AppHandle) -> Result<Vec<database::EntityWithExtras<database::Asset>>, String> {
    let db = database::Database::new(&app)?;
    db.list_all_assets()
}

#[tauri::command]
fn db_search_assets(app: tauri::AppHandle, search: String, tag_ids: Vec<String>, page: Option<database::Page>) -> Result<database::SearchResult<database::Asset>, String> {
    let db = database::Database::new(&app)?;
    db.search_assets(&search, &tag_ids, page.as_ref())
}

#[tauri::command]
fn db_add_asset(app: tauri::AppHandle, asset: database::Asset, tag_ids: Vec<String>, image_paths: Vec<String>) -> Result<String, String> {
    let db = database::Database::new(&app)?;
    db.add_asset(&asset, &tag_ids, &image_paths)
}

#[tauri::command]
fn db_update_asset(app: tauri::AppHandle, asset: database::Asset, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.update_asset(&asset, &tag_ids, &image_ids)
}

#[tauri::command]
fn db_delete_asset(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.delete_asset(&id)
}

#[tauri::command]
fn db_toggle_asset_star(app: tauri::AppHandle, id: String, star: bool) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.toggle_asset_star(&id, star)
}

// ═══════════════════ Tool Commands ═══════════════════

#[tauri::command]
fn db_list_tools(app: tauri::AppHandle, page: Option<database::Page>) -> Result<database::SearchResult<database::Tool>, String> {
    let db = database::Database::new(&app)?;
    db.list_tools(page.as_ref())
}

#[tauri::command]
fn db_list_all_tools(app: tauri::AppHandle) -> Result<Vec<database::EntityWithExtras<database::Tool>>, String> {
    let db = database::Database::new(&app)?;
    db.list_all_tools()
}

#[tauri::command]
fn db_search_tools(app: tauri::AppHandle, search: String, tag_ids: Vec<String>, page: Option<database::Page>) -> Result<database::SearchResult<database::Tool>, String> {
    let db = database::Database::new(&app)?;
    db.search_tools(&search, &tag_ids, page.as_ref())
}

#[tauri::command]
fn db_add_tool(app: tauri::AppHandle, tool: database::Tool, tag_ids: Vec<String>, image_paths: Vec<String>) -> Result<String, String> {
    let db = database::Database::new(&app)?;
    db.add_tool(&tool, &tag_ids, &image_paths)
}

#[tauri::command]
fn db_update_tool(app: tauri::AppHandle, tool: database::Tool, tag_ids: Vec<String>, image_ids: Vec<String>) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.update_tool(&tool, &tag_ids, &image_ids)
}

#[tauri::command]
fn db_delete_tool(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.delete_tool(&id)
}

#[tauri::command]
fn db_toggle_tool_star(app: tauri::AppHandle, id: String, star: bool) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.toggle_tool_star(&id, star)
}

// ═══════════════════ Diary Commands ═══════════════════

#[tauri::command]
fn db_list_diaries(app: tauri::AppHandle) -> Result<Vec<database::Diary>, String> {
    let db = database::Database::new(&app)?;
    db.list_diaries()
}

#[tauri::command]
fn db_add_diary(app: tauri::AppHandle, diary: database::Diary) -> Result<String, String> {
    let db = database::Database::new(&app)?;
    db.add_diary(&diary)
}

#[tauri::command]
fn db_update_diary(app: tauri::AppHandle, diary: database::Diary) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.update_diary(&diary)
}

#[tauri::command]
fn db_delete_diary(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.delete_diary(&id)
}

#[tauri::command]
fn db_get_diary_detail(app: tauri::AppHandle, diary_id: String, create_date: String) -> Result<Option<database::DiaryDetail>, String> {
    let db = database::Database::new(&app)?;
    db.get_diary_detail(&diary_id, &create_date)
}

#[tauri::command]
fn db_save_diary_detail(app: tauri::AppHandle, detail: database::DiaryDetail) -> Result<String, String> {
    let db = database::Database::new(&app)?;
    db.save_diary_detail(&detail)
}

#[tauri::command]
fn db_query_diary_details(app: tauri::AppHandle, diary_id: String, year: i32) -> Result<Vec<database::DiaryDetail>, String> {
    let db = database::Database::new(&app)?;
    db.query_diary_details(&diary_id, year)
}

#[tauri::command]
fn db_query_all_diary_details(app: tauri::AppHandle, diary_id: String) -> Result<Vec<database::DiaryDetail>, String> {
    let db = database::Database::new(&app)?;
    db.query_all_diary_details(&diary_id)
}

// ═══════════════════ Tag Commands ═══════════════════

#[tauri::command]
fn db_list_tags(app: tauri::AppHandle, r#type: i32, sub_type: i32) -> Result<Vec<database::Tag>, String> {
    let db = database::Database::new(&app)?;
    db.list_tags(r#type, sub_type)
}

#[tauri::command]
fn db_query_tag_by_name_like(app: tauri::AppHandle, text: String, r#type: i32, sub_type: i32) -> Result<Vec<database::Tag>, String> {
    let db = database::Database::new(&app)?;
    db.query_tag_by_name_like(&text, r#type, sub_type)
}

#[tauri::command]
fn db_insert_tag(app: tauri::AppHandle, name: String, color: String, r#type: i32, sub_type: i32) -> Result<database::Tag, String> {
    let db = database::Database::new(&app)?;
    db.insert_tag(&name, &color, r#type, sub_type)
}

#[tauri::command]
fn db_set_fast_tag(app: tauri::AppHandle, id: String, is_fast: bool) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.set_fast_tag(&id, is_fast)
}

#[tauri::command]
fn db_update_tag_color(app: tauri::AppHandle, id: String, color: String) -> Result<(), String> {
    let db = database::Database::new(&app)?;
    db.update_tag_color(&id, &color)
}

// ═══════════════════ Image Commands ═══════════════════

#[tauri::command]
fn db_copy_image_to_cache(app: tauri::AppHandle, src_path: String) -> Result<database::ImageRecord, String> {
    let db = database::Database::new(&app)?;
    db.copy_to_cache(&src_path)
}

#[tauri::command]
fn db_load_image(app: tauri::AppHandle, id: String) -> Result<Option<String>, String> {
    let db = database::Database::new(&app)?;
    db.load_image_base64(&id)
}

#[tauri::command]
fn db_load_icon(app: tauri::AppHandle, icon_path: String, base_dir: String, entity_id: String, entity_type: i32) -> Result<Option<String>, String> {
    let db = database::Database::new(&app)?;
    db.load_entity_icon(&icon_path, &base_dir, &entity_id, entity_type)
}

// ═══════════════════ Settings Commands ═══════════════════

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<settings_store::Settings, String> {
    let settings = app.state::<SettingsStore>();
    Ok(settings.get())
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, new_settings: settings_store::Settings) -> Result<settings_store::Settings, String> {
    let settings = app.state::<SettingsStore>();
    settings.update(new_settings)
}

// ═══════════════════ Window Commands ═══════════════════

#[tauri::command]
fn set_window_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let settings = app.state::<SettingsStore>();
        let snap_edge = settings.get().last_snap_edge.clone();
        window::set_mode(&window, &mode, &snap_edge);
        if mode == "ball" {
            if let Ok(pos) = window.outer_position() {
                let _ = settings.update_ball_position(pos.x, pos.y);
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn get_window_mode() -> Result<String, String> {
    Ok(window::get_mode())
}

#[tauri::command]
fn start_dragging(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("window not found")?;
    window.start_dragging().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn toggle_panel(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let current = window::get_mode();
        let next = if current == "panel" { "ball" } else { "panel" };
        let settings = app.state::<SettingsStore>();
        let snap_edge = settings.get().last_snap_edge.clone();
        window::set_mode(&window, &next, &snap_edge);
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit("window:mode", next);
    }
}

#[tauri::command]
fn resize_window(app: tauri::AppHandle, width: f64, height: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let mode = window::get_mode();
        if mode == "panel" {
            let scale = window.scale_factor().map_err(|e| e.to_string())?;
            let w = (width * scale) as u32;
            let h = (height * scale) as u32;
            let pos = window.outer_position().unwrap_or(tauri::PhysicalPosition { x: 0, y: 0 });
            let size = window.outer_size().unwrap_or(tauri::PhysicalSize { width: 0, height: 0 });
            let right_top_x = pos.x + size.width as i32;
            let new_x = right_top_x - w as i32;
            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: w, height: h }));
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: new_x, y: pos.y }));
        }
    }
    Ok(())
}

#[tauri::command]
fn get_screen_work_area(app: tauri::AppHandle) -> Result<edge_snap::WorkArea, String> {
    if let Some(window) = app.get_webview_window("main") {
        if let Some(monitor) = window.primary_monitor().map_err(|e| e.to_string())? {
            let wa = monitor.work_area();
            return Ok(edge_snap::WorkArea {
                x: wa.position.x, y: wa.position.y,
                width: wa.size.width as i32, height: wa.size.height as i32,
            });
        }
    }
    Ok(edge_snap::WorkArea { x: 0, y: 0, width: 1920, height: 1040 })
}

#[tauri::command]
fn snap_to_edge(app: tauri::AppHandle) -> Result<edge_snap::SnapResult, String> {
    let window = app.get_webview_window("main").ok_or("window not found")?;
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;

    let work_area = get_screen_work_area(app.clone())?;
    let settings = app.state::<SettingsStore>();
    let threshold = settings.get().snap_threshold as i32;

    let result = edge_snap::calculate_snap_position(
        pos.x, pos.y, size.width as i32, size.height as i32, &work_area, threshold,
    );

    if result.edge != edge_snap::SnapEdge::None {
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: result.x, y: result.y,
        }));
    }

    let _ = settings.update_snap_edge(result.edge.to_string());
    Ok(result)
}

// ═══════════════════ Utility Commands ═══════════════════

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
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
    std::process::Command::new(&path)
        .spawn()
        .map_err(|e| format!("Failed to launch '{}': {}", path, e))?;
    Ok(())
}

#[tauri::command]
fn launch_project(engine_path: String, project_dir: String) -> Result<(), String> {
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
    let src = std::path::Path::new(&source_path);
    if !src.exists() {
        return Err(format!("Source DB not found: {}", source_path));
    }

    // Get the destination path in app data dir
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let dest = data_dir.join("GodotMemory.db");

    // Also copy the cache directory if it exists
    let src_cache = src.parent().unwrap_or(src).join("cache");
    if src_cache.exists() {
        let dest_cache = data_dir.join("cache");
        let _ = std::fs::remove_dir_all(&dest_cache);
        copy_dir_recursive(&src_cache, &dest_cache)?;
    }

    // Copy the DB file
    std::fs::copy(&src, &dest).map_err(|e| format!("Failed to copy DB: {}", e))?;

    // Read counts from imported DB
    let conn = rusqlite::Connection::open(&dest).map_err(|e| e.to_string())?;
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
        } else if let Some(_val) = line.strip_prefix("config_version=") {
            // Godot 3 has config_version=4
        } else if let Some(val) = line.strip_prefix("config/icon=\"") {
            icon_path = val.trim_end_matches('"').to_string();
        }
    }

    let mut result = serde_json::Map::new();
    result.insert("name".into(), serde_json::Value::String(name));
    result.insert("version".into(), serde_json::Value::String(version));
    result.insert("main_version".into(), serde_json::Value::String(main_version));
    result.insert("icon_path".into(), serde_json::Value::String(icon_path));

    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Settings")
    .inner_size(360.0, 460.0)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ───────────────────────────── Entry Point ─────────────────────────────

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

            // Build system tray
            let show_hide = tauri::menu::MenuItemBuilder::with_id("show_hide", "显示/隐藏").build(app)?;
            let settings = tauri::menu::MenuItemBuilder::with_id("settings", "设置").build(app)?;
            let quit = tauri::menu::MenuItemBuilder::with_id("quit", "退出").build(app)?;
            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&show_hide)
                .separator()
                .item(&settings)
                .separator()
                .item(&quit)
                .build()?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(tauri::include_image!("./icons/32x32.png"))
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show_hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        "settings" => {
                            let _ = app.emit("open-settings", ());
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
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Window initialization
            if let Some(window) = app.get_webview_window("main") {
                let settings = app.state::<SettingsStore>();
                let s = settings.get();
                let mut use_default = true;
                if s.remember_position {
                    if let (Some(x), Some(y)) = (s.last_ball_x, s.last_ball_y) {
                        if let Ok(Some(monitor)) = window.primary_monitor() {
                            let wa = monitor.work_area();
                            let cx = (x as i32).max(wa.position.x).min(wa.position.x + wa.size.width as i32 - window::BALL_SIZE.0 as i32);
                            let cy = (y as i32).max(wa.position.y).min(wa.position.y + wa.size.height as i32 - window::BALL_SIZE.1 as i32);
                            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: cx, y: cy }));
                            use_default = false;
                        }
                    }
                }
                if use_default {
                    window::position_ball_default(&window);
                }
                let _ = window.set_skip_taskbar(true);
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: window::BALL_SIZE.0, height: window::BALL_SIZE.1,
                }));
                let _ = window.show();
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: window::BALL_SIZE.0, height: window::BALL_SIZE.1,
                }));
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
            db_set_fast_tag, db_update_tag_color,
            db_copy_image_to_cache, db_load_image, db_load_icon,
            get_settings, save_settings,
            set_window_mode, get_window_mode, start_dragging, toggle_panel,
            resize_window, get_screen_work_area, snap_to_edge,
            open_folder, launch_app, launch_project, detect_engine_version, scan_project_file,
            open_settings_window,
            db_import_from_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
