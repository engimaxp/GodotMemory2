use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

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
    #[serde(default = "default_threshold")]
    pub snap_threshold: i64,
    #[serde(default)]
    pub remember_position: bool,
    pub last_ball_x: Option<i64>,
    pub last_ball_y: Option<i64>,
    #[serde(default = "default_edge")]
    pub last_snap_edge: String,
}

fn default_language() -> String { "zh_CN".to_string() }
fn default_panel() -> String { "Engine".to_string() }
fn default_opacity() -> f64 { 0.85 }
fn default_size() -> i64 { 110 }
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
            snap_threshold: default_threshold(),
            remember_position: false,
            last_ball_x: None,
            last_ball_y: None,
            last_snap_edge: default_edge(),
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

    pub fn update(&self, new: Settings) -> Result<Settings, String> {
        {
            let mut s = self.settings.lock().map_err(|e| e.to_string())?;
            *s = new.clone();
        }
        let json = serde_json::to_string_pretty(&new).map_err(|e| e.to_string())?;
        fs::write(&self.path, json).map_err(|e| e.to_string())?;
        Ok(new)
    }

    pub fn update_ball_position(&self, x: i32, y: i32) -> Result<(), String> {
        let mut s = self.settings.lock().map_err(|e| e.to_string())?;
        s.last_ball_x = Some(x as i64);
        s.last_ball_y = Some(y as i64);
        let json = serde_json::to_string_pretty(&*s).map_err(|e| e.to_string())?;
        fs::write(&self.path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_snap_edge(&self, edge: String) -> Result<(), String> {
        let mut s = self.settings.lock().map_err(|e| e.to_string())?;
        s.last_snap_edge = edge;
        let json = serde_json::to_string_pretty(&*s).map_err(|e| e.to_string())?;
        fs::write(&self.path, json).map_err(|e| e.to_string())?;
        Ok(())
    }
}
