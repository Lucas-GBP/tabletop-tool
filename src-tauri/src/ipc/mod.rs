//! Typed IPC contracts at the Tauri boundary.

mod core;
mod error;

pub use error::AppErrorDto;

pub fn builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::new().commands(tauri_specta::collect_commands![
        core::list_core,
        core::create_scene,
        core::create_campaign,
        core::create_session,
        core::create_scene_level,
        core::rename_campaign,
        core::rename_session,
        core::rename_scene,
        core::rename_scene_level,
        core::associate_scene,
        core::delete_campaign,
        core::delete_session,
        core::delete_scene,
        core::delete_scene_level,
        core::remove_scene_from_session
    ])
}
