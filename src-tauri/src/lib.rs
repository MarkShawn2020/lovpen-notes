use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use uuid::Uuid;

mod note_store;
use note_store::{store_temp_note, get_temp_note, remove_temp_note, get_all_temp_notes, clear_temp_notes};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    id: String,
    content: String,
    title: Option<String>,
    tags: Vec<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    version: u32,
    parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteVersion {
    id: String,
    note_id: String,
    content: String,
    version: u32,
    created_at: DateTime<Utc>,
}

#[tauri::command]
async fn toggle_window(window: tauri::Window) -> Result<(), String> {
    if window.is_visible().unwrap_or(false) {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn create_note(
    content: String,
    title: Option<String>,
    tags: Vec<String>,
) -> Result<Note, String> {
    let note = Note {
        id: Uuid::new_v4().to_string(),
        content,
        title,
        tags,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        version: 1,
        parent_id: None,
    };
    
    // TODO: Save to database
    
    Ok(note)
}

#[tauri::command]
async fn get_recent_notes(_days: u32) -> Result<Vec<Note>, String> {
    // TODO: Fetch from database
    Ok(Vec::new())
}

#[tauri::command]
async fn resume_note(_note_id: String) -> Result<Note, String> {
    // TODO: Fetch note and update timestamp
    Err("Not implemented".to_string())
}

#[tauri::command]
async fn branch_note(_note_id: String) -> Result<Note, String> {
    // TODO: Create a new version/branch of the note
    Err("Not implemented".to_string())
}

#[tauri::command]
async fn get_note_history(_note_id: String) -> Result<Vec<NoteVersion>, String> {
    // TODO: Fetch version history from database
    Ok(Vec::new())
}

#[tauri::command]
async fn generate_title_and_tags(_content: String) -> Result<(String, Vec<String>), String> {
    // TODO: Integrate with LLM API
    // For now, return placeholder data
    Ok(("Untitled Note".to_string(), vec!["general".to_string()]))
}

#[tauri::command]
async fn open_devtools(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        window.open_devtools();
        Ok(())
    }
    
    #[cfg(not(debug_assertions))]
    {
        Err("Developer tools are only available in debug builds".to_string())
    }
}

#[tauri::command]
async fn broadcast_note_update(app: tauri::AppHandle, note: note_store::TempNote) -> Result<(), String> {
    // Emit specifically to the main window
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.emit("global-note-updated", &note).map_err(|e| e.to_string())?;
        println!("Emitted note update to main window: {}", note.id);
    } else {
        println!("Main window not found, broadcasting to all windows");
        app.emit("global-note-updated", &note).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            toggle_window,
            create_note,
            get_recent_notes,
            resume_note,
            branch_note,
            get_note_history,
            generate_title_and_tags,
            store_temp_note,
            get_temp_note,
            remove_temp_note,
            get_all_temp_notes,
            clear_temp_notes,
            open_devtools,
            broadcast_note_update,
        ])
        .setup(|app| {
            // Register global shortcut for Cmd+N
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            
            let shortcut = Shortcut::new(Some(Modifiers::SUPER), Code::KeyN);
            
            app.global_shortcut().on_shortcuts(vec![shortcut.clone()], move |_app, shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    if shortcut == &Shortcut::new(Some(Modifiers::SUPER), Code::KeyN) {
                        let _ = window_clone.emit("toggle-window", ());
                        if window_clone.is_visible().unwrap_or(false) {
                            let _ = window_clone.hide();
                        } else {
                            let _ = window_clone.show();
                            let _ = window_clone.set_focus();
                        }
                    }
                }
            })?;
            
            // Handle window events for proper floating behavior
            window.on_window_event(move |event| {
                match event {
                    WindowEvent::Focused(_focused) => {
                        // Optional: hide window when it loses focus
                        // if !focused {
                        //     window.hide().unwrap();
                        // }
                    }
                    _ => {}
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}