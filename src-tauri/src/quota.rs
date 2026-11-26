use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const CLI_TIMEOUT_SECS: u64 = 18;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QuotaWindow {
    pub id: String,
    pub label: String,
    pub window_kind: String, // "5h" | "weekly" | "other"
    pub remaining_percent: f64,
    pub reset_at: Option<String>,
    pub reset_at_epoch: Option<i64>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QuotaModelGroup {
    pub name: String,
    pub description: Option<String>,
    pub five_hour: Option<QuotaWindow>,
    pub weekly: Option<QuotaWindow>,
    pub extra_windows: Vec<QuotaWindow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProviderQuota {
    pub provider: String, // "codex" | "antigravity"
    pub status: String,   // "ok" | "error"
    pub error: Option<String>,
    pub account_email: Option<String>,
    pub plan_type: Option<String>,
    pub plan_expires_at: Option<String>,
    pub credits_balance: Option<String>,
    pub credits_unlimited: bool,
    pub five_hour: Option<QuotaWindow>,
    pub weekly: Option<QuotaWindow>,
    pub groups: Vec<QuotaModelGroup>,
}

impl ProviderQuota {
    fn error(provider: &str, message: impl Into<String>) -> Self {
        Self {
            provider: provider.to_string(),
            status: "error".to_string(),
            error: Some(message.into()),
            account_email: None,
            plan_type: None,
            plan_expires_at: None,
            credits_balance: None,
            credits_unlimited: false,
            five_hour: None,
            weekly: None,
            groups: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QuotaSnapshot {
    pub fetched_at: i64, // Unix epoch ms
    pub codex: ProviderQuota,
    pub antigravity: ProviderQuota,
}

#[derive(Default)]
pub struct QuotaState(Mutex<Option<QuotaSnapshot>>);

impl QuotaState {
    pub fn get(&self) -> Option<QuotaSnapshot> {
        self.0.lock().unwrap().clone()
    }

    pub fn set(&self, snapshot: QuotaSnapshot) {
        *self.0.lock().unwrap() = Some(snapshot);
    }
}

/// Fetch both Codex CLI and Antigravity CLI quotas in parallel.
pub fn fetch_all_quotas() -> QuotaSnapshot {
    let (codex, antigravity) = std::thread::scope(|s| {
        let codex_handle = s.spawn(fetch_codex_quota);
        let agy_handle = s.spawn(fetch_antigravity_quota);
        let codex = codex_handle
            .join()
            .unwrap_or_else(|_| ProviderQuota::error("codex", "Codex query thread panicked"));
        let antigravity = agy_handle
            .join()
            .unwrap_or_else(|_| ProviderQuota::error("antigravity", "Antigravity query thread panicked"));
        (codex, antigravity)
    });

    let fetched_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);

    QuotaSnapshot {
        fetched_at,
        codex,
        antigravity,
    }
}

fn configure_hidden_command(cmd: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = cmd;
    }
}

fn resolve_codex_binary() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let candidate = PathBuf::from(local_app_data)
                .join("Programs")
                .join("OpenAI")
                .join("Codex")
                .join("bin")
                .join("codex.exe");
            if candidate.is_file() {
                return candidate;
            }
        }
    }
    PathBuf::from("codex")
}

fn resolve_agy_binary() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let candidate = PathBuf::from(local_app_data)
                .join("agy")
                .join("bin")
                .join("agy.exe");
            if candidate.is_file() {
                return candidate;
            }
        }
    }
    PathBuf::from("agy")
}

// ───────────────────────────── Codex CLI ─────────────────────────────

fn fetch_codex_quota() -> ProviderQuota {
    match fetch_codex_quota_inner() {
        Ok(q) => q,
        Err(err) => ProviderQuota::error("codex", err),
    }
}

