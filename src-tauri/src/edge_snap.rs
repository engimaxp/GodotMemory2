use serde::{Deserialize, Serialize};

/// Snap edge directions
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SnapEdge {
    Left,
    Right,
    Top,
    Bottom,
    None,
}

impl std::fmt::Display for SnapEdge {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SnapEdge::Left => write!(f, "Left"),
            SnapEdge::Right => write!(f, "Right"),
            SnapEdge::Top => write!(f, "Top"),
            SnapEdge::Bottom => write!(f, "Bottom"),
            SnapEdge::None => write!(f, "None"),
        }
    }
}

/// Screen work area (monitor working area excluding taskbar)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkArea {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

/// Result of snap calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapResult {
    pub x: i32,
    pub y: i32,
    pub edge: SnapEdge,
}

/// Calculate snap position for a window
/// Returns new position and the edge that was snapped to
pub fn calculate_snap_position(
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    work_area: &WorkArea,
    threshold: i32,
) -> SnapResult {
    let mut new_x = x;
    let mut new_y = y;
    let mut edge = SnapEdge::None;

    // Snap to left edge
    if (x - work_area.x).abs() < threshold {
        new_x = work_area.x;
        edge = SnapEdge::Left;
    }
    // Snap to right edge
    else if ((work_area.x + work_area.width) - (x + w)).abs() < threshold {
        new_x = work_area.x + work_area.width - w;
        edge = SnapEdge::Right;
    }

    // Snap to top edge
    if (y - work_area.y).abs() < threshold {
        new_y = work_area.y;
        if edge == SnapEdge::None {
            edge = SnapEdge::Top;
        }
    }
    // Snap to bottom edge
    else if ((work_area.y + work_area.height) - (y + h)).abs() < threshold {
        new_y = work_area.y + work_area.height - h;
        if edge == SnapEdge::None {
            edge = SnapEdge::Bottom;
        }
    }

    SnapResult { x: new_x, y: new_y, edge }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn work_area() -> WorkArea {
        WorkArea { x: 0, y: 0, width: 1920, height: 1040 }
    }

    #[test]
    fn test_no_snap() {
        let result = calculate_snap_position(500, 500, 128, 128, &work_area(), 50);
        assert_eq!(result.edge, SnapEdge::None);
        assert_eq!(result.x, 500);
        assert_eq!(result.y, 500);
    }

    #[test]
    fn test_snap_left() {
        let result = calculate_snap_position(10, 500, 128, 128, &work_area(), 50);
        assert_eq!(result.edge, SnapEdge::Left);
        assert_eq!(result.x, 0);
    }

    #[test]
    fn test_snap_right() {
        let result = calculate_snap_position(1800, 500, 128, 128, &work_area(), 50);
        assert_eq!(result.edge, SnapEdge::Right);
        assert_eq!(result.x, 1920 - 128);
    }

    #[test]
    fn test_snap_top() {
        let result = calculate_snap_position(500, 10, 128, 128, &work_area(), 50);
        assert_eq!(result.edge, SnapEdge::Top);
        assert_eq!(result.y, 0);
    }

    #[test]
    fn test_snap_bottom() {
        let result = calculate_snap_position(500, 950, 128, 128, &work_area(), 50);
        assert_eq!(result.edge, SnapEdge::Bottom);
        assert_eq!(result.y, 1040 - 128);
    }

    #[test]
    fn test_snap_corner_left_top() {
        let result = calculate_snap_position(10, 10, 128, 128, &work_area(), 50);
        assert_eq!(result.edge, SnapEdge::Left);
        assert_eq!(result.x, 0);
        assert_eq!(result.y, 0); // also snaps top
    }
}
