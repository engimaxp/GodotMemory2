use serde::{Deserialize, Serialize};

/// Snap edge directions
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum SnapEdge {
    Left,
    Right,
    Top,
    Bottom,
    #[default]
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

impl From<&str> for SnapEdge {
    fn from(value: &str) -> Self {
        match value {
            "Left" => Self::Left,
            "Right" => Self::Right,
            "Top" => Self::Top,
            "Bottom" => Self::Bottom,
            _ => Self::None,
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

impl WorkArea {
    pub fn clamp_position(&self, x: i32, y: i32, w: i32, h: i32) -> (i32, i32) {
        let right = self.x + (self.width - w).max(0);
        let bottom = self.y + (self.height - h).max(0);
        (x.clamp(self.x, right), y.clamp(self.y, bottom))
    }
}

/// Result of snap calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapResult {
    pub x: i32,
    pub y: i32,
    pub edge: SnapEdge,
}

impl SnapResult {
    // Only the visible slice occupies desktop space, even at a shared monitor edge.
    pub fn visible_bounds(&self, w: i32, h: i32, strip: i32) -> (i32, i32, u32, u32) {
        match self.edge {
            SnapEdge::Left => (self.x, self.y, strip as u32, h as u32),
            SnapEdge::Right => (self.x + w - strip, self.y, strip as u32, h as u32),
            SnapEdge::Top => (self.x, self.y, w as u32, strip as u32),
            SnapEdge::Bottom => (self.x, self.y + h - strip, w as u32, strip as u32),
            SnapEdge::None => (self.x, self.y, w as u32, h as u32),
        }
    }
}

/// Find an edge and retain the position of the full, revealed bubble.
pub fn calculate_snap_position(
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    work_area: &WorkArea,
    threshold: i32,
) -> SnapResult {
    let (x, y) = work_area.clamp_position(x, y, w, h);
    let right = work_area.x + (work_area.width - w).max(0);
    let bottom = work_area.y + (work_area.height - h).max(0);
    let distances = [
        (x - work_area.x, SnapEdge::Left),
        (right - x, SnapEdge::Right),
        (y - work_area.y, SnapEdge::Top),
        (bottom - y, SnapEdge::Bottom),
    ];
    let edge = distances
        .into_iter()
        .filter(|(distance, _)| *distance <= threshold)
        .min_by_key(|(distance, _)| *distance)
        .map_or(SnapEdge::None, |(_, edge)| edge);
    let x = if right - x <= threshold {
        right
    } else if x - work_area.x <= threshold {
        work_area.x
    } else {
        x
    };
    let y = if bottom - y <= threshold {
        bottom
    } else if y - work_area.y <= threshold {
        work_area.y
    } else {
        y
    };
    SnapResult { x, y, edge }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn work_area() -> WorkArea {
        WorkArea {
            x: 0,
            y: 0,
            width: 1920,
            height: 1040,
        }
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

    #[test]
    fn test_overshoot_on_monitor_left_of_primary() {
        let area = WorkArea {
            x: -1920,
            y: -300,
            width: 1920,
            height: 1040,
        };
        let result = calculate_snap_position(-2000, 200, 160, 160, &area, 38);
        assert_eq!(result.edge, SnapEdge::Left);
        assert_eq!(result.visible_bounds(160, 160, 30), (-1920, 200, 30, 160));
    }

    #[test]
    fn test_tucked_bounds_stay_inside_work_area() {
        let area = work_area();
        for (x, y, edge, bounds) in [
            (4, 400, SnapEdge::Left, (0, 400, 24, 128)),
            (1790, 400, SnapEdge::Right, (1896, 400, 24, 128)),
            (300, 4, SnapEdge::Top, (300, 0, 128, 24)),
            (300, 925, SnapEdge::Bottom, (300, 1016, 128, 24)),
        ] {
            let result = calculate_snap_position(x, y, 128, 128, &area, 30);
            assert_eq!(result.edge, edge);
            assert_eq!(result.visible_bounds(128, 128, 24), bounds);
        }
    }
}
