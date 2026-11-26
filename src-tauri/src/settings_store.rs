use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;
use crate::edge_snap::SnapEdge;

/// Application settings stored as JSON
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default = "default_panel")]
    pub default_panel: String,
    #[serde(default)]
    pub screen_shot_dir: String,
    #[serde(default = "default_opacity")]
    pub bubble_opacity: f64,
    #[serde(default = "default_size")]
    pub bubble_size: i64,
    #[serde(default = "default_bubble_display_mode")]
    pub bubble_display_mode: String,
    #[serde(default = "default_threshold")]
    pub snap_threshold: i64,
    #[serde(default)]
    pub remember_position: bool,
    #[serde(default)]
    pub auto_start: bool,
    pub last_ball_x: Option<i64>,
    pub last_ball_y: Option<i64>,
    #[serde(default = "default_edge")]
    pub last_snap_edge: String,
    #[serde(default)]
    pub diary_sidebar_collapsed: bool,
    #[serde(default)]
    pub diary_selected_id: String,
    #[serde(default)]
    pub diary_selected_date: String,
    #[serde(default)]
    pub diary_cursor_pos: i64,
}

fn default_language() -> String { "zh_CN".to_string() }
fn default_panel() -> String { "Engine".to_string() }
fn default_opacity() -> f64 { 0.85 }
fn default_size() -> i64 { 110 }
fn default_bubble_display_mode() -> String { "both".to_string() }
fn default_threshold() -> i64 { 30 }
fn default_edge() -> String { "None".to_string() }

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: default_language(),
            default_panel: default_panel(),
            screen_shot_dir: String::new(),
            bubble_opacity: default_opacity(),
            bubble_size: default_size(),
            bubble_display_mode: default_bubble_display_mode(),
            snap_threshold: default_threshold(),
            remember_position: false,
            auto_start: false,
            last_ball_x: None,
            last_ball_y: None,
            last_snap_edge: default_edge(),
            diary_sidebar_collapsed: false,
            diary_selected_id: String::new(),
            diary_selected_date: String::new(),
            diary_cursor_pos: 0,
        }
    }
}

/// Manages persistent settings via JSON file
pub struct SettingsStore {
    path: PathBuf,
    settings: std::sync::Mutex<Settings>,
}

impl SettingsStore {
    pub fn new(app: AppHandle) -> Self {
        let data_dir = app.path().app_data_dir().expect("app data dir");
        let path = data_dir.join("settings.json");

        let settings = if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|content| serde_json::from_str(&content).ok())
                .unwrap_or_default()
        } else {
            Settings::default()
        };

        // Ensure file exists
        if !path.exists() {
            if let Ok(json) = serde_json::to_string_pretty(&settings) {
                let _ = fs::write(&path, json);
            }
        }

        Self {
            path,
            settings: std::sync::Mutex::new(settings),
        }
    }

    pub fn get(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }

    pub fn update(&self, mut new: Settings) -> Result<Settings, String> {
        let mut current = self.settings.lock().map_err(|e| e.to_string())?;
        new.last_ball_x = current.last_ball_x;
        new.last_ball_y = current.last_ball_y;
        new.last_snap_edge.clone_from(&current.last_snap_edge);
        self.write(&new)?;
        *current = new.clone();
        Ok(new)
    }

    pub fn update_ball_placement(&self, x: i32, y: i32, edge: SnapEdge) -> Result<(), String> {
        let mut current = self.settings.lock().map_err(|e| e.to_string())?;
        current.last_ball_x = Some(i64::from(x));
        current.last_ball_y = Some(i64::from(y));
        current.last_snap_edge = edge.to_string();
        self.write(&current)
    }

    fn write(&self, settings: &Settings) -> Result<(), String> {
        let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
        fs::write(&self.path, json).map_err(|e| e.to_string())
    }
}