fn fetch_codex_quota_inner() -> Result<ProviderQuota, String> {
    let bin = resolve_codex_binary();
    let mut cmd = Command::new(&bin);
    cmd.args(["app-server", "--stdio"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_hidden_command(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("无法启动 Codex CLI ({}): {e}", bin.display()))?;

    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法打开 Codex CLI stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法打开 Codex CLI stdout".to_string())?;
    let stderr = child.stderr.take();

    let (tx, rx) = mpsc::channel::<String>();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            if tx.send(line).is_err() {
                break;
            }
        }
    });

    let stderr_handle = stderr.map(|err_pipe| {
        std::thread::spawn(move || {
            let mut buf = String::new();
            let mut reader = BufReader::new(err_pipe);
            let _ = std::io::Read::read_to_string(&mut reader, &mut buf);
            buf
        })
    });

    let write_line = |stdin: &mut std::process::ChildStdin, payload: &str| -> Result<(), String> {
        writeln!(stdin, "{payload}").map_err(|e| format!("写入 Codex CLI 失败: {e}"))?;
        stdin.flush().map_err(|e| format!("刷新 Codex CLI 管道失败: {e}"))
    };

    write_line(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"clientInfo":{"name":"godot-memory","version":"2.1.4"}}}"#,
    )?;

    let deadline = Instant::now() + Duration::from_secs(CLI_TIMEOUT_SECS);

    let wait_for_init = || -> Result<(), String> {
        loop {
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                return Err("Codex CLI 初始化超时".to_string());
            }
            let line = rx
                .recv_timeout(remaining)
                .map_err(|_| "Codex CLI 初始化无响应".to_string())?;
            if let Ok(val) = serde_json::from_str::<Value>(&line) {
                if val.get("id").and_then(Value::as_i64) == Some(1) {
                    if let Some(err) = val.get("error") {
                        return Err(format!("Codex CLI 初始化失败: {err}"));
                    }
                    return Ok(());
                }
            }
        }
    };

    if let Err(err) = wait_for_init() {
        let _ = child.kill();
        let _ = child.wait();
        return Err(err);
    }

    write_line(&mut stdin, r#"{"jsonrpc":"2.0","method":"initialized","params":{}}"#)?;
    write_line(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":2,"method":"account/read","params":{"refreshToken":false}}"#,
    )?;
    write_line(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":3,"method":"account/rateLimits/read","params":{}}"#,
    )?;

    let mut account_resp: Option<Value> = None;
    let mut rate_limits_resp: Option<Value> = None;

    while account_resp.is_none() || rate_limits_resp.is_none() {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            break;
        }
        match rx.recv_timeout(remaining) {
            Ok(line) => {
                if let Ok(val) = serde_json::from_str::<Value>(&line) {
                    match val.get("id").and_then(Value::as_i64) {
                        Some(2) => account_resp = Some(val),
                        Some(3) => rate_limits_resp = Some(val),
                        _ => {}
                    }
                }
            }
            Err(_) => break,
        }
    }

    drop(stdin);
    let _ = child.kill();
    let _ = child.wait();

    let stderr_text = stderr_handle
        .and_then(|h| h.join().ok())
        .unwrap_or_default();

    let rate_limits_val = match rate_limits_resp {
        Some(v) => v,
        None => {
            let detail = stderr_text.trim();
            if detail.is_empty() {
                return Err("Codex CLI 查询配额超时或未返回结果".to_string());
            }
            return Err(format!("Codex CLI 查询配额失败: {}", truncate_error(detail)));
        }
    };

    if let Some(err) = rate_limits_val.get("error") {
        let msg = err
            .get("message")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| err.to_string());
        return Err(format!("Codex CLI 返回错误: {msg}"));
    }

    let subscription_expiry = read_codex_subscription_expiry();
    parse_codex_responses(
        account_resp.as_ref(),
        &rate_limits_val,
        subscription_expiry,
    )
}

