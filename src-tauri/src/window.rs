use std::sync::Mutex;

use serde::Serialize;
use tauri::{Emitter, Monitor, PhysicalPosition, PhysicalSize, WebviewWindow};

use crate::edge_snap::{calculate_snap_position, SnapEdge, SnapResult, WorkArea};
use crate::settings_store::{Settings, SettingsStore};

const BUBBLE_PADDING: i32 = 28;
// Keep the entire inward-facing outline and shadow of the visible cap.
const EDGE_STRIP_SIZE: i32 = 14 + BUBBLE_PADDING;
const PANEL_SIZE: i32 = 750;

#[derive(Clone, Copy, Default, PartialEq, Serialize)]
pub struct BubbleDock {
    edge: SnapEdge,
    tucked: bool,
    revision: u32,
}

#[derive(Default)]
pub struct WindowState(Mutex<Presentation>);

#[derive(Default)]
struct Presentation {
    panel_open: bool,
    bubble: Option<SnapResult>,
    dock: BubbleDock,
    compact: bool,
    drag_offset: Option<PhysicalPosition<i32>>,
}

impl WindowState {
    pub fn mode(&self) -> &'static str {
        if self.0.lock().unwrap().panel_open {
            "panel"
        } else {
            "ball"
        }
    }

    pub fn dock(&self) -> BubbleDock {
        self.0.lock().unwrap().dock
    }

    pub fn initialize(&self, window: &WebviewWindow, settings: &Settings) -> Result<(), String> {
        let saved_position = if settings.remember_position {
            settings
                .last_ball_x
                .zip(settings.last_ball_y)
                .and_then(|(x, y)| Some((i32::try_from(x).ok()?, i32::try_from(y).ok()?)))
        } else {
            None
        };
        let saved_monitor = if let Some((x, y)) = saved_position {
            window
                .monitor_from_point(f64::from(x), f64::from(y))
                .map_err(to_text)?
        } else {
            None
        };
        let (monitor, saved_position) = if let Some(monitor) = saved_monitor {
            (monitor, saved_position)
        } else {
            let primary = window.primary_monitor().map_err(to_text)?;
            (primary.ok_or("no monitor found")?, None)
        };
        let area = work_area(&monitor);
        let (width, height) = bubble_dimensions(settings, &monitor);
        let bubble = match saved_position {
            Some((x, y)) => {
                let edge = SnapEdge::from(settings.last_snap_edge.as_str());
                let bubble = position_on_monitor(x, y, edge, &area, width, height);
                // Older releases could save a position without a matching edge.
                let distance = (i64::from(x) - i64::from(bubble.x)).abs()
                    + (i64::from(y) - i64::from(bubble.y)).abs();
                if distance > i64::from(width.max(height)) {
                    position_on_monitor(x, y, SnapEdge::None, &area, width, height)
                } else {
                    bubble
                }
            }
            None => {
                let margin = physical(20, &monitor);
                let (x, y) = area.clamp_position(
                    area.x + area.width - width - margin,
                    area.y + area.height - height - margin,
                    width,
                    height,
                );
                SnapResult {
                    x,
                    y,
                    edge: SnapEdge::None,
                }
            }
        };
        self.0
            .lock()
            .unwrap()
            .place_bubble(window, &monitor, settings, bubble, true)
    }

    pub fn apply_settings(&self, window: &WebviewWindow, settings: &Settings) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        if state.panel_open {
            return Ok(());
        }
        let Some(bubble) = state.bubble.clone() else {
            return Ok(());
        };
        let monitor = monitor_at(window, f64::from(bubble.x), f64::from(bubble.y))?;
        let area = work_area(&monitor);
        let (width, height) = bubble_dimensions(settings, &monitor);
        let updated = position_on_monitor(bubble.x, bubble.y, bubble.edge, &area, width, height);
        let compact = state.compact;
        state.place_bubble(window, &monitor, settings, updated, compact)
    }

    pub fn set_mode(
        &self,
        window: &WebviewWindow,
        settings: &Settings,
        mode: &str,
    ) -> Result<(), String> {
        let panel_open = match mode {
            "panel" => true,
            "ball" => false,
            _ => return Err(format!("unknown window mode: {mode}")),
        };
        let mut state = self.0.lock().unwrap();
        if state.panel_open == panel_open {
            return Ok(());
        }

        let bubble = state
            .bubble
            .clone()
            .ok_or("bubble position not initialized")?;
        let monitor = monitor_at(window, f64::from(bubble.x), f64::from(bubble.y))?;
        let area = work_area(&monitor);
        window
            .set_min_size(None::<PhysicalSize<u32>>)
            .map_err(to_text)?;
        if panel_open {
            let size = physical(PANEL_SIZE, &monitor);
            let width = size.min(area.width);
            let height = size.min(area.height);
            let (x, y) = match bubble.edge {
                SnapEdge::Left => (area.x, bubble.y),
                SnapEdge::Right => (area.x + area.width - width, bubble.y),
                SnapEdge::Top => (bubble.x, area.y),
                SnapEdge::Bottom => (bubble.x, area.y + area.height - height),
                SnapEdge::None => (area.x + area.width - width, area.y),
            };
            let (x, y) = area.clamp_position(x, y, width, height);
            window.set_resizable(true).map_err(to_text)?;
            set_bounds(window, x, y, width as u32, height as u32)?;
            let minimum = PhysicalSize::new(
                physical(500, &monitor).min(width) as u32,
                physical(700, &monitor).min(height) as u32,
            );
            window.set_min_size(Some(minimum)).map_err(to_text)?;
        } else {
            window.set_resizable(false).map_err(to_text)?;
            let (width, height) = bubble_dimensions(settings, &monitor);
            let bubble = position_on_monitor(bubble.x, bubble.y, bubble.edge, &area, width, height);
            state.place_bubble(window, &monitor, settings, bubble, true)?;
        }
        state.panel_open = panel_open;
        state.drag_offset = None;
        set_idle_memory_target(window, !panel_open);
        window.emit("window:mode", mode).map_err(to_text)
    }

    pub fn set_hover(
        &self,
        window: &WebviewWindow,
        settings: &Settings,
        hovered: bool,
    ) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        if state.panel_open
            || state.drag_offset.is_some()
            || state.dock.edge == SnapEdge::None
            || state.dock.tucked == !hovered
        {
            return Ok(());
        }
        if hovered && state.compact {
            state.resize_dock(window, settings, false)?;
        }
        let edge = state.dock.edge;
        state.set_dock(window, edge, !hovered);
        Ok(())
    }

    pub fn finish_tuck(
        &self,
        window: &WebviewWindow,
        settings: &Settings,
        revision: u32,
    ) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        if !state.panel_open
            && !state.compact
            && state.dock.tucked
            && state.dock.revision == revision
        {
            state.resize_dock(window, settings, true)?;
        }
        Ok(())
    }

    pub fn begin_drag(
        &self,
        window: &WebviewWindow,
        grab_x: f64,
        grab_y: f64,
    ) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        if !state.panel_open {
            let scale = window.scale_factor().map_err(to_text)?;
            let padding = f64::from(BUBBLE_PADDING);
            state.drag_offset = Some(PhysicalPosition::new(
                ((grab_x + padding) * scale).round() as i32,
                ((grab_y + padding) * scale).round() as i32,
            ));
        }
        Ok(())
    }

    pub fn move_drag(&self, window: &WebviewWindow, settings: &Settings) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        let Some(offset) = state.drag_offset else {
            return Ok(());
        };
        let cursor = window.cursor_position().map_err(to_text)?;
        let x = cursor.x.round() as i32 - offset.x;
        let y = cursor.y.round() as i32 - offset.y;
        if state.compact {
            let monitor = monitor_at(window, cursor.x, cursor.y)?;
            let (width, height) = bubble_dimensions(settings, &monitor);
            set_frameless_bounds(window, x, y, width as u32, height as u32)?;
            state.compact = false;
        } else {
            window
                .set_position(PhysicalPosition::new(x, y))
                .map_err(to_text)?;
        }
        state.set_dock(window, SnapEdge::None, false);
        Ok(())
    }

    pub fn end_drag(
        &self,
        window: &WebviewWindow,
        store: &SettingsStore,
        moved: bool,
    ) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        let Some(offset) = state.drag_offset.take() else {
            return Ok(());
        };
        if !moved {
            return Ok(());
        }
        let settings = store.get();
        let cursor = window.cursor_position().map_err(to_text)?;
        let monitor = monitor_at(window, cursor.x, cursor.y)?;
        let (width, height) = bubble_dimensions(&settings, &monitor);
        let threshold = physical(settings.snap_threshold.clamp(0, 160) as i32, &monitor);
        let bubble = calculate_snap_position(
            cursor.x.round() as i32 - offset.x,
            cursor.y.round() as i32 - offset.y,
            width,
            height,
            &work_area(&monitor),
            threshold,
        );
        let already_tucked = state.dock.tucked && state.dock.edge == bubble.edge;
        state.place_bubble(window, &monitor, &settings, bubble.clone(), already_tucked)?;
        store.update_ball_placement(bubble.x, bubble.y, bubble.edge)
    }
}

