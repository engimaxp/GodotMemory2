use md5::{Digest, Md5};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

// ─── Data Structures ───

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Engine {
    pub id: String,
    pub version: String,
    pub directory: String,
    pub is_enc: bool,
    pub enc_key: String,
    pub has_console: bool,
    pub console_dir: String,
    pub name: String,
    pub is_default: bool,
    pub main_version: i32,
    pub desc: String,
    pub sort: i64,
    pub is_delete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proj {
    pub id: String,
    pub version: String,
    pub directory: String,
    pub name: String,
    pub main_version: i32,
    pub desc: String,
    pub sort: i64,
    pub is_delete: bool,
    pub engine_id: String,
    pub icon: String,
    pub star: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: String,
    pub directory: String,
    pub name: String,
    pub copy_right: String,
    pub link: String,
    pub desc: String,
    pub sort: i64,
    pub is_delete: bool,
    pub star: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub id: String,
    pub directory: String,
    pub link: String,
    pub name: String,
    pub desc: String,
    pub sort: i64,
    pub is_delete: bool,
    pub icon: String,
    pub star: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diary {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub proj_id: String,
    pub sort: i64,
    pub is_delete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiaryDetail {
    pub id: String,
    pub create_date: String,
    pub diary_id: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub r#type: i32,
    pub sub_type: i32,
    pub is_fast: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageRecord {
    pub id: String,
    pub width: i32,
    pub height: i32,
    pub format: Option<String>,
    pub path: String,
    pub new_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityWithExtras<T> {
    pub entity: T,
    pub tags: Vec<Tag>,
    pub images: Vec<ImageRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page {
    pub index: i64,
    pub size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult<T> {
    pub items: Vec<EntityWithExtras<T>>,
    pub total: i64,
}

// ─── Database Manager ───

pub struct Database {
    conn: Connection,
    cache_dir: PathBuf,
}

impl Database {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

        let cache_dir = data_dir.join("cache").join("img");
        fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

        let db_path = data_dir.join("GodotMemory.db");
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        let mut db = Self { conn, cache_dir };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&mut self) -> Result<(), String> {
        self.conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;

             CREATE TABLE IF NOT EXISTS Engine (
                Id TEXT PRIMARY KEY, Version TEXT, Directory TEXT,
                IsEnc INTEGER DEFAULT 0, EncKey TEXT DEFAULT '',
                HasConsole INTEGER DEFAULT 0, ConsoleDir TEXT DEFAULT '',
                Name TEXT, IsDefault INTEGER DEFAULT 0,
                MainVersion INTEGER DEFAULT 4, \"Desc\" TEXT DEFAULT '',
                Sort INTEGER DEFAULT 0, IsDelete INTEGER DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS Proj (
                Id TEXT PRIMARY KEY, Version TEXT, Directory TEXT,
                Name TEXT, MainVersion INTEGER DEFAULT 4,
                \"Desc\" TEXT DEFAULT '', Sort INTEGER DEFAULT 0,
                IsDelete INTEGER DEFAULT 0, EngineId TEXT DEFAULT '',
                Icon TEXT DEFAULT '', Star INTEGER DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS Asset (
                Id TEXT PRIMARY KEY, Directory TEXT, Name TEXT,
                CopyRight TEXT DEFAULT '', Link TEXT DEFAULT '',
                \"Desc\" TEXT DEFAULT '', Sort INTEGER DEFAULT 0,
                IsDelete INTEGER DEFAULT 0, Star INTEGER DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS Tool (
                Id TEXT PRIMARY KEY, Directory TEXT, Link TEXT DEFAULT '',
                Name TEXT, \"Desc\" TEXT DEFAULT '', Sort INTEGER DEFAULT 0,
                IsDelete INTEGER DEFAULT 0, Icon TEXT DEFAULT '',
                Star INTEGER DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS Diary (
                Id TEXT PRIMARY KEY, Name TEXT, \"Desc\" TEXT DEFAULT '',
                ProjId TEXT DEFAULT '', Sort INTEGER DEFAULT 0,
                IsDelete INTEGER DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS DiaryDetail (
                Id TEXT PRIMARY KEY, CreateDate TEXT NOT NULL,
                DiaryId TEXT NOT NULL, Content TEXT DEFAULT ''
             );
             CREATE TABLE IF NOT EXISTS Tag (
                Id TEXT PRIMARY KEY, Name TEXT, Type INTEGER DEFAULT 0,
                SubType INTEGER DEFAULT 0, Color TEXT DEFAULT '3b82f6',
                IsFast INTEGER DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS TagRelation (
                TagId TEXT, Type INTEGER, RelateId TEXT
             );
             CREATE TABLE IF NOT EXISTS Images (
                Id TEXT PRIMARY KEY, Width INTEGER DEFAULT 0,
                Height INTEGER DEFAULT 0, Format TEXT DEFAULT '',
                Path TEXT DEFAULT '', NewPath TEXT DEFAULT ''
             );
             CREATE TABLE IF NOT EXISTS ImageRelation (
                ImageId TEXT, Type INTEGER, RelateId TEXT
             );
             CREATE INDEX IF NOT EXISTS idx_tag_type ON TagRelation(Type);
             CREATE INDEX IF NOT EXISTS idx_image_type ON ImageRelation(Type);"
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn next_sort(&self, table: &str) -> Result<i64, String> {
        let sql = format!("SELECT COALESCE(MAX(Sort), 0) + 1 FROM \"{}\"", table);
        self.conn.query_row(&sql, [], |row| row.get(0))
            .map_err(|e| e.to_string())
    }

    // ═══════════════════ Engine CRUD ═══════════════════

    pub fn add_engine(&self, engine: &Engine, tag_ids: &[String]) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let sort = self.next_sort("Engine")?;
        self.conn.execute(
            "INSERT INTO Engine (Id,Version,Directory,IsEnc,EncKey,HasConsole,ConsoleDir,Name,IsDefault,MainVersion,\"Desc\",Sort)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![id, engine.version, engine.directory, engine.is_enc as i32, engine.enc_key,
                    engine.has_console as i32, engine.console_dir, engine.name,
                    engine.is_default as i32, engine.main_version, engine.desc, sort],
        ).map_err(|e| e.to_string())?;
        self.add_tag_relations(&tag_ids, &id, 0)?;
        Ok(id)
    }

    pub fn update_engine(&self, engine: &Engine, tag_ids: &[String]) -> Result<(), String> {
        self.conn.execute(
            "UPDATE Engine SET Version=?1, Directory=?2, IsEnc=?3, EncKey=?4, HasConsole=?5,
             ConsoleDir=?6, Name=?7, IsDefault=?8, MainVersion=?9, \"Desc\"=?10 WHERE Id=?11",
            params![engine.version, engine.directory, engine.is_enc as i32, engine.enc_key,
                    engine.has_console as i32, engine.console_dir, engine.name,
                    engine.is_default as i32, engine.main_version, engine.desc, engine.id],
        ).map_err(|e| e.to_string())?;
        self.replace_tag_relations(&tag_ids, &engine.id, 0)?;
        Ok(())
    }

    pub fn delete_engine(&self, id: &str) -> Result<(), String> {
        self.conn.execute("UPDATE Engine SET IsDelete=1 WHERE Id=?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_engine_by_id(&self, id: &str) -> Result<Engine, String> {
        self.conn.query_row(
            "SELECT Id,Version,Directory,IsEnc,EncKey,HasConsole,ConsoleDir,Name,IsDefault,MainVersion,\"Desc\",Sort,IsDelete FROM Engine WHERE Id=?1",
            params![id], map_engine,
        ).map_err(|e| e.to_string())
    }

    pub fn list_all_engines(&self) -> Result<Vec<EntityWithExtras<Engine>>, String> {
        self.query_engines("SELECT Id,Version,Directory,IsEnc,EncKey,HasConsole,ConsoleDir,Name,IsDefault,MainVersion,\"Desc\",Sort,IsDelete FROM Engine WHERE IsDelete=0 ORDER BY Sort DESC", &[])
    }

    pub fn list_engines(&self, page: Option<&Page>) -> Result<SearchResult<Engine>, String> {
        let (limit, offset) = page.map(|p| (p.size, (p.index - 1) * p.size)).unwrap_or((-1, 0));
        let items = self.query_engines("SELECT Id,Version,Directory,IsEnc,EncKey,HasConsole,ConsoleDir,Name,IsDefault,MainVersion,\"Desc\",Sort,IsDelete FROM Engine WHERE IsDelete=0 ORDER BY Sort DESC LIMIT ?1 OFFSET ?2", &[&limit, &offset])?;
        let total: i64 = self.conn.query_row("SELECT COUNT(*) FROM Engine WHERE IsDelete=0", [], |row| row.get(0)).map_err(|e| e.to_string())?;
        Ok(SearchResult { items, total })
    }

    pub fn search_engines(&self, search: &str, tag_ids: &[String], page: Option<&Page>) -> Result<SearchResult<Engine>, String> {
        let (limit, offset) = page.map(|p| (p.size, (p.index - 1) * p.size)).unwrap_or((-1, 0));
        let like = format!("%{}%", search);
        let has_tags = !tag_ids.is_empty();

        // COUNT: params = [like, tag1, tag2...] → tags start at ?2
        // DATA: params = [like, limit, offset, tag1, tag2...] → tags start at ?4
        let tag_count_clause = if has_tags {
            let ph: Vec<String> = tag_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 2)).collect();
            format!("AND EXISTS (SELECT 1 FROM TagRelation WHERE RelateId=Engine.Id AND Type=0 AND TagId IN ({}))", ph.join(","))
        } else { String::new() };
        let tag_data_clause = if has_tags {
            let ph: Vec<String> = tag_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 4)).collect();
            format!("AND EXISTS (SELECT 1 FROM TagRelation WHERE RelateId=Engine.Id AND Type=0 AND TagId IN ({}))", ph.join(","))
        } else { String::new() };

        let cols = "Id,Version,Directory,IsEnc,EncKey,HasConsole,ConsoleDir,Name,IsDefault,MainVersion,\"Desc\",Sort,IsDelete";
        let sql_count = format!("SELECT COUNT(*) FROM Engine WHERE IsDelete=0 AND (Name LIKE ?1 OR Version LIKE ?1 OR \"Desc\" LIKE ?1) {}", tag_count_clause);
        let sql_data = format!("SELECT {} FROM Engine WHERE IsDelete=0 AND (Name LIKE ?1 OR Version LIKE ?1 OR \"Desc\" LIKE ?1) {} ORDER BY Sort DESC LIMIT ?2 OFFSET ?3", cols, tag_data_clause);

        // Count
        let mut stmt = self.conn.prepare(&sql_count).map_err(|e| e.to_string())?;
        let like_val = like.clone();
        let mut params: Vec<&dyn rusqlite::types::ToSql> = vec![&like_val];
        if has_tags { for tid in tag_ids { params.push(tid); } }
        let count: i64 = stmt.query_row(params.as_slice(), |row| row.get(0)).map_err(|e| e.to_string())?;

        // Items
        let mut stmt2 = self.conn.prepare(&sql_data).map_err(|e| e.to_string())?;
        let like_param2 = like; let limit_param2 = limit; let offset_param2 = offset;
        let mut param_values2: Vec<&dyn rusqlite::types::ToSql> = vec![&like_param2, &limit_param2, &offset_param2];
        for tid in tag_ids { param_values2.push(tid); }
        let rows = stmt2.query_map(param_values2.as_slice(), map_engine).map_err(|e| e.to_string())?;
        let mut items = Vec::new();
        for row in rows {
            let e = row.map_err(|e| e.to_string())?;
            let eid = e.id.clone();
            items.push(self.enrich_with_tags_images(e, &eid, 0)?);
        }

        Ok(SearchResult { items, total: count })
    }

    // ═══════════════════ Proj CRUD ═══════════════════

    pub fn add_proj(&self, proj: &Proj, tag_ids: &[String], image_paths: &[String]) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let sort = self.next_sort("Proj")?;
        self.conn.execute(
            "INSERT INTO Proj (Id,Version,Directory,Name,MainVersion,\"Desc\",Sort,IsDelete,EngineId,Icon,Star)
             VALUES (?1,?2,?3,?4,?5,?6,?7,0,?8,?9,?10)",
            params![id, proj.version, proj.directory, proj.name, proj.main_version,
                    proj.desc, sort, proj.engine_id, proj.icon, proj.star as i32],
        ).map_err(|e| e.to_string())?;
        self.add_tag_relations(&tag_ids, &id, 1)?;
        for p in image_paths {
            if let Ok(img) = self.copy_to_cache(p) {
                self.add_image_relation(&img.id, &id, 1)?;
            }
        }
        Ok(id)
    }

    pub fn update_proj(&self, proj: &Proj, tag_ids: &[String], image_ids: &[String]) -> Result<(), String> {
        self.conn.execute(
            "UPDATE Proj SET Version=?1,Directory=?2,Name=?3,MainVersion=?4,\"Desc\"=?5,EngineId=?6,Icon=?7,Star=?8 WHERE Id=?9",
            params![proj.version, proj.directory, proj.name, proj.main_version, proj.desc,
                    proj.engine_id, proj.icon, proj.star as i32, proj.id],
        ).map_err(|e| e.to_string())?;
        self.replace_tag_relations(&tag_ids, &proj.id, 1)?;
        self.replace_image_relations(&proj.id, 1, &image_ids)?;
        Ok(())
    }

    pub fn delete_proj(&self, id: &str) -> Result<(), String> {
        self.conn.execute("UPDATE Proj SET IsDelete=1 WHERE Id=?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn toggle_proj_star(&self, id: &str, star: bool) -> Result<(), String> {
        self.conn.execute("UPDATE Proj SET Star=?1 WHERE Id=?2", params![star as i32, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_all_projs(&self) -> Result<Vec<EntityWithExtras<Proj>>, String> {
        self.query_projs("SELECT Id,Version,Directory,Name,MainVersion,\"Desc\",Sort,IsDelete,EngineId,Icon,Star FROM Proj WHERE IsDelete=0 ORDER BY Star DESC, Sort DESC", &[])
    }

    pub fn list_projs(&self, page: Option<&Page>) -> Result<SearchResult<Proj>, String> {
        let (limit, offset) = page.map(|p| (p.size, (p.index - 1) * p.size)).unwrap_or((-1, 0));
        let items = self.query_projs("SELECT Id,Version,Directory,Name,MainVersion,\"Desc\",Sort,IsDelete,EngineId,Icon,Star FROM Proj WHERE IsDelete=0 ORDER BY Star DESC, Sort DESC LIMIT ?1 OFFSET ?2", &[&limit, &offset])?;
        let total: i64 = self.conn.query_row("SELECT COUNT(*) FROM Proj WHERE IsDelete=0", [], |row| row.get(0)).map_err(|e| e.to_string())?;
        Ok(SearchResult { items, total })
    }

    pub fn search_projs(&self, search: &str, tag_ids: &[String], page: Option<&Page>) -> Result<SearchResult<Proj>, String> {
        let (limit, offset) = page.map(|p| (p.size, (p.index - 1) * p.size)).unwrap_or((-1, 0));
        let like = format!("%{}%", search);
        let has_tags = !tag_ids.is_empty();

        let tag_count_clause = if has_tags {
            let ph: Vec<String> = tag_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 2)).collect();
            format!("AND EXISTS (SELECT 1 FROM TagRelation WHERE RelateId=Proj.Id AND Type=1 AND TagId IN ({}))", ph.join(","))
        } else { String::new() };
        let tag_data_clause = if has_tags {
            let ph: Vec<String> = tag_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 4)).collect();
            format!("AND EXISTS (SELECT 1 FROM TagRelation WHERE RelateId=Proj.Id AND Type=1 AND TagId IN ({}))", ph.join(","))
        } else { String::new() };

        let cols = "Id,Version,Directory,Name,MainVersion,\"Desc\",Sort,IsDelete,EngineId,Icon,Star";
        let sql_count = format!("SELECT COUNT(*) FROM Proj WHERE IsDelete=0 AND (Name LIKE ?1 OR Version LIKE ?1 OR \"Desc\" LIKE ?1) {}", tag_count_clause);
        let sql_data = format!("SELECT {} FROM Proj WHERE IsDelete=0 AND (Name LIKE ?1 OR Version LIKE ?1 OR \"Desc\" LIKE ?1) {} ORDER BY Star DESC, Sort DESC LIMIT ?2 OFFSET ?3", cols, tag_data_clause);

        // Count
        let count: i64 = {
            let mut stmt = self.conn.prepare(&sql_count).map_err(|e| e.to_string())?;
            let p_like = like.clone();
            let mut p: Vec<&dyn rusqlite::types::ToSql> = vec![&p_like];
            for tid in tag_ids { p.push(tid); }
            stmt.query_row(p.as_slice(), |row| row.get(0)).map_err(|e| e.to_string())?
        };

        // Items
        let items = {
            let mut stmt = self.conn.prepare(&sql_data).map_err(|e| e.to_string())?;
            let p_like2 = like; let p_limit2 = limit; let p_offset2 = offset;
            let mut p: Vec<&dyn rusqlite::types::ToSql> = vec![&p_like2, &p_limit2, &p_offset2];
            for tid in tag_ids { p.push(tid); }
            let rows = stmt.query_map(p.as_slice(), map_proj_row).map_err(|e| e.to_string())?;
            let mut results = Vec::new();
            for row in rows {
                let e = row.map_err(|e| e.to_string())?;
                let eid = e.id.clone();
                results.push(self.enrich_with_tags_images(e, &eid, 1)?);
            }
            results
        };

        Ok(SearchResult { items, total: count })
    }

    pub fn scan_projects(&self, dir: &str) -> Result<i32, String> {
        let mut count = 0;
        self.scan_dir_for_projects(dir, &mut count)?;
        Ok(count)
    }

    fn scan_dir_for_projects(&self, dir: &str, count: &mut i32) -> Result<(), String> {
        let dir_entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return Ok(()),
        };
        for entry in dir_entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_dir() {
                self.scan_dir_for_projects(&path.to_string_lossy(), count)?;
            } else if path.file_name().map_or(false, |n| n == "project.godot") {
                if let Some(parent) = path.parent() {
                    let parent_str = parent.to_string_lossy().to_string();
                    // Check if already exists
                    let exists: bool = self.conn.query_row(
                        "SELECT COUNT(1) FROM Proj WHERE Directory=?1 AND IsDelete=0",
                        params![parent_str], |row| row.get::<_, i32>(0),
                    ).map(|c| c > 0).unwrap_or(false);
                    if !exists {
                        // Parse project.godot
                        if let Some(proj) = self.parse_project_godot(&parent_str) {
                            self.add_proj(&proj, &[], &[])?;
                            *count += 1;
                        }
                    }
                }
            }
        }
        Ok(())
    }

    fn parse_project_godot(&self, dir: &str) -> Option<Proj> {
        let path = format!("{}/project.godot", dir);
        let content = fs::read_to_string(&path).ok()?;
        let mut name = "Unnamed".to_string();
        let mut version = "4.0".to_string();
        let mut main_version = 4;
        let mut icon_path = String::new();

        for line in content.lines() {
            if let Some(val) = line.strip_prefix("config/name=\"") {
                name = val.trim_end_matches('"').to_string();
            } else if let Some(val) = line.strip_prefix("config/features=PackedStringArray(") {
                let feat = val.trim_end_matches(')');
                if feat.contains("4.") {
                    main_version = 4;
                } else {
                    main_version = 3;
                    version = "3.5".to_string();
                }
            } else if let Some(val) = line.strip_prefix("config_version=") {
                let cv: i32 = val.trim().parse().unwrap_or(5);
                if cv == 4 { main_version = 3; version = "3.5".to_string(); }
            } else if let Some(val) = line.strip_prefix("config/icon=\"") {
                icon_path = val.trim_end_matches('"').to_string();
            }
        }

        Some(Proj {
            id: String::new(), version, directory: dir.to_string(), name,
            main_version, desc: String::new(), sort: 0, is_delete: false,
            engine_id: String::new(), icon: icon_path, star: false,
        })
    }

    // ═══════════════════ Asset CRUD ═══════════════════

    pub fn add_asset(&self, asset: &Asset, tag_ids: &[String], image_paths: &[String]) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let sort = self.next_sort("Asset")?;
        self.conn.execute(
            "INSERT INTO Asset (Id,Directory,Name,CopyRight,Link,\"Desc\",Sort,IsDelete,Star) VALUES (?1,?2,?3,?4,?5,?6,?7,0,?8)",
            params![id, asset.directory, asset.name, asset.copy_right, asset.link, asset.desc, sort, asset.star as i32],
        ).map_err(|e| e.to_string())?;
        self.add_tag_relations(&tag_ids, &id, 2)?;
        for p in image_paths {
            if let Ok(img) = self.copy_to_cache(p) {
                self.add_image_relation(&img.id, &id, 2)?;
            }
        }
        Ok(id)
    }

    pub fn update_asset(&self, asset: &Asset, tag_ids: &[String], image_ids: &[String]) -> Result<(), String> {
        self.conn.execute(
            "UPDATE Asset SET Directory=?1,Name=?2,CopyRight=?3,Link=?4,\"Desc\"=?5,Star=?6 WHERE Id=?7",
            params![asset.directory, asset.name, asset.copy_right, asset.link, asset.desc, asset.star as i32, asset.id],
        ).map_err(|e| e.to_string())?;
        self.replace_tag_relations(&tag_ids, &asset.id, 2)?;
        self.replace_image_relations(&asset.id, 2, &image_ids)?;
        Ok(())
    }

    pub fn delete_asset(&self, id: &str) -> Result<(), String> {
        self.conn.execute("UPDATE Asset SET IsDelete=1 WHERE Id=?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn toggle_asset_star(&self, id: &str, star: bool) -> Result<(), String> {
        self.conn.execute("UPDATE Asset SET Star=?1 WHERE Id=?2", params![star as i32, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_all_assets(&self) -> Result<Vec<EntityWithExtras<Asset>>, String> {
        self.query_assets("SELECT Id,Directory,Name,CopyRight,Link,\"Desc\",Sort,IsDelete,Star FROM Asset WHERE IsDelete=0 ORDER BY Star DESC, Sort DESC", &[])
    }

    pub fn list_assets(&self, page: Option<&Page>) -> Result<SearchResult<Asset>, String> {
        let (limit, offset) = page.map(|p| (p.size, (p.index - 1) * p.size)).unwrap_or((-1, 0));
        let items = self.query_assets("SELECT Id,Directory,Name,CopyRight,Link,\"Desc\",Sort,IsDelete,Star FROM Asset WHERE IsDelete=0 ORDER BY Star DESC, Sort DESC LIMIT ?1 OFFSET ?2", &[&limit, &offset])?;
        let total: i64 = self.conn.query_row("SELECT COUNT(*) FROM Asset WHERE IsDelete=0", [], |row| row.get(0)).map_err(|e| e.to_string())?;
        Ok(SearchResult { items, total })
    }

    pub fn search_assets(&self, search: &str, tag_ids: &[String], page: Option<&Page>) -> Result<SearchResult<Asset>, String> {
        let (limit, offset) = page.map(|p| (p.size, (p.index - 1) * p.size)).unwrap_or((-1, 0));
        let like = format!("%{}%", search);
        let has_tags = !tag_ids.is_empty();

        let tag_count_clause = if has_tags {
            let ph: Vec<String> = tag_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 2)).collect();
            format!("AND EXISTS (SELECT 1 FROM TagRelation WHERE RelateId=Asset.Id AND Type=2 AND TagId IN ({}))", ph.join(","))
        } else { String::new() };
        let tag_data_clause = if has_tags {
            let ph: Vec<String> = tag_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 4)).collect();
            format!("AND EXISTS (SELECT 1 FROM TagRelation WHERE RelateId=Asset.Id AND Type=2 AND TagId IN ({}))", ph.join(","))
        } else { String::new() };

        let cols = "Id,Directory,Name,CopyRight,Link,\"Desc\",Sort,IsDelete,Star";
        let where_cond = "Name LIKE ?1 OR \"Desc\" LIKE ?1 OR Link LIKE ?1 OR CopyRight LIKE ?1";
        let sql_count = format!("SELECT COUNT(*) FROM Asset WHERE IsDelete=0 AND ({}) {}", where_cond, tag_count_clause);
        let sql_data = format!("SELECT {} FROM Asset WHERE IsDelete=0 AND ({}) {} ORDER BY Star DESC, Sort DESC LIMIT ?2 OFFSET ?3", cols, where_cond, tag_data_clause);

        let count: i64 = {
            let mut stmt = self.conn.prepare(&sql_count).map_err(|e| e.to_string())?;
            let p_like = like.clone();
            let mut p: Vec<&dyn rusqlite::types::ToSql> = vec![&p_like];
            for tid in tag_ids { p.push(tid); }
            stmt.query_row(p.as_slice(), |row| row.get(0)).map_err(|e| e.to_string())?
        };
        let items = {
            let mut stmt = self.conn.prepare(&sql_data).map_err(|e| e.to_string())?;
            let mut p: Vec<&dyn rusqlite::types::ToSql> = vec![&like, &limit, &offset];
            for tid in tag_ids { p.push(tid); }
            let rows = stmt.query_map(p.as_slice(), map_asset_row).map_err(|e| e.to_string())?;
            let mut results = Vec::new();
            for row in rows {
                let e = row.map_err(|e| e.to_string())?; let eid = e.id.clone();
                results.push(self.enrich_with_tags_images(e, &eid, 2)?);
            }
            results
        };
        Ok(SearchResult { items, total: count })
    }

    // ═══════════════════ Tool CRUD ═══════════════════

    pub fn add_tool(&self, tool: &Tool, tag_ids: &[String], image_paths: &[String]) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let sort = self.next_sort("Tool")?;
        self.conn.execute(
            "INSERT INTO Tool (Id,Directory,Link,Name,\"Desc\",Sort,IsDelete,Icon,Star) VALUES (?1,?2,?3,?4,?5,?6,0,?7,?8)",
            params![id, tool.directory, tool.link, tool.name, tool.desc, sort, tool.icon, tool.star as i32],
        ).map_err(|e| e.to_string())?;
        self.add_tag_relations(&tag_ids, &id, 3)?;
        for p in image_paths {
            if let Ok(img) = self.copy_to_cache(p) {
                self.add_image_relation(&img.id, &id, 3)?;
            }
        }
        Ok(id)
    }

    pub fn update_tool(&self, tool: &Tool, tag_ids: &[String], image_ids: &[String]) -> Result<(), String> {
        self.conn.execute(
            "UPDATE Tool SET Directory=?1,Link=?2,Name=?3,\"Desc\"=?4,Icon=?5,Star=?6 WHERE Id=?7",
            params![tool.directory, tool.link, tool.name, tool.desc, tool.icon, tool.star as i32, tool.id],
        ).map_err(|e| e.to_string())?;
        self.replace_tag_relations(&tag_ids, &tool.id, 3)?;
        self.replace_image_relations(&tool.id, 3, &image_ids)?;
        Ok(())
    }

    pub fn delete_tool(&self, id: &str) -> Result<(), String> {
        self.conn.execute("UPDATE Tool SET IsDelete=1 WHERE Id=?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn toggle_tool_star(&self, id: &str, star: bool) -> Result<(), String> {
        self.conn.execute("UPDATE Tool SET Star=?1 WHERE Id=?2", params![star as i32, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_all_tools(&self) -> Result<Vec<EntityWithExtras<Tool>>, String> {
        self.query_tools("SELECT Id,Directory,Link,Name,\"Desc\",Sort,IsDelete,Icon,Star FROM Tool WHERE IsDelete=0 ORDER BY Star DESC, Sort DESC", &[])
    }

    pub fn list_tools(&self, page: Option<&Page>) -> Result<SearchResult<Tool>, String> {
        let (limit, offset) = page.map(|p| (p.size, (p.index - 1) * p.size)).unwrap_or((-1, 0));
        let items = self.query_tools("SELECT Id,Directory,Link,Name,\"Desc\",Sort,IsDelete,Icon,Star FROM Tool WHERE IsDelete=0 ORDER BY Star DESC, Sort DESC LIMIT ?1 OFFSET ?2", &[&limit, &offset])?;
        let total: i64 = self.conn.query_row("SELECT COUNT(*) FROM Tool WHERE IsDelete=0", [], |row| row.get(0)).map_err(|e| e.to_string())?;
        Ok(SearchResult { items, total })
    }

    pub fn search_tools(&self, search: &str, tag_ids: &[String], page: Option<&Page>) -> Result<SearchResult<Tool>, String> {
        let (limit, offset) = page.map(|p| (p.size, (p.index - 1) * p.size)).unwrap_or((-1, 0));
        let like = format!("%{}%", search);
        let has_tags = !tag_ids.is_empty();

        let tag_count_clause = if has_tags {
            let ph: Vec<String> = tag_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 2)).collect();
            format!("AND EXISTS (SELECT 1 FROM TagRelation WHERE RelateId=Tool.Id AND Type=3 AND TagId IN ({}))", ph.join(","))
        } else { String::new() };
        let tag_data_clause = if has_tags {
            let ph: Vec<String> = tag_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 4)).collect();
            format!("AND EXISTS (SELECT 1 FROM TagRelation WHERE RelateId=Tool.Id AND Type=3 AND TagId IN ({}))", ph.join(","))
        } else { String::new() };

        let cols = "Id,Directory,Link,Name,\"Desc\",Sort,IsDelete,Icon,Star";
        let where_cond = "Name LIKE ?1 OR \"Desc\" LIKE ?1 OR Link LIKE ?1";
        let sql_count = format!("SELECT COUNT(*) FROM Tool WHERE IsDelete=0 AND ({}) {}", where_cond, tag_count_clause);
        let sql_data = format!("SELECT {} FROM Tool WHERE IsDelete=0 AND ({}) {} ORDER BY Star DESC, Sort DESC LIMIT ?2 OFFSET ?3", cols, where_cond, tag_data_clause);

        let count: i64 = {
            let mut stmt = self.conn.prepare(&sql_count).map_err(|e| e.to_string())?;
            let p_like = like.clone();
            let mut p: Vec<&dyn rusqlite::types::ToSql> = vec![&p_like];
            for tid in tag_ids { p.push(tid); }
            stmt.query_row(p.as_slice(), |row| row.get(0)).map_err(|e| e.to_string())?
        };
        let items = {
            let mut stmt = self.conn.prepare(&sql_data).map_err(|e| e.to_string())?;
            let mut p: Vec<&dyn rusqlite::types::ToSql> = vec![&like, &limit, &offset];
            for tid in tag_ids { p.push(tid); }
            let rows = stmt.query_map(p.as_slice(), map_tool_row).map_err(|e| e.to_string())?;
            let mut results = Vec::new();
            for row in rows {
                let e = row.map_err(|e| e.to_string())?; let eid = e.id.clone();
                results.push(self.enrich_with_tags_images(e, &eid, 3)?);
            }
            results
        };
        Ok(SearchResult { items, total: count })
    }

    // ═══════════════════ Diary CRUD ═══════════════════

    pub fn list_diaries(&self) -> Result<Vec<Diary>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT Id,Name,\"Desc\",ProjId,Sort,IsDelete FROM Diary WHERE IsDelete=0 ORDER BY Sort DESC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], map_diary).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn add_diary(&self, diary: &Diary) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let sort = self.next_sort("Diary")?;
        self.conn.execute(
            "INSERT INTO Diary (Id,Name,\"Desc\",ProjId,Sort,IsDelete) VALUES (?1,?2,?3,?4,?5,0)",
            params![id, diary.name, diary.desc, diary.proj_id, sort],
        ).map_err(|e| e.to_string())?;
        Ok(id)
    }

    pub fn update_diary(&self, diary: &Diary) -> Result<(), String> {
        self.conn.execute(
            "UPDATE Diary SET Name=?1,\"Desc\"=?2,ProjId=?3 WHERE Id=?4",
            params![diary.name, diary.desc, diary.proj_id, diary.id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_diary(&self, id: &str) -> Result<(), String> {
        self.conn.execute("UPDATE Diary SET IsDelete=1 WHERE Id=?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_diary_detail(&self, diary_id: &str, create_date: &str) -> Result<Option<DiaryDetail>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT Id,CreateDate,DiaryId,Content FROM DiaryDetail WHERE DiaryId=?1 AND CreateDate=?2 LIMIT 1"
        ).map_err(|e| e.to_string())?;
        let mut rows = stmt.query_map(params![diary_id, create_date], map_diary_detail)
            .map_err(|e| e.to_string())?;
        match rows.next() {
            Some(Ok(detail)) => Ok(Some(detail)),
            _ => Ok(None),
        }
    }

    pub fn save_diary_detail(&self, detail: &DiaryDetail) -> Result<String, String> {
        // Check if exists
        let exists: bool = self.conn.query_row(
            "SELECT COUNT(1) FROM DiaryDetail WHERE DiaryId=?1 AND CreateDate=?2",
            params![detail.diary_id, detail.create_date],
            |row| row.get::<_, i32>(0),
        ).map(|c| c > 0).unwrap_or(false);

        if exists {
            self.conn.execute(
                "UPDATE DiaryDetail SET Content=?1 WHERE DiaryId=?2 AND CreateDate=?3",
                params![detail.content, detail.diary_id, detail.create_date],
            ).map_err(|e| e.to_string())?;
            // Return existing id
            let id: String = self.conn.query_row(
                "SELECT Id FROM DiaryDetail WHERE DiaryId=?1 AND CreateDate=?2",
                params![detail.diary_id, detail.create_date],
                |row| row.get(0),
            ).map_err(|e| e.to_string())?;
            Ok(id)
        } else {
            let id = uuid::Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO DiaryDetail (Id,CreateDate,DiaryId,Content) VALUES (?1,?2,?3,?4)",
                params![id, detail.create_date, detail.diary_id, detail.content],
            ).map_err(|e| e.to_string())?;
            Ok(id)
        }
    }

    pub fn query_diary_details(&self, diary_id: &str, year: i32) -> Result<Vec<DiaryDetail>, String> {
        let prefix = format!("{}-", year);
        let mut stmt = self.conn.prepare(
            "SELECT Id,CreateDate,DiaryId,Content FROM DiaryDetail WHERE DiaryId=?1 AND CreateDate LIKE ?2 ORDER BY CreateDate"
        ).map_err(|e| e.to_string())?;
        let pattern = format!("{}%", prefix);
        let rows = stmt.query_map(params![diary_id, pattern], map_diary_detail)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    // ═══════════════════ Tags ═══════════════════

    pub fn list_tags(&self, r#type: i32, sub_type: i32) -> Result<Vec<Tag>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT Id,Name,Color,Type,SubType,IsFast FROM Tag WHERE Type=?1 AND SubType=?2 ORDER BY Name"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![r#type, sub_type], map_tag)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn query_tag_by_name_like(&self, text: &str, r#type: i32, sub_type: i32) -> Result<Vec<Tag>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT Id,Name,Color,Type,SubType,IsFast FROM Tag WHERE Name LIKE ?1 AND Type=?2 AND SubType=?3 ORDER BY Name"
        ).map_err(|e| e.to_string())?;
        let pattern = format!("%{}%", text);
        let rows = stmt.query_map(params![pattern, r#type, sub_type], map_tag)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn insert_tag(&self, name: &str, color: &str, r#type: i32, sub_type: i32) -> Result<Tag, String> {
        let id = uuid::Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO Tag (Id,Name,Color,Type,SubType,IsFast) VALUES (?1,?2,?3,?4,?5,0)",
            params![id, name, color, r#type, sub_type],
        ).map_err(|e| e.to_string())?;
        Ok(Tag { id, name: name.to_string(), color: color.to_string(), r#type, sub_type, is_fast: false })
    }

    pub fn set_fast_tag(&self, id: &str, is_fast: bool) -> Result<(), String> {
        self.conn.execute("UPDATE Tag SET IsFast=?1 WHERE Id=?2", params![is_fast as i32, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_tag_color(&self, id: &str, color: &str) -> Result<(), String> {
        self.conn.execute("UPDATE Tag SET Color=?1 WHERE Id=?2", params![color, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_tags_for(&self, relate_id: &str, r#type: i32) -> Result<Vec<Tag>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT Tag.Id,Tag.Name,Tag.Color,Tag.Type,Tag.SubType,Tag.IsFast FROM Tag
             JOIN TagRelation ON Tag.Id=TagRelation.TagId
             WHERE TagRelation.RelateId=?1 AND TagRelation.Type=?2"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![relate_id, r#type], map_tag)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    fn add_tag_relations(&self, tag_ids: &[String], relate_id: &str, r#type: i32) -> Result<(), String> {
        for tid in tag_ids {
            self.conn.execute(
                "INSERT OR IGNORE INTO TagRelation (TagId,Type,RelateId) VALUES (?1,?2,?3)",
                params![tid, r#type, relate_id],
            ).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn replace_tag_relations(&self, tag_ids: &[String], relate_id: &str, r#type: i32) -> Result<(), String> {
        self.conn.execute("DELETE FROM TagRelation WHERE RelateId=?1 AND Type=?2", params![relate_id, r#type])
            .map_err(|e| e.to_string())?;
        self.add_tag_relations(tag_ids, relate_id, r#type)
    }

    // ═══════════════════ Images ═══════════════════

    pub fn copy_to_cache(&self, src_path: &str) -> Result<ImageRecord, String> {
        let src = std::path::Path::new(src_path);
        if !src.exists() {
            return Err("File not found".to_string());
        }

        let bytes = fs::read(src).map_err(|e| e.to_string())?;
        let hash = Md5::digest(&bytes);
        let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("png");
        let cached_name = format!("{:x}.{}", hash, ext);
        let cached_path = self.cache_dir.join(&cached_name);

        if !cached_path.exists() {
            fs::copy(src, &cached_path).map_err(|e| e.to_string())?;
        }

        let id = uuid::Uuid::new_v4().to_string();
        let new_path = cached_path.to_string_lossy().to_string();
        let (w, h) = image_dimensions(src_path).unwrap_or((0, 0));

        self.conn.execute(
            "INSERT INTO Images (Id,Width,Height,Format,Path,NewPath) VALUES (?1,?2,?3,?4,?5,?6)",
            params![id, w, h, ext, src_path, new_path],
        ).map_err(|e| e.to_string())?;

        Ok(ImageRecord { id, width: w, height: h, format: Some(ext.to_string()), path: src_path.to_string(), new_path })
    }

    pub fn load_entity_icon(&self, icon_path: &str, base_dir: &str, entity_id: &str, entity_type: i32) -> Result<Option<String>, String> {
        if icon_path.is_empty() { return Ok(None); }

        let resolved = if icon_path.starts_with("res://") {
            std::path::Path::new(base_dir).join(&icon_path[6..])
        } else {
            std::path::Path::new(base_dir).join(&icon_path)
        };

        let resolved_str = resolved.to_string_lossy().to_string();
        if !resolved.exists() { return Ok(None); }

        // Check if already cached
        let existing = self.get_images_for(entity_id, entity_type)?;
        if !existing.is_empty() {
            return self.load_image_base64(&existing[0].id);
        }

        // Copy to cache and link
        if let Ok(img) = self.copy_to_cache(&resolved_str) {
            let _ = self.add_image_relation(&img.id, entity_id, entity_type);
            return self.load_image_base64(&img.id);
        }

        Ok(None)
    }

    pub fn load_image_base64(&self, id: &str) -> Result<Option<String>, String> {
        let img: ImageRecord = self.conn.query_row(
            "SELECT Id,Width,Height,Format,Path,NewPath FROM Images WHERE Id=?1",
            params![id],
            |row| Ok(ImageRecord {
                id: row.get(0)?, width: row.get(1)?, height: row.get(2)?,
                format: row.get(3)?, path: row.get(4)?, new_path: row.get(5)?,
            }),
        ).map_err(|e| e.to_string())?;

        let bytes = fs::read(&img.new_path).map_err(|e| e.to_string())?;
        let ext = img.format.as_deref().unwrap_or("png");
        let mime = match ext {
            "jpg" | "jpeg" | "JPEG" | "JPG" => "image/jpeg",
            "png" | "PNG" => "image/png",
            "webp" | "WEBP" => "image/webp",
            "bmp" | "BMP" => "image/bmp",
            "svg" | "SVG" => "image/svg+xml",
            _ => "image/png",
        };
        Ok(Some(format!("data:{};base64,{}", mime, base64_encode(&bytes))))
    }

    pub fn get_images_for(&self, relate_id: &str, r#type: i32) -> Result<Vec<ImageRecord>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT Images.Id,Images.Width,Images.Height,Images.Format,Images.Path,Images.NewPath FROM Images
             JOIN ImageRelation ON Images.Id=ImageRelation.ImageId
             WHERE ImageRelation.RelateId=?1 AND ImageRelation.Type=?2"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![relate_id, r#type], |row| Ok(ImageRecord {
            id: row.get(0)?, width: row.get(1)?, height: row.get(2)?,
            format: row.get(3)?, path: row.get(4)?, new_path: row.get(5)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    fn add_image_relation(&self, image_id: &str, relate_id: &str, r#type: i32) -> Result<(), String> {
        self.conn.execute(
            "INSERT OR IGNORE INTO ImageRelation (ImageId,Type,RelateId) VALUES (?1,?2,?3)",
            params![image_id, r#type, relate_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn replace_image_relations(&self, relate_id: &str, r#type: i32, image_ids: &[String]) -> Result<(), String> {
        self.conn.execute("DELETE FROM ImageRelation WHERE RelateId=?1 AND Type=?2", params![relate_id, r#type])
            .map_err(|e| e.to_string())?;
        for iid in image_ids {
            self.add_image_relation(iid, relate_id, r#type)?;
        }
        Ok(())
    }

    // ─── Query Helpers ───

    fn enrich_with_tags_images<T>(&self, entity: T, id: &str, tag_type: i32) -> Result<EntityWithExtras<T>, String> {
        let tags = self.get_tags_for(id, tag_type)?;
        let images = self.get_images_for(id, tag_type)?;
        Ok(EntityWithExtras { entity, tags, images })
    }

    fn query_engines(&self, sql: &str, sql_params: &[&dyn rusqlite::types::ToSql]) -> Result<Vec<EntityWithExtras<Engine>>, String> {
        let mut stmt = self.conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(sql_params, map_engine).map_err(|e| e.to_string())?;
        let mut results = Vec::new();
        for row in rows {
            let engine = row.map_err(|e| e.to_string())?;
            let id = engine.id.clone();
            results.push(self.enrich_with_tags_images(engine, &id, 0)?);
        }
        Ok(results)
    }

    fn query_projs(&self, sql: &str, sql_params: &[&dyn rusqlite::types::ToSql]) -> Result<Vec<EntityWithExtras<Proj>>, String> {
        let mut stmt = self.conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(sql_params, map_proj_row).map_err(|e| e.to_string())?;
        let mut results = Vec::new();
        for row in rows {
            let entity = row.map_err(|e| e.to_string())?;
            let id = entity.id.clone();
            results.push(self.enrich_with_tags_images(entity, &id, 1)?);
        }
        Ok(results)
    }

    fn query_assets(&self, sql: &str, sql_params: &[&dyn rusqlite::types::ToSql]) -> Result<Vec<EntityWithExtras<Asset>>, String> {
        let mut stmt = self.conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(sql_params, map_asset_row).map_err(|e| e.to_string())?;
        let mut results = Vec::new();
        for row in rows {
            let entity = row.map_err(|e| e.to_string())?;
            let id = entity.id.clone();
            results.push(self.enrich_with_tags_images(entity, &id, 2)?);
        }
        Ok(results)
    }

    fn query_tools(&self, sql: &str, sql_params: &[&dyn rusqlite::types::ToSql]) -> Result<Vec<EntityWithExtras<Tool>>, String> {
        let mut stmt = self.conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(sql_params, map_tool_row).map_err(|e| e.to_string())?;
        let mut results = Vec::new();
        for row in rows {
            let entity = row.map_err(|e| e.to_string())?;
            let id = entity.id.clone();
            results.push(self.enrich_with_tags_images(entity, &id, 3)?);
        }
        Ok(results)
    }

    // ─── Generic Search/Multi-col Helper ───

}

// ═══════════════════ Row Mappers ═══════════════════

fn map_engine(row: &rusqlite::Row) -> rusqlite::Result<Engine> {
    Ok(Engine {
        id: row.get(0)?, version: row.get(1)?, directory: row.get(2)?,
        is_enc: row.get::<_, i32>(3)? != 0, enc_key: row.get(4)?,
        has_console: row.get::<_, i32>(5)? != 0, console_dir: row.get(6)?,
        name: row.get(7)?, is_default: row.get::<_, i32>(8)? != 0,
        main_version: row.get(9)?, desc: row.get(10)?,
        sort: row.get(11)?, is_delete: row.get::<_, i32>(12)? != 0,
    })
}

fn map_diary(row: &rusqlite::Row) -> rusqlite::Result<Diary> {
    Ok(Diary {
        id: row.get(0)?, name: row.get(1)?, desc: row.get(2)?,
        proj_id: row.get(3)?, sort: row.get(4)?, is_delete: row.get::<_, i32>(5)? != 0,
    })
}

fn map_diary_detail(row: &rusqlite::Row) -> rusqlite::Result<DiaryDetail> {
    Ok(DiaryDetail {
        id: row.get(0)?, create_date: row.get(1)?,
        diary_id: row.get(2)?, content: row.get(3)?,
    })
}

fn map_tag(row: &rusqlite::Row) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: row.get(0)?, name: row.get(1)?, color: row.get(2)?,
        r#type: row.get(3)?, sub_type: row.get(4)?,
        is_fast: row.get::<_, i32>(5)? != 0,
    })
}

// ═══════════════════ Image Dimension Parsing ═══════════════════

fn image_dimensions(path: &str) -> Option<(i32, i32)> {
    let bytes = fs::read(path).ok()?;
    // PNG
    if bytes.len() > 24 && bytes[0..8] == [137, 80, 78, 71, 13, 10, 26, 10] {
        let w = u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]);
        let h = u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]);
        return Some((w as i32, h as i32));
    }
    // JPEG
    if bytes.len() > 4 && bytes[0..2] == [0xFF, 0xD8] {
        let mut pos = 2;
        while pos + 9 < bytes.len() {
            if bytes[pos] == 0xFF {
                let marker = bytes[pos + 1];
                if marker == 0xC0 || marker == 0xC1 || marker == 0xC2 {
                    let h = u16::from_be_bytes([bytes[pos + 5], bytes[pos + 6]]);
                    let w = u16::from_be_bytes([bytes[pos + 7], bytes[pos + 8]]);
                    return Some((w as i32, h as i32));
                }
                let seg_len = u16::from_be_bytes([bytes[pos + 2], bytes[pos + 3]]);
                pos += seg_len as usize + 2;
            } else {
                pos += 1;
            }
        }
    }
    None
}

fn map_proj_row(row: &rusqlite::Row) -> rusqlite::Result<Proj> {
    Ok(Proj {
        id: row.get(0)?, version: row.get(1)?, directory: row.get(2)?,
        name: row.get(3)?, main_version: row.get(4)?, desc: row.get(5)?,
        sort: row.get(6)?, is_delete: row.get::<_, i32>(7)? != 0,
        engine_id: row.get(8)?, icon: row.get(9)?,
        star: row.get::<_, i32>(10)? != 0,
    })
}

fn map_asset_row(row: &rusqlite::Row) -> rusqlite::Result<Asset> {
    Ok(Asset {
        id: row.get(0)?, directory: row.get(1)?, name: row.get(2)?,
        copy_right: row.get(3)?, link: row.get(4)?, desc: row.get(5)?,
        sort: row.get(6)?, is_delete: row.get::<_, i32>(7)? != 0,
        star: row.get::<_, i32>(8)? != 0,
    })
}

fn map_tool_row(row: &rusqlite::Row) -> rusqlite::Result<Tool> {
    Ok(Tool {
        id: row.get(0)?, directory: row.get(1)?, link: row.get(2)?,
        name: row.get(3)?, desc: row.get(4)?, sort: row.get(5)?,
        is_delete: row.get::<_, i32>(6)? != 0, icon: row.get(7)?,
        star: row.get::<_, i32>(8)? != 0,
    })
}

fn base64_encode(bytes: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

// ═══════════════════ Tests ═══════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        let cache_dir = std::env::temp_dir().join("gm-test-cache");
        let _ = fs::create_dir_all(&cache_dir);
        let mut db = Database { conn, cache_dir };
        db.init_tables().unwrap();
        db
    }

    #[test]
    fn test_add_engine() {
        let db = test_db();
        let e = Engine {
            id: String::new(), version: "4.2".into(), directory: "C:/godot.exe".into(),
            is_enc: false, enc_key: String::new(), has_console: true,
            console_dir: "C:/godot.console.exe".into(), name: "Godot 4.2".into(),
            is_default: false, main_version: 4, desc: "Test".into(),
            sort: 0, is_delete: false,
        };
        let id = db.add_engine(&e, &[]).unwrap();
        assert!(!id.is_empty());
        let fetched = db.get_engine_by_id(&id).unwrap();
        assert_eq!(fetched.name, "Godot 4.2");
    }

    #[test]
    fn test_add_diary_and_detail() {
        let db = test_db();
        let d = Diary { id: String::new(), name: "Dev Log".into(), desc: "".into(), proj_id: "".into(), sort: 0, is_delete: false };
        let did = db.add_diary(&d).unwrap();

        let detail = DiaryDetail { id: String::new(), create_date: "2026-06-11".into(), diary_id: did.clone(), content: "Test entry".into() };
        db.save_diary_detail(&detail).unwrap();

        let loaded = db.get_diary_detail(&did, "2026-06-11").unwrap();
        assert!(loaded.is_some());
        assert_eq!(loaded.unwrap().content, "Test entry");
    }

    #[test]
    fn test_tag_crud() {
        let db = test_db();
        let tag = db.insert_tag("game-dev", "ff0000", 0, 0).unwrap();
        assert_eq!(tag.name, "game-dev");

        let tags = db.list_tags(0, 0).unwrap();
        assert_eq!(tags.len(), 1);

        let found = db.query_tag_by_name_like("game", 0, 0).unwrap();
        assert_eq!(found.len(), 1);
    }

    #[test]
    
    // ─── Search Tests ───

    #[test]
    fn test_search_engines_by_name() {
        let db = test_db();
        let e = Engine { id: String::new(), version: "4.2".into(), directory: "C:/godot.exe".into(), is_enc: false, enc_key: String::new(), has_console: false, console_dir: String::new(), name: "Godot Engine 4.2".into(), is_default: false, main_version: 4, desc: "Test engine".into(), sort: 0, is_delete: false };
        db.add_engine(&e, &[]).unwrap();
        let result = db.search_engines("Godot", &[], None).unwrap();
        assert_eq!(result.items.len(), 1);
        assert_eq!(result.total, 1);
    }

    #[test]
    fn test_search_engines_pagination() {
        let db = test_db();
        for i in 0..5 {
            let e = Engine { id: String::new(), version: "4.0".into(), directory: format!("C:/godot{}.exe", i), is_enc: false, enc_key: String::new(), has_console: false, console_dir: String::new(), name: format!("Godot {}", i), is_default: false, main_version: 4, desc: String::new(), sort: 0, is_delete: false };
            db.add_engine(&e, &[]).unwrap();
        }
        let page = Page { index: 1, size: 2 };
        let result = db.search_engines("Godot", &[], Some(&page)).unwrap();
        assert_eq!(result.items.len(), 2);
        assert_eq!(result.total, 5);
    }

    #[test]
    fn test_search_assets() {
        let db = test_db();
        let a = Asset { id: String::new(), directory: "C:/assets".into(), name: "Texture Pack".into(), copy_right: "CC0".into(), link: "https://example.com".into(), desc: "A nice texture pack".into(), sort: 0, is_delete: false, star: false };
        db.add_asset(&a, &[], &[]).unwrap();
        let result = db.search_assets("Texture", &[], None).unwrap();
        assert_eq!(result.items.len(), 1);
        let result = db.search_assets("CC0", &[], None).unwrap();
        assert_eq!(result.items.len(), 1);
        let result = db.search_assets("example.com", &[], None).unwrap();
        assert_eq!(result.items.len(), 1);
    }

    #[test]
    fn test_search_tools() {
        let db = test_db();
        let t = Tool { id: String::new(), directory: "C:/blender.exe".into(), link: "https://blender.org".into(), name: "Blender".into(), desc: "3D modeling".into(), sort: 0, is_delete: false, icon: String::new(), star: false };
        db.add_tool(&t, &[], &[]).unwrap();
        let result = db.search_tools("Blender", &[], None).unwrap();
        assert_eq!(result.items.len(), 1);
    }

    #[test]
    
    #[test]
    
    #[test]
    fn test_search_projs_with_tag_filter() {
        let db = test_db();

        // Create a tag
        let tag = db.insert_tag("mono", "ff0000", 1, 0).unwrap();

        // Create a proj WITH the tag
        let p1 = Proj { id: String::new(), version: "4.2".into(), directory: "C:/proj_mono".into(), name: "MonoProject".into(), main_version: 4, desc: "Has mono".into(), sort: 0, is_delete: false, engine_id: String::new(), icon: String::new(), star: false };
        db.add_proj(&p1, &[tag.id.clone()], &[]).unwrap();

        // Create a proj WITHOUT the tag
        let p2 = Proj { id: String::new(), version: "4.0".into(), directory: "C:/proj_std".into(), name: "StandardProject".into(), main_version: 4, desc: "Standard".into(), sort: 0, is_delete: false, engine_id: String::new(), icon: String::new(), star: false };
        db.add_proj(&p2, &[], &[]).unwrap();

        // Without tag → both
        let r = db.search_projs("Project", &[], None).unwrap();
        assert_eq!(r.items.len(), 2, "Proj: no tags → both");

        // With tag → only mono
        let r = db.search_projs("Project", &[tag.id.clone()], None).unwrap();
        assert_eq!(r.items.len(), 1, "Proj: with tag → only mono");
        assert_eq!(r.items[0].entity.name, "MonoProject");

        // Empty search + tag → still only mono
        let r = db.search_projs("", &[tag.id.clone()], None).unwrap();
        assert_eq!(r.items.len(), 1, "Proj: empty + tag → mono");

        // Non-matching tag → nothing
        let t2 = db.insert_tag("csharp", "00ff00", 1, 0).unwrap();
        let r = db.search_projs("Project", &[t2.id.clone()], None).unwrap();
        assert_eq!(r.items.len(), 0, "Proj: non-matching tag → 0");
    }fn test_search_engines_with_tag_filter() {
        let db = test_db();

        // Create a tag
        let tag = db.insert_tag("mono", "ff0000", 0, 0).unwrap();

        // Create an engine WITH the tag
        let e1 = Engine { id: String::new(), version: "4.2".into(), directory: "C:/godot_mono.exe".into(), is_enc: false, enc_key: String::new(), has_console: false, console_dir: String::new(), name: "Godot Mono".into(), is_default: false, main_version: 4, desc: "Has mono".into(), sort: 0, is_delete: false };
        let id1 = db.add_engine(&e1, &[tag.id.clone()]).unwrap();

        // Create an engine WITHOUT the tag
        let e2 = Engine { id: String::new(), version: "4.0".into(), directory: "C:/godot_std.exe".into(), is_enc: false, enc_key: String::new(), has_console: false, console_dir: String::new(), name: "Godot Standard".into(), is_default: false, main_version: 4, desc: "Standard".into(), sort: 0, is_delete: false };
        db.add_engine(&e2, &[]).unwrap();

        // Search WITHOUT tag filter → should find both
        let result = db.search_engines("Godot", &[], None).unwrap();
        assert_eq!(result.items.len(), 2, "Without tag filter, should find both engines");

        // Search WITH tag filter → should find only the mono one
        let result = db.search_engines("Godot", &[tag.id.clone()], None).unwrap();
        assert_eq!(result.items.len(), 1, "With tag filter, should find only mono engine");
        assert_eq!(result.items[0].entity.name, "Godot Mono", "Should match the mono engine");

        // Search WITH tag filter but empty text → should still find mono
        let result = db.search_engines("", &[tag.id.clone()], None).unwrap();
        assert_eq!(result.items.len(), 1, "Empty search with tag should find mono");
        assert_eq!(result.total, 1);

        // Search WITH non-matching tag → should find nothing
        let other_tag = db.insert_tag("csharp", "00ff00", 0, 0).unwrap();
        let result = db.search_engines("Godot", &[other_tag.id.clone()], None).unwrap();
        assert_eq!(result.items.len(), 0, "Non-matching tag should find nothing");
    }fn test_list_all_engines() {
        let db = test_db();
        for i in 0..3 {
            let e = Engine { id: String::new(), version: "4.0".into(), directory: format!("C:/godot{}.exe", i), is_enc: false, enc_key: String::new(), has_console: false, console_dir: String::new(), name: format!("Godot {}", i), is_default: false, main_version: 4, desc: String::new(), sort: 0, is_delete: false };
            db.add_engine(&e, &[]).unwrap();
        }
        let items = db.list_all_engines().unwrap();
        assert_eq!(items.len(), 3);
    }
fn test_copy_to_cache() {
        let db = test_db();
        let temp_dir = std::env::temp_dir();
        let src = temp_dir.join("test-icon.png");
        let png_bytes: &[u8] = &[
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x00, 0x00,
            0x00, 0x02, 0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
            0xAE, 0x42, 0x60, 0x82,
        ];
        fs::write(&src, png_bytes).unwrap();
        let img = db.copy_to_cache(&src.to_string_lossy()).unwrap();
        assert_eq!(img.width, 1);
        assert_eq!(img.height, 1);
        let _ = fs::remove_file(&src);
    }
}






