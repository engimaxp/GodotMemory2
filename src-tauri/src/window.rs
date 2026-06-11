use tauri::{PhysicalPosition, PhysicalSize, Position, Size};
use tauri::WebviewWindow;

pub const BALL_SIZE: (u32, u32) = (128, 128);
pub const PANEL_SIZE: (u32, u32) = (500, 700);

thread_local! {
    static CURRENT_MODE: std::cell::RefCell<String> = const { std::cell::RefCell::new(String::new()) };
}

/// Get the current window mode
pub fn get_mode() -> String {
    CURRENT_MODE.with(|m| m.borrow().clone())
}

/// Set window mode: "ball" or "panel"
pub fn set_mode(window: &WebviewWindow, mode: &str, snap_edge: &str) {
    CURRENT_MODE.with(|m| *m.borrow_mut() = mode.to_string());

    match mode {
        "ball" => {
            let _ = window.set_size(Size::Physical(PhysicalSize {
                width: BALL_SIZE.0,
                height: BALL_SIZE.1,
            }));
            let _ = window.set_min_size(Some(Size::Physical(PhysicalSize {
                width: BALL_SIZE.0,
                height: BALL_SIZE.1,
            })));
            let _ = window.set_max_size(Some(Size::Physical(PhysicalSize {
                width: PANEL_SIZE.0.max(BALL_SIZE.0),
                height: PANEL_SIZE.1.max(BALL_SIZE.1),
            })));
            let _ = window.set_resizable(false);
        }
        "panel" => {
            let _ = window.set_size(Size::Physical(PhysicalSize {
                width: PANEL_SIZE.0,
                height: PANEL_SIZE.1,
            }));
            let _ = window.set_min_size(Some(Size::Physical(PhysicalSize {
                width: PANEL_SIZE.0,
                height: PANEL_SIZE.1,
            })));
            let _ = window.set_max_size::<tauri::Size>(None);
            let _ = window.set_resizable(true);

            // Position based on snap edge
            if let Ok(Some(monitor)) = window.primary_monitor() {
                let wa = monitor.work_area();
                match snap_edge {
                    "Right" => {
                        let _ = window.set_position(Position::Physical(PhysicalPosition {
                            x: wa.position.x + wa.size.width as i32 - PANEL_SIZE.0 as i32,
                            y: wa.position.y,
                        }));
                    }
                    "Left" => {
                        let _ = window.set_position(Position::Physical(PhysicalPosition {
                            x: wa.position.x,
                            y: wa.position.y,
                        }));
                    }
                    "Bottom" => {
                        let _ = window.set_position(Position::Physical(PhysicalPosition {
                            x: wa.position.x + wa.size.width as i32 - PANEL_SIZE.0 as i32,
                            y: wa.position.y + wa.size.height as i32 - PANEL_SIZE.1 as i32,
                        }));
                    }
                    "Top" => {
                        let _ = window.set_position(Position::Physical(PhysicalPosition {
                            x: wa.position.x + wa.size.width as i32 - PANEL_SIZE.0 as i32,
                            y: wa.position.y,
                        }));
                    }
                    _ => {
                        // Default: right edge
                        let _ = window.set_position(Position::Physical(PhysicalPosition {
                            x: wa.position.x + wa.size.width as i32 - PANEL_SIZE.0 as i32,
                            y: wa.position.y,
                        }));
                    }
                }
            }
        }
        _ => {}
    }
}

/// Position the ball window at default position (bottom-right corner)
pub fn position_ball_default(window: &WebviewWindow) {
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let wa = monitor.work_area();
        let _ = window.set_position(Position::Physical(PhysicalPosition {
            x: wa.position.x + wa.size.width as i32 - BALL_SIZE.0 as i32 - 20,
            y: wa.position.y + wa.size.height as i32 - BALL_SIZE.1 as i32 - 20,
        }));
    }
}