impl Presentation {
    fn place_bubble(
        &mut self,
        window: &WebviewWindow,
        monitor: &Monitor,
        settings: &Settings,
        bubble: SnapResult,
        compact: bool,
    ) -> Result<(), String> {
        let edge = bubble.edge;
        self.compact = apply_bubble_bounds(window, monitor, settings, &bubble, compact)?;
        self.bubble = Some(bubble);
        self.set_dock(window, edge, edge != SnapEdge::None);
        Ok(())
    }

    fn resize_dock(
        &mut self,
        window: &WebviewWindow,
        settings: &Settings,
        compact: bool,
    ) -> Result<(), String> {
        let bubble = self
            .bubble
            .as_ref()
            .ok_or("bubble position not initialized")?;
        let monitor = monitor_at(window, f64::from(bubble.x), f64::from(bubble.y))?;
        self.compact = apply_bubble_bounds(window, &monitor, settings, bubble, compact)?;
        Ok(())
    }

    fn set_dock(&mut self, window: &WebviewWindow, edge: SnapEdge, tucked: bool) {
        if self.dock.edge != edge || self.dock.tucked != tucked {
            self.dock = BubbleDock {
                edge,
                tucked,
                revision: self.dock.revision.wrapping_add(1),
            };
            if let Err(error) = window.emit("bubble:dock", self.dock) {
                log::warn!("could not publish bubble dock state: {error}");
            }
        }
    }
}