fn parse_codex_responses(
    account_resp: Option<&Value>,
    rate_limits_resp: &Value,
    subscription_expiry: Option<String>,
) -> Result<ProviderQuota, String> {
    let result = rate_limits_resp
        .get("result")
        .ok_or_else(|| "Codex CLI 响应缺少 result 字段".to_string())?;

    let account = account_resp
        .and_then(|v| v.get("result"))
        .and_then(|r| r.get("account"));

    let account_email = account
        .and_then(|a| a.get("email"))
        .and_then(Value::as_str)
        .map(str::to_string);

    let rate_limits = result.get("rateLimits");
    let raw_plan = rate_limits
        .and_then(|r| r.get("planType"))
        .and_then(Value::as_str)
        .or_else(|| account.and_then(|a| a.get("planType")).and_then(Value::as_str));
    let plan_type = raw_plan.map(format_plan_name);

    let credits = rate_limits.and_then(|r| r.get("credits"));
    let credits_unlimited = credits
        .and_then(|c| c.get("unlimited"))
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let credits_balance = credits.and_then(|c| {
        if c.get("unlimited").and_then(Value::as_bool) == Some(true) {
            Some("Unlimited".to_string())
        } else if c.get("hasCredits").and_then(Value::as_bool) == Some(true) {
            c.get("balance").and_then(Value::as_str).map(str::to_string)
        } else {
            c.get("balance").and_then(Value::as_str).map(str::to_string)
        }
    });

    let (five_hour, weekly, extra_primary) = rate_limits
        .map(extract_codex_windows)
        .unwrap_or((None, None, Vec::new()));

    let mut groups = Vec::new();
    groups.push(QuotaModelGroup {
        name: "Codex".to_string(),
        description: None,
        five_hour: five_hour.clone(),
        weekly: weekly.clone(),
        extra_windows: extra_primary,
    });

    if let Some(by_id) = result.get("rateLimitsByLimitId").and_then(Value::as_object) {
        let primary_limit_id = rate_limits
            .and_then(|r| r.get("limitId"))
            .and_then(Value::as_str)
            .unwrap_or("codex");
        for (limit_id, snap) in by_id {
            if limit_id == primary_limit_id {
                continue;
            }
            let (g_5h, g_wk, g_extra) = extract_codex_windows(snap);
            if g_5h.is_none() && g_wk.is_none() && g_extra.is_empty() {
                continue;
            }
            let display_name = snap
                .get("limitName")
                .and_then(Value::as_str)
                .or_else(|| snap.get("normalModelSlug").and_then(Value::as_str))
                .unwrap_or(limit_id.as_str())
                .to_string();
            groups.push(QuotaModelGroup {
                name: display_name,
                description: None,
                five_hour: g_5h,
                weekly: g_wk,
                extra_windows: g_extra,
            });
        }
    }

    if five_hour.is_none() && weekly.is_none() {
        return Err("Codex CLI 未返回可用的限额窗口数据".to_string());
    }

    Ok(ProviderQuota {
        provider: "codex".to_string(),
        status: "ok".to_string(),
        error: None,
        account_email,
        plan_type,
        plan_expires_at: subscription_expiry,
        credits_balance,
        credits_unlimited,
        five_hour,
        weekly,
        groups,
    })
}

fn extract_codex_windows(snapshot: &Value) -> (Option<QuotaWindow>, Option<QuotaWindow>, Vec<QuotaWindow>) {
    let mut five_hour = None;
    let mut weekly = None;
    let mut extra = Vec::new();

    for key in ["primary", "secondary"] {
        if let Some(win_val) = snapshot.get(key) {
            if let Some(window) = parse_codex_window(key, win_val) {
                match window.window_kind.as_str() {
                    "5h" if five_hour.is_none() => five_hour = Some(window),
                    "weekly" if weekly.is_none() => weekly = Some(window),
                    _ => extra.push(window),
                }
            }
        }
    }

    (five_hour, weekly, extra)
}

fn parse_codex_window(id: &str, value: &Value) -> Option<QuotaWindow> {
    let used = value.get("usedPercent")?.as_f64()?;
    let remaining_percent = (100.0 - used).clamp(0.0, 100.0);
    let duration_mins = value
        .get("windowDurationMins")
        .and_then(Value::as_i64)
        .unwrap_or(0);
    let (window_kind, label) = if duration_mins > 0 && duration_mins <= 600 {
        ("5h".to_string(), format!("{}h", (duration_mins + 30) / 60))
    } else if duration_mins >= 5760 {
        ("weekly".to_string(), "weekly".to_string())
    } else if id == "primary" {
        ("5h".to_string(), "5h".to_string())
    } else if id == "secondary" {
        ("weekly".to_string(), "weekly".to_string())
    } else {
        ("other".to_string(), id.to_string())
    };

    let reset_at_epoch = value
        .get("resetsAt")
        .and_then(Value::as_i64)
        .filter(|&ts| ts > 86400);
    let reset_at = reset_at_epoch.map(epoch_to_iso8601);

    Some(QuotaWindow {
        id: id.to_string(),
        label,
        window_kind,
        remaining_percent,
        reset_at,
        reset_at_epoch,
        description: None,
    })
}

