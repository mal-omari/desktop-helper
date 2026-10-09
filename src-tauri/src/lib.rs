use log::info;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::process::Command;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewWindow,
};

#[derive(Default)]
struct AppState {
    shortcut_registered: Mutex<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ShellResult {
    stdout: String,
    stderr: String,
    code: i32,
}

#[tauri::command]
fn append_scratchpad(app: AppHandle, text: String) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("scratchpad.md");
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    writeln!(file, "{}", text).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn read_scratchpad(app: AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let path = dir.join("scratchpad.md");
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn run_approved_shell(command: String) -> Result<ShellResult, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Command is empty".into());
    }

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", trimmed])
            .output()
            .map_err(|e| e.to_string())?
    } else {
        Command::new("sh")
            .args(["-c", trimmed])
            .output()
            .map_err(|e| e.to_string())?
    };

    Ok(ShellResult {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
fn toggle_main_window(window: WebviewWindow) -> Result<(), String> {
    if window.is_visible().map_err(|e| e.to_string())? {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_main_window(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn navigate_main(app: AppHandle, view: String) -> Result<(), String> {
    app.emit("navigate", view).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_shortcut_registered(state: State<'_, AppState>, registered: bool) {
    if let Ok(mut guard) = state.shortcut_registered.lock() {
        *guard = registered;
    }
}

#[tauri::command]
fn is_shortcut_registered(state: State<'_, AppState>) -> bool {
    state
        .shortcut_registered
        .lock()
        .map(|g| *g)
        .unwrap_or(false)
}

fn focus_or_toggle(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = if window.is_visible().unwrap_or(false) {
            window.hide()
        } else {
            window.show().and_then(|_| window.set_focus())
        };
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            append_scratchpad,
            read_scratchpad,
            run_approved_shell,
            toggle_main_window,
            show_main_window,
            navigate_main,
            set_shortcut_registered,
            is_shortcut_registered,
        ])
        .setup(|app| {
            let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &settings_i, &quit_i])?;

            let icon = app
                .default_window_icon()
                .cloned()
                .expect("default tray icon");

            let app_handle = app.handle().clone();
            TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("Desktop Helper")
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("navigate", "chat");
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("navigate", "settings");
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        focus_or_toggle(tray.app_handle());
                    }
                })
                .build(app)?;

            info!("Desktop Helper started");
            let _ = app_handle;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