fn apply_bubble_bounds(
    window: &WebviewWindow,
    monitor: &Monitor,
    settings: &Settings,
    bubble: &SnapResult,
    compact: bool,
) -> Result<bool, String> {
    let (width, height) = bubble_dimensions(settings, monitor);
    let compact = compact && bubble.edge != SnapEdge::None;
    let (x, y, w, h) = if compact {
        bubble.visible_bounds(width, height, physical(EDGE_STRIP_SIZE, monitor))
    } else {
        (bubble.x, bubble.y, width as u32, height as u32)
    };
    set_frameless_bounds(window, x, y, w, h)?;
    Ok(compact)
}

fn bubble_dimensions(settings: &Settings, monitor: &Monitor) -> (i32, i32) {
    let base = settings.bubble_size.clamp(64, 160) as f64;
    let scale = base / 110.0;
    let (logical_w, logical_h) = match settings.bubble_display_mode.as_str() {
        "icon" => (base.round() as i32, base.round() as i32),
        "codex" | "antigravity" => (
            (176.0 * scale).round() as i32,
            (112.0 * scale).round() as i32,
        ),
        _ => (
            (284.0 * scale).round() as i32,
            (112.0 * scale).round() as i32,
        ),
    };
    (
        physical(logical_w + 2 * BUBBLE_PADDING, monitor),
        physical(logical_h + 2 * BUBBLE_PADDING, monitor),
    )
}

