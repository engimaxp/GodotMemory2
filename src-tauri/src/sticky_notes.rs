use std::collections::HashMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, EventTarget, LogicalSize, Manager, Monitor, PhysicalPosition, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, WindowEvent,
};

use crate::database::{DatabaseStore, StickyNote};
use crate::edge_snap::{calculate_snap_position, SnapEdge, WorkArea};
use crate::settings_store::SettingsStore;
use crate::window::{monitor_at, physical, set_frameless_bounds, work_area};

const PREFIX: &str = "note-";
const WIDTH: i32 = 350;
const HEIGHT: i32 = 340;
const MIN_WIDTH: i32 = 280;
const MIN_HEIGHT: i32 = 210;
const TAB_DEPTH: i32 = 34;
const TUCKED_TAB_DEPTH: i32 = 12;
const TAB_LENGTH: i32 = 156;

#[derive(Default)]
pub struct NoteWindows {
    opening: Mutex<()>,
    sessions: Mutex<HashMap<String, NoteSession>>,
}

#[derive(Default)]
struct NoteSession {
    ready: bool,
    drag: Option<PhysicalPosition<i32>>,
    dock: Option<DockedNote>,
    revision: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
struct NoteBounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

#[derive(Clone, Copy)]
struct DockedNote {
    edge: SnapEdge,
    expanded: NoteBounds,
    peeking: bool,
    compact: bool,
}

#[derive(Clone, Copy, Default, Serialize)]
pub struct NoteWindowView {
    edge: SnapEdge,
    peeking: bool,
    retreating: bool,
    revision: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NoteWindowAction {
    Ready,
    Minimize,
    ToggleMaximize,
    Tuck,
    Peek,
    HidePeek,
    FinishPeek,
    Restore,
    Close,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NoteDrag {
    Begin,
    Move,
    End,
    Cancel,
}

#[tauri::command]
pub async fn list_sticky_notes(app: AppHandle) -> Result<Vec<StickyNote>, String> {
    app.state::<DatabaseStore>().with(|db| db.list_sticky_notes())
}

#[tauri::command]
pub async fn create_sticky_note(app: AppHandle) -> Result<StickyNote, String> {
    let note = app.state::<DatabaseStore>().with(|db| db.create_sticky_note())?;
    notes_changed(&app);
    Ok(note)
}

#[tauri::command]
pub async fn get_sticky_note(window: WebviewWindow) -> Result<StickyNote, String> {
    window.state::<DatabaseStore>().with(|db| db.get_sticky_note(note_id(&window)?))
}

#[tauri::command]
pub async fn save_sticky_note(
    window: WebviewWindow,
    content: String,
    color: String,
) -> Result<(), String> {
    let app = window.app_handle();
    app.state::<DatabaseStore>().with(|db| db.save_sticky_note(note_id(&window)?, &content, &color))?;
    let language = app.state::<SettingsStore>().get().language;
    let _ = window.set_title(&note_window_title(&content, &language));
    notes_changed(app);
    Ok(())
}

#[tauri::command]
pub async fn delete_sticky_note(app: AppHandle, id: String) -> Result<(), String> {
    let label = note_label(&id)?;
    let windows = app.state::<NoteWindows>();
    let _opening = windows.opening.lock().unwrap();
    app.state::<DatabaseStore>().with(|db| db.delete_sticky_note(&id))?;
    notes_changed(&app);
    if let Some(window) = app.get_webview_window(&label) {
        window.destroy().map_err(error_text)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_sticky_note(app: AppHandle, id: String) -> Result<(), String> {
    let label = note_label(&id)?;
    // The builder runs off the UI thread. Serialize the existing-window check and creation.
    let windows = app.state::<NoteWindows>();
    let _opening = windows.opening.lock().unwrap();
    let (note, saved) = app.state::<DatabaseStore>().with(|db| {
        Ok((db.get_sticky_note(&id)?, db.sticky_note_placement(&id)?))
    })?;
    let saved = saved.and_then(|json| serde_json::from_str::<NoteBounds>(&json).ok());

    if let Some(window) = app.get_webview_window(&label) {
        let existing = window.clone();
        let (send, receive) = std::sync::mpsc::sync_channel(1);
        window
            .run_on_main_thread(move || {
                let result = bring_forward(&existing);
                let _ = send.send(result);
            })
            .map_err(error_text)?;
        return receive.recv().map_err(|error| error.to_string())?;
    }

    let settings = app.state::<SettingsStore>().get();
    let title = note_window_title(&note.content, &settings.language);
    let offset = app.webview_windows().len() % 6;
    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title(title)
        .inner_size(f64::from(WIDTH), f64::from(HEIGHT))
        .min_inner_size(f64::from(MIN_WIDTH), f64::from(MIN_HEIGHT))
        .decorations(false)
        .shadow(false)
        .transparent(true)
        .visible(false)
        .build()
        .map_err(error_text)?;
    let watched = window.clone();
    window.on_window_event(move |event| match event {
        WindowEvent::CloseRequested { api, .. } => {
            let sessions = watched.app_handle().state::<NoteWindows>();
            let ready = sessions
                .sessions
                .lock()
                .unwrap()
                .get(watched.label())
                .is_some_and(|session| session.ready);
            if ready && emit_window(&watched, "sticky-note:close-requested", ()).is_ok() {
                api.prevent_close();
            }
        }
        WindowEvent::Destroyed => {
            watched
                .app_handle()
                .state::<NoteWindows>()
                .sessions
                .lock()
                .unwrap()
                .remove(watched.label());
        }
        _ => {}
    });

    let positioned = position_new_window(&window, saved, offset)
        .and_then(|()| window.show().map_err(error_text))
        .and_then(|()| window.set_focus().map_err(error_text));
    if positioned.is_err() {
        let _ = window.destroy();
    }
    positioned
}

#[tauri::command]
pub fn sticky_note_window_action(
    window: WebviewWindow,
    action: NoteWindowAction,
    revision: Option<u32>,
) -> Result<NoteWindowView, String> {
    let id = note_id(&window)?;
    let windows = window.app_handle().state::<NoteWindows>();
    let mut sessions = windows.sessions.lock().unwrap();
    let session = sessions.entry(window.label().into()).or_default();
    match action {
        NoteWindowAction::Ready => session.ready = true,
        NoteWindowAction::Minimize => {
            session.restore(&window)?;
            window.minimize().map_err(error_text)?;
        }
        NoteWindowAction::ToggleMaximize => {
            session.restore(&window)?;
            if window.is_maximized().map_err(error_text)? {
                window.unmaximize().map_err(error_text)?;
            } else {
                if let Ok(bounds) = NoteBounds::read(&window) {
                    save_placement(window.app_handle(), id, bounds);
                }
                window.maximize().map_err(error_text)?;
            }
        }
        NoteWindowAction::Tuck
            if session.dock.is_none() && !window.is_maximized().map_err(error_text)? =>
        {
            let bounds = NoteBounds::read(&window)?;
            let monitor = monitor_for_bounds(&window, bounds)?;
            let area = work_area(&monitor);
            let expanded = bounds.fit(&area);
            let edge = expanded.nearest_edge(&area);
            session.tuck(&window, expanded, edge, &monitor)?;
            save_placement(window.app_handle(), id, expanded);
        }
        NoteWindowAction::Tuck => {}
        NoteWindowAction::Peek => session.set_peeking(&window, true)?,
        NoteWindowAction::HidePeek => session.set_peeking(&window, false)?,
        NoteWindowAction::FinishPeek if revision == Some(session.revision) => {
            session.finish_peek(&window)?;
        }
        NoteWindowAction::FinishPeek => {}
        NoteWindowAction::Restore => session.restore(&window)?,
        NoteWindowAction::Close => {
            let bounds = session.dock.map(|dock| dock.expanded).or_else(|| {
                if window.is_maximized().unwrap_or(false) || window.is_minimized().unwrap_or(false)
                {
                    return None;
                }
                NoteBounds::read(&window).ok()
            });
            // Destroyed removes the session, so release the lock before closing the native window.
            drop(sessions);
            if let Some(bounds) = bounds {
                save_placement(window.app_handle(), id, bounds);
            }
            window.destroy().map_err(error_text)?;
            return Ok(NoteWindowView::default());
        }
    }
    Ok(session.view())
}

#[tauri::command]
pub fn drag_sticky_note(window: WebviewWindow, phase: NoteDrag) -> Result<NoteWindowView, String> {
    let id = note_id(&window)?;
    let windows = window.app_handle().state::<NoteWindows>();
    let mut sessions = windows.sessions.lock().unwrap();
    let session = sessions.entry(window.label().into()).or_default();
    match phase {
        NoteDrag::Begin => {
            if session.dock.is_none() && !window.is_maximized().map_err(error_text)? {
                let cursor = cursor(&window)?;
                let origin = window.outer_position().map_err(error_text)?;
                session.drag = Some(PhysicalPosition::new(
                    cursor.x - origin.x,
                    cursor.y - origin.y,
                ));
            }
        }
        NoteDrag::Move => {
            if let Some(offset) = session.drag {
                let cursor = cursor(&window)?;
                window
                    .set_position(PhysicalPosition::new(
                        cursor.x - offset.x,
                        cursor.y - offset.y,
                    ))
                    .map_err(error_text)?;
            }
        }
        NoteDrag::Cancel => session.drag = None,
        NoteDrag::End => {
            if let Some(offset) = session.drag.take() {
                let cursor = cursor(&window)?;
                let monitor = monitor_at(&window, f64::from(cursor.x), f64::from(cursor.y))?;
                let area = work_area(&monitor);
                let mut bounds = NoteBounds::read(&window)?;
                bounds.x = cursor.x - offset.x;
                bounds.y = cursor.y - offset.y;
                let expanded = bounds.fit(&area);
                let snap = calculate_snap_position(
                    expanded.x,
                    expanded.y,
                    expanded.width as i32,
                    expanded.height as i32,
                    &area,
                    physical(22, &monitor),
                );
                if snap.edge != SnapEdge::None {
                    session.tuck(&window, expanded, snap.edge, &monitor)?;
                } else {
                    expanded.apply(&window)?;
                }
                save_placement(window.app_handle(), id, expanded);
            }
        }
    }
    Ok(session.view())
}

impl NoteSession {
    fn view(&self) -> NoteWindowView {
        NoteWindowView {
            edge: self.dock.map_or(SnapEdge::None, |dock| dock.edge),
            peeking: self.dock.is_some_and(|dock| dock.peeking),
            retreating: self.dock.is_some_and(|dock| !dock.peeking && !dock.compact),
            revision: self.revision,
        }
    }

    fn tuck(
        &mut self,
        window: &WebviewWindow,
        expanded: NoteBounds,
        edge: SnapEdge,
        monitor: &Monitor,
    ) -> Result<(), String> {
        let dock = DockedNote {
            expanded,
            edge,
            peeking: false,
            compact: true,
        };
        let tab = dock.tab_bounds(monitor, TUCKED_TAB_DEPTH);
        window.set_resizable(false).map_err(error_text)?;
        window
            .set_min_size(None::<LogicalSize<f64>>)
            .map_err(error_text)?;
        tab.apply(window)?;
        self.dock = Some(dock);
        self.revision = self.revision.wrapping_add(1);
        window.set_always_on_top(true).map_err(error_text)?;
        window.set_skip_taskbar(true).map_err(error_text)?;
        crate::window::set_idle_memory_target(window, true);
        Ok(())
    }

    fn set_peeking(&mut self, window: &WebviewWindow, peeking: bool) -> Result<(), String> {
        let Some(dock) = self.dock.as_mut() else {
            return Ok(());
        };
        if dock.peeking != peeking {
            if peeking && dock.compact {
                let monitor = monitor_for_bounds(window, dock.expanded)?;
                dock.tab_bounds(&monitor, TAB_DEPTH).apply(window)?;
                dock.compact = false;
            }
            dock.peeking = peeking;
            self.revision = self.revision.wrapping_add(1);
        }
        Ok(())
    }

    fn finish_peek(&mut self, window: &WebviewWindow) -> Result<(), String> {
        if let Some(dock) = self.dock.as_mut() {
            if !dock.peeking && !dock.compact {
                let monitor = monitor_for_bounds(window, dock.expanded)?;
                dock.tab_bounds(&monitor, TUCKED_TAB_DEPTH).apply(window)?;
                dock.compact = true;
            }
        }
        Ok(())
    }

    fn restore(&mut self, window: &WebviewWindow) -> Result<(), String> {
        if let Some(dock) = self.dock {
            let monitor = monitor_for_bounds(window, dock.expanded)?;
            dock.expanded.fit(&work_area(&monitor)).apply(window)?;
            self.dock = None;
            self.revision = self.revision.wrapping_add(1);
            window.set_always_on_top(false).map_err(error_text)?;
            window.set_resizable(true).map_err(error_text)?;
            window
                .set_min_size(Some(LogicalSize::new(MIN_WIDTH, MIN_HEIGHT)))
                .map_err(error_text)?;
            window.set_skip_taskbar(false).map_err(error_text)?;
            crate::window::set_idle_memory_target(window, false);
        }
        Ok(())
    }
}

impl DockedNote {
    fn tab_bounds(self, monitor: &Monitor, depth: i32) -> NoteBounds {
        self.expanded.edge_tab(
            self.edge,
            &work_area(monitor),
            physical(depth, monitor),
            physical(TAB_LENGTH, monitor),
        )
    }
}

impl NoteBounds {
    fn read(window: &WebviewWindow) -> Result<Self, String> {
        let position = window.outer_position().map_err(error_text)?;
        let size = window.outer_size().map_err(error_text)?;
        Ok(Self {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
        })
    }

    fn apply(self, window: &WebviewWindow) -> Result<(), String> {
        set_frameless_bounds(window, self.x, self.y, self.width, self.height)
    }

    fn fit(self, area: &WorkArea) -> Self {
        let width = self.width.min(area.width.max(1) as u32).max(1);
        let height = self.height.min(area.height.max(1) as u32).max(1);
        let (x, y) = area.clamp_position(self.x, self.y, width as i32, height as i32);
        Self {
            x,
            y,
            width,
            height,
        }
    }

    fn nearest_edge(self, area: &WorkArea) -> SnapEdge {
        [
            (self.x - area.x, SnapEdge::Left),
            (
                area.x + area.width - self.x - self.width as i32,
                SnapEdge::Right,
            ),
            (self.y - area.y, SnapEdge::Top),
            (
                area.y + area.height - self.y - self.height as i32,
                SnapEdge::Bottom,
            ),
        ]
        .into_iter()
        .min_by_key(|(distance, _)| *distance)
        .unwrap()
        .1
    }

    fn edge_tab(self, edge: SnapEdge, area: &WorkArea, depth: i32, length: i32) -> Self {
        let center_x = self.x + self.width as i32 / 2;
        let center_y = self.y + self.height as i32 / 2;
        let (x, y, w, h) = match edge {
            SnapEdge::Left => (area.x, center_y - length / 2, depth, length),
            SnapEdge::Right => (
                area.x + area.width - depth,
                center_y - length / 2,
                depth,
                length,
            ),
            SnapEdge::Top => (center_x - length / 2, area.y, length, depth),
            SnapEdge::Bottom => (
                center_x - length / 2,
                area.y + area.height - depth,
                length,
                depth,
            ),
            SnapEdge::None => return self,
        };
        Self {
            x,
            y,
            width: w as u32,
            height: h as u32,
        }
        .fit(area)
    }
}

fn position_new_window(
    window: &WebviewWindow,
    saved: Option<NoteBounds>,
    offset: usize,
) -> Result<(), String> {
    if let Some(bounds) = saved {
        let monitor = monitor_for_bounds(window, bounds)?;
        let sized = NoteBounds {
            width: bounds.width.max(physical(MIN_WIDTH, &monitor) as u32),
            height: bounds.height.max(physical(MIN_HEIGHT, &monitor) as u32),
            ..bounds
        };
        return sized.fit(&work_area(&monitor)).apply(window);
    }
    let cursor = cursor(window)?;
    let monitor = monitor_at(window, f64::from(cursor.x), f64::from(cursor.y))?;
    let area = work_area(&monitor);
    let width = physical(WIDTH, &monitor);
    let height = physical(HEIGHT, &monitor);
    let cascade = physical(offset as i32 * 18, &monitor);
    NoteBounds {
        x: area.x + (area.width - width) / 2 + cascade,
        y: area.y + (area.height - height) / 2 + cascade,
        width: width as u32,
        height: height as u32,
    }
    .fit(&area)
    .apply(window)
}

fn monitor_for_bounds(window: &WebviewWindow, bounds: NoteBounds) -> Result<Monitor, String> {
    monitor_at(
        window,
        f64::from(bounds.x) + f64::from(bounds.width) / 2.0,
        f64::from(bounds.y) + f64::from(bounds.height) / 2.0,
    )
}

fn bring_forward(window: &WebviewWindow) -> Result<(), String> {
    let windows = window.app_handle().state::<NoteWindows>();
    let mut sessions = windows.sessions.lock().unwrap();
    let session = sessions.entry(window.label().into()).or_default();
    if window.is_minimized().map_err(error_text)? {
        window.unminimize().map_err(error_text)?;
    }
    session.restore(window)?;
    window.show().map_err(error_text)?;
    window.set_focus().map_err(error_text)?;
    emit_window(window, "sticky-note:window", session.view())
}

fn cursor(window: &WebviewWindow) -> Result<PhysicalPosition<i32>, String> {
    let position = window.cursor_position().map_err(error_text)?;
    Ok(PhysicalPosition::new(
        position.x.round() as i32,
        position.y.round() as i32,
    ))
}

fn note_label(id: &str) -> Result<String, String> {
    let id = uuid::Uuid::parse_str(id).map_err(|error| error.to_string())?;
    Ok(format!("{PREFIX}{id}"))
}

fn note_window_title(content: &str, language: &str) -> String {
    let fallback = if language == "en_US" {
        "Sticky note"
    } else {
        "便签"
    };
    let name = content
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or(fallback);
    format!(
        "{} · GodotMemory",
        name.chars().take(48).collect::<String>()
    )
}

fn note_id(window: &WebviewWindow) -> Result<&str, String> {
    window
        .label()
        .strip_prefix(PREFIX)
        .ok_or_else(|| "not a sticky note window".into())
}

fn save_placement(app: &AppHandle, id: &str, bounds: NoteBounds) {
    let result = serde_json::to_string(&bounds)
        .map_err(|error| error.to_string())
        .and_then(|json| app.state::<DatabaseStore>().with(|db| db.save_sticky_note_placement(id, &json)));
    if let Err(error) = result {
        log::warn!("could not save sticky note placement: {error}");
    }
}

fn notes_changed(app: &AppHandle) {
    let _ = app.emit("sticky-note:changed", ());
}

fn emit_window<T: Serialize + Clone>(
    window: &WebviewWindow,
    event: &str,
    value: T,
) -> Result<(), String> {
    window
        .emit_to(EventTarget::window(window.label()), event, value)
        .map_err(error_text)
}

fn error_text(error: tauri::Error) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tabs_stay_on_the_selected_monitor_and_keep_the_expanded_bounds() {
        let area = WorkArea {
            x: -1400,
            y: -150,
            width: 1400,
            height: 900,
        };
        let bounds = NoteBounds {
            x: -1200,
            y: 120,
            width: 350,
            height: 340,
        };
        for (edge, expected) in [
            (SnapEdge::Left, (-1400, 212, 34, 156)),
            (SnapEdge::Right, (-34, 212, 34, 156)),
            (SnapEdge::Top, (-1103, -150, 156, 34)),
            (SnapEdge::Bottom, (-1103, 716, 156, 34)),
        ] {
            let tab = bounds.edge_tab(edge, &area, 34, 156);
            assert_eq!((tab.x, tab.y, tab.width, tab.height), expected);
            assert_eq!(tab.fit(&area), tab);
            let tucked = bounds.edge_tab(edge, &area, TUCKED_TAB_DEPTH, TAB_LENGTH);
            assert_eq!(tucked.width.min(tucked.height), TUCKED_TAB_DEPTH as u32);
            assert!(tucked.x >= tab.x && tucked.y >= tab.y);
            assert!(tucked.x + tucked.width as i32 <= tab.x + tab.width as i32);
            assert!(tucked.y + tucked.height as i32 <= tab.y + tab.height as i32);
        }
        assert_eq!(bounds.fit(&area), bounds);
    }
}