fn read_codex_subscription_expiry() -> Option<String> {
    let home = std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))?;
    let auth_path = PathBuf::from(home).join(".codex").join("auth.json");
    let content = std::fs::read_to_string(auth_path).ok()?;
    let json: Value = serde_json::from_str(&content).ok()?;
    let id_token = json.pointer("/tokens/id_token")?.as_str()?;
    let payload_b64 = id_token.split('.').nth(1)?;
    let decoded = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload_b64)
        .ok()?;
    let claims: Value = serde_json::from_slice(&decoded).ok()?;
    let until = claims
        .get("https://api.openai.com/auth")?
        .get("chatgpt_subscription_active_until")?
        .as_str()?;
    if until.trim().is_empty() {
        None
    } else {
        Some(until.to_string())
    }
}

fn format_plan_name(raw: &str) -> String {
    match raw.to_ascii_lowercase().as_str() {
        "free" => "Free".to_string(),
        "plus" => "Plus".to_string(),
        "pro" => "Pro".to_string(),
        "prolite" => "Pro Lite".to_string(),
        "promax" => "Pro Max".to_string(),
        "team" => "Team".to_string(),
        "business" => "Business".to_string(),
        "enterprise" => "Enterprise".to_string(),
        "edu" => "Edu".to_string(),
        other => other.to_string(),
    }
}

// ───────────────────────────── Antigravity CLI ─────────────────────────────

fn fetch_antigravity_quota() -> ProviderQuota {
    match fetch_antigravity_quota_inner() {
        Ok(q) => q,
        Err(err) => ProviderQuota::error("antigravity", err),
    }
}

fn fetch_antigravity_quota_inner() -> Result<ProviderQuota, String> {
    let bin = resolve_agy_binary();

    let (usage_res, credits_res) = std::thread::scope(|s| {
        let u = s.spawn(|| run_agy_command(&bin, "/usage"));
        let c = s.spawn(|| run_agy_command(&bin, "/credits"));
        (
            u.join().unwrap_or_else(|_| Err("Antigravity /usage 线程异常".to_string())),
            c.join().unwrap_or_else(|_| Err("Antigravity /credits 线程异常".to_string())),
        )
    });

    let usage_json = usage_res?;
    let credits_json = credits_res.ok();

    parse_antigravity_responses(&usage_json, credits_json.as_ref())
}

fn run_agy_command(bin: &PathBuf, slash_cmd: &str) -> Result<Value, String> {
    let mut cmd = Command::new(bin);
    cmd.args([
        "-p",
        slash_cmd,
        "--output-format",
        "json",
        "--print-timeout",
        "15s",
    ])
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());

    // Strip ACP / SSH harness overrides so desktop app uses the user's real agy login.
    for key in [
        "SSH_CONNECTION",
        "SSH_CLIENT",
        "SSH_TTY",
        "AGY_ACP_FORCE_FILE_STORAGE",
        "GEMINI_HOME",
        "ANTIGRAVITY_APP_DATA_DIR",
        "ANTIGRAVITY_LS_ADDRESS",
        "ANTIGRAVITY_AGENT",
        "ANTIGRAVITY_CONVERSATION_ID",
        "ANTIGRAVITY_TRAJECTORY_ID",
        "ANTIGRAVITY_PROJECT_ID",
    ] {
        cmd.env_remove(key);
    }
    configure_hidden_command(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("无法启动 Antigravity CLI ({}): {e}", bin.display()))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法打开 Antigravity CLI stdout".to_string())?;
    let stderr = child.stderr.take();

    let out_handle = std::thread::spawn(move || {
        let mut buf = String::new();
        let mut reader = BufReader::new(stdout);
        let _ = std::io::Read::read_to_string(&mut reader, &mut buf);
        buf
    });
    let err_handle = stderr.map(|err_pipe| {
        std::thread::spawn(move || {
            let mut buf = String::new();
            let mut reader = BufReader::new(err_pipe);
            let _ = std::io::Read::read_to_string(&mut reader, &mut buf);
            buf
        })
    });

    let deadline = Instant::now() + Duration::from_secs(CLI_TIMEOUT_SECS);
    let status = loop {
        match child.try_wait() {
            Ok(Some(st)) => break Some(st),
            Ok(None) => {
                if Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    break None;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(e) => {
                let _ = child.kill();
                return Err(format!("等待 Antigravity CLI 失败: {e}"));
            }
        }
    };

    let out_text = out_handle.join().unwrap_or_default();
    let err_text = err_handle.and_then(|h| h.join().ok()).unwrap_or_default();

    let Some(exit_status) = status else {
        return Err(format!("Antigravity CLI ({slash_cmd}) 查询超时，请确认已登录 agy"));
    };

    if !exit_status.success() {
        let combined = if !err_text.trim().is_empty() {
            err_text.trim().to_string()
        } else {
            out_text.trim().to_string()
        };
        if combined.contains("Authentication required") || combined.contains("sign in") {
            return Err("Antigravity CLI 未登录，请先在终端运行 agy 登录".to_string());
        }
        return Err(format!(
            "Antigravity CLI ({slash_cmd}) 执行失败: {}",
            truncate_error(&combined)
        ));
    }

    // Parse last non-empty JSON line or whole output
    let trimmed = out_text.trim();
    if trimmed.is_empty() {
        return Err(format!("Antigravity CLI ({slash_cmd}) 返回空输出"));
    }

    serde_json::from_str::<Value>(trimmed).or_else(|_| {
        trimmed
            .lines()
            .rev()
            .find_map(|line| serde_json::from_str::<Value>(line.trim()).ok())
            .ok_or_else(|| {
                format!(
                    "无法解析 Antigravity CLI ({slash_cmd}) JSON 输出: {}",
                    truncate_error(trimmed)
                )
            })
    })
}