pub(crate) fn physical(value: i32, monitor: &Monitor) -> i32 {
    (f64::from(value) * monitor.scale_factor()).round() as i32
}

pub(crate) fn monitor_at(window: &WebviewWindow, x: f64, y: f64) -> Result<Monitor, String> {
    if let Some(monitor) = window.monitor_from_point(x, y).map_err(to_text)? {
        return Ok(monitor);
    }
    if let Some(monitor) = window.current_monitor().map_err(to_text)? {
        return Ok(monitor);
    }
    window
        .primary_monitor()
        .map_err(to_text)?
        .ok_or_else(|| "no monitor found".to_string())
}

pub(crate) fn work_area(monitor: &Monitor) -> WorkArea {
    let area = monitor.work_area();
    WorkArea {
        x: area.position.x,
        y: area.position.y,
        width: area.size.width as i32,
        height: area.size.height as i32,
    }
}

fn position_on_monitor(
    x: i32,
    y: i32,
    edge: SnapEdge,
    area: &WorkArea,
    width: i32,
    height: i32,
) -> SnapResult {
    let x = match edge {
        SnapEdge::Left => area.x,
        SnapEdge::Right => area.x + area.width - width,
        _ => x,
    };
    let y = match edge {
        SnapEdge::Top => area.y,
        SnapEdge::Bottom => area.y + area.height - height,
        _ => y,
    };
    let (x, y) = area.clamp_position(x, y, width, height);
    SnapResult { x, y, edge }
}

fn set_bounds(window: &WebviewWindow, x: i32, y: i32, w: u32, h: u32) -> Result<(), String> {
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(to_text)?;
    window.set_size(PhysicalSize::new(w, h)).map_err(to_text)
}

#[cfg(windows)]
pub(crate) fn set_frameless_bounds(
    window: &WebviewWindow,
    x: i32,
    y: i32,
    w: u32,
    h: u32,
) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER};

    let hwnd = HWND(window.hwnd().map_err(to_text)?.0);
    // Move and resize in one operation so the desktop edge stays fixed on the right and bottom.
    unsafe {
        SetWindowPos(
            hwnd,
            None,
            x,
            y,
            w as i32,
            h as i32,
            SWP_NOACTIVATE | SWP_NOZORDER,
        )
    }
    .map_err(|error| error.to_string())
}

#[cfg(not(windows))]
pub(crate) fn set_frameless_bounds(
    window: &WebviewWindow,
    x: i32,
    y: i32,
    w: u32,
    h: u32,
) -> Result<(), String> {
    set_bounds(window, x, y, w, h)
}

pub(crate) fn set_idle_memory_target(window: &WebviewWindow, idle: bool) {
    #[cfg(windows)]
    {
        use webview2_com::Microsoft::Web::WebView2::Win32::{
            ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW,
            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
        };
        use windows_core::Interface;

        // The hint is optional on older WebView2 runtimes. Interaction remains enabled.
        let _ = window.with_webview(move |webview| unsafe {
            if let Ok(core) = webview.controller().CoreWebView2() {
                if let Ok(view) = core.cast::<ICoreWebView2_19>() {
                    let target = if idle { COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW }
                        else { COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL };
                    let _ = view.SetMemoryUsageTargetLevel(target);
                }
            }
        });
    }
    #[cfg(not(windows))]
    let _ = (window, idle);
}

fn to_text(error: tauri::Error) -> String {
    error.to_string()
}