fn parse_antigravity_responses(
    usage_json: &Value,
    credits_json: Option<&Value>,
) -> Result<ProviderQuota, String> {
    if let Some(status) = usage_json.get("status").and_then(Value::as_str) {
        if status != "SUCCESS" {
            let err = usage_json
                .get("error")
                .and_then(Value::as_str)
                .unwrap_or("未知错误");
            return Err(format!("Antigravity CLI 返回失败状态 ({status}): {err}"));
        }
    }

    let groups_val = usage_json
        .pointer("/command/data/groups")
        .and_then(Value::as_array)
        .ok_or_else(|| "Antigravity CLI /usage 响应缺少 groups 数据".to_string())?;

    let mut groups = Vec::new();
    for g in groups_val {
        let name = g
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or("Models")
            .to_string();
        let description = g
            .get("description")
            .and_then(Value::as_str)
            .map(str::to_string);

        let mut five_hour = None;
        let mut weekly = None;
        let mut extra_windows = Vec::new();

        if let Some(buckets) = g.get("buckets").and_then(Value::as_array) {
            for b in buckets {
                let id = b
                    .get("id")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                let label = b
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or(&id)
                    .to_string();
                let raw_window = b.get("window").and_then(Value::as_str).unwrap_or("");
                let window_kind = match raw_window {
                    "5h" => "5h".to_string(),
                    "weekly" => "weekly".to_string(),
                    _ => {
                        if id.contains("5h") {
                            "5h".to_string()
                        } else if id.contains("weekly") {
                            "weekly".to_string()
                        } else {
                            "other".to_string()
                        }
                    }
                };
                let remaining_percent = b
                    .get("remaining_fraction")
                    .and_then(Value::as_f64)
                    .map(|f| (f * 100.0).clamp(0.0, 100.0))
                    .unwrap_or(0.0);

                let raw_reset = b.get("reset_time").and_then(Value::as_str);
                let (reset_at, reset_at_epoch) = match raw_reset {
                    Some(ts) if !ts.starts_with("1970-01-01") && !ts.is_empty() => {
                        let epoch = parse_iso8601_utc(ts).filter(|&e| e > 86400);
                        if epoch.is_some() {
                            (Some(ts.to_string()), epoch)
                        } else {
                            (Some(ts.to_string()), None)
                        }
                    }
                    _ => (None, None),
                };

                let bucket_desc = b
                    .get("description")
                    .and_then(Value::as_str)
                    .map(str::to_string);

                let win = QuotaWindow {
                    id,
                    label,
                    window_kind: window_kind.clone(),
                    remaining_percent,
                    reset_at,
                    reset_at_epoch,
                    description: bucket_desc,
                };

                match window_kind.as_str() {
                    "5h" if five_hour.is_none() => five_hour = Some(win),
                    "weekly" if weekly.is_none() => weekly = Some(win),
                    _ => extra_windows.push(win),
                }
            }
        }

        groups.push(QuotaModelGroup {
            name,
            description,
            five_hour,
            weekly,
            extra_windows,
        });
    }

    // Prefer Gemini Models group for top-level capsule summary, fallback to first group.
    let primary_group = groups
        .iter()
        .find(|g| g.name.to_ascii_lowercase().contains("gemini"))
        .or_else(|| groups.first());

    let five_hour = primary_group.and_then(|g| g.five_hour.clone());
    let weekly = primary_group.and_then(|g| g.weekly.clone());

    let credits_balance = credits_json
        .and_then(|v| v.pointer("/command/data/remaining_credits"))
        .and_then(|c| {
            c.as_i64()
                .map(|n| n.to_string())
                .or_else(|| c.as_f64().map(|n| format!("{n:.0}")))
                .or_else(|| c.as_str().map(str::to_string))
        });

    Ok(ProviderQuota {
        provider: "antigravity".to_string(),
        status: "ok".to_string(),
        error: None,
        account_email: None,
        plan_type: Some("Antigravity".to_string()),
        plan_expires_at: None,
        credits_balance,
        credits_unlimited: false,
        five_hour,
        weekly,
        groups,
    })
}

// ───────────────────────────── Time Helpers ─────────────────────────────

fn truncate_error(s: &str) -> String {
    const MAX: usize = 200;
    let first_line = s.lines().find(|l| !l.trim().is_empty()).unwrap_or(s).trim();
    if first_line.chars().count() <= MAX {
        first_line.to_string()
    } else {
        let prefix: String = first_line.chars().take(MAX).collect();
        format!("{prefix}…")
    }
}

/// Convert Unix epoch seconds to RFC3339 UTC string (YYYY-MM-DDTHH:MM:SSZ).
pub fn epoch_to_iso8601(secs: i64) -> String {
    let days = secs.div_euclid(86_400);
    let rem = secs.rem_euclid(86_400);
    let hour = rem / 3600;
    let minute = (rem % 3600) / 60;
    let second = rem % 60;

    // Howard Hinnant's civil-from-days algorithm
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = y + i64::from(m <= 2);

    format!("{year:04}-{m:02}-{d:02}T{hour:02}:{minute:02}:{second:02}Z")
}

/// Parse RFC3339 UTC string (e.g. "2026-12-02T11:45:05Z") to Unix epoch seconds.
pub fn parse_iso8601_utc(s: &str) -> Option<i64> {
    let s = s.trim();
    if s.len() < 20 || !s.ends_with('Z') {
        return None;
    }
    let year: i64 = s.get(0..4)?.parse().ok()?;
    let month: u32 = s.get(5..7)?.parse().ok()?;
    let day: u32 = s.get(8..10)?.parse().ok()?;
    let hour: i64 = s.get(11..13)?.parse().ok()?;
    let minute: i64 = s.get(14..16)?.parse().ok()?;
    let second: i64 = s.get(17..19)?.parse().ok()?;

    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }

    // Howard Hinnant's days-from-civil algorithm
    let y = year - i64::from(month <= 2);
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as u64;
    let m = month as u64;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + day as u64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146_097 + doe as i64 - 719_468;

    Some(days * 86_400 + hour * 3600 + minute * 60 + second)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_iso8601_roundtrip() {
        let ts = "2026-12-02T11:45:05Z";
        let epoch = parse_iso8601_utc(ts).expect("valid utc");
        assert_eq!(epoch_to_iso8601(epoch), ts);

        let ts2 = "2024-02-29T23:59:59Z";
        let epoch2 = parse_iso8601_utc(ts2).expect("leap day");
        assert_eq!(epoch_to_iso8601(epoch2), ts2);
    }

    #[test]
    fn test_parse_codex_responses() {
        let account: Value = serde_json::json!({
            "id": 2,
            "result": {
                "account": {
                    "type": "chatgpt",
                    "email": "dev@example.com",
                    "planType": "plus"
                }
            }
        });
        let rate_limits: Value = serde_json::json!({
            "id": 3,
            "result": {
                "rateLimits": {
                    "limitId": "codex",
                    "primary": { "usedPercent": 15, "windowDurationMins": 300, "resetsAt": 1795680535 },
                    "secondary": { "usedPercent": 80, "windowDurationMins": 10080, "resetsAt": 1796020782 },
                    "credits": { "hasCredits": false, "unlimited": false, "balance": "0" },
                    "planType": "plus"
                },
                "rateLimitsByLimitId": {
                    "codex": {
                        "limitId": "codex",
                        "primary": { "usedPercent": 15, "windowDurationMins": 300, "resetsAt": 1795680535 },
                        "secondary": { "usedPercent": 80, "windowDurationMins": 10080, "resetsAt": 1796020782 }
                    }
                }
            }
        });

        let parsed = parse_codex_responses(Some(&account), &rate_limits, Some("2026-12-31T00:00:00Z".into())).unwrap();
        assert_eq!(parsed.status, "ok");
        assert_eq!(parsed.account_email.as_deref(), Some("dev@example.com"));
        assert_eq!(parsed.plan_type.as_deref(), Some("Plus"));
        assert_eq!(parsed.plan_expires_at.as_deref(), Some("2026-12-31T00:00:00Z"));
        assert_eq!(parsed.five_hour.as_ref().unwrap().remaining_percent, 85.0);
        assert_eq!(parsed.weekly.as_ref().unwrap().remaining_percent, 20.0);
        assert_eq!(parsed.groups.len(), 1);
    }

    #[test]
    fn test_parse_antigravity_responses() {
        let usage: Value = serde_json::json!({
            "status": "SUCCESS",
            "command": {
                "name": "usage",
                "data": {
                    "groups": [
                        {
                            "name": "Gemini Models",
                            "description": "Models within this group: Gemini 4 Neon",
                            "buckets": [
                                {
                                    "id": "gemini-weekly",
                                    "name": "Weekly Limit Remaining",
                                    "window": "weekly",
                                    "remaining_fraction": 0.7945,
                                    "reset_time": "2026-12-02T11:45:05Z"
                                },
                                {
                                    "id": "gemini-5h",
                                    "name": "Five Hour Limit Remaining",
                                    "window": "5h",
                                    "remaining_fraction": 0.3012,
                                    "reset_time": "2026-11-26T04:19:50Z"
                                }
                            ]
                        },
                        {
                            "name": "Claude and GPT models",
                            "buckets": [
                                {
                                    "id": "3p-weekly",
                                    "name": "Weekly Limit Remaining",
                                    "window": "weekly",
                                    "remaining_fraction": 1.0,
                                    "reset_time": "1970-01-01T00:00:00Z"
                                },
                                {
                                    "id": "3p-5h",
                                    "name": "Five Hour Limit Remaining",
                                    "window": "5h",
                                    "remaining_fraction": 1.0,
                                    "reset_time": "1970-01-01T00:00:00Z"
                                }
                            ]
                        }
                    ]
                }
            }
        });
        let credits: Value = serde_json::json!({
            "status": "SUCCESS",
            "command": {
                "name": "credits",
                "data": { "remaining_credits": 42 }
            }
        });

        let parsed = parse_antigravity_responses(&usage, Some(&credits)).unwrap();
        assert_eq!(parsed.status, "ok");
        assert_eq!(parsed.credits_balance.as_deref(), Some("42"));
        assert!((parsed.five_hour.as_ref().unwrap().remaining_percent - 30.12).abs() < 0.01);
        assert!((parsed.weekly.as_ref().unwrap().remaining_percent - 79.45).abs() < 0.01);
        assert_eq!(parsed.groups.len(), 2);
        assert!(parsed.groups[1].five_hour.as_ref().unwrap().reset_at.is_none());
    }

    #[test]
    #[ignore = "invokes locally installed codex and agy CLIs"]
    fn test_live_fetch_all_quotas() {
        let snapshot = fetch_all_quotas();
        println!("{}", serde_json::to_string_pretty(&snapshot).unwrap());
        assert_eq!(snapshot.codex.status, "ok", "codex error: {:?}", snapshot.codex.error);
        assert_eq!(snapshot.antigravity.status, "ok", "antigravity error: {:?}", snapshot.antigravity.error);
        assert!(snapshot.codex.five_hour.is_some());
        assert!(snapshot.codex.weekly.is_some());
        assert!(snapshot.antigravity.five_hour.is_some());
        assert!(snapshot.antigravity.weekly.is_some());
    }
}
