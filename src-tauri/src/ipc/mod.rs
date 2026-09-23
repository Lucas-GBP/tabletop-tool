//! Typed IPC contracts at the Tauri boundary.

mod audio;
mod core;
mod error;
mod settings;

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
        core::remove_scene_from_session,
        audio::list_audio_library,
        settings::get_app_settings,
        settings::configure_asset_directory,
        audio::resolve_asset_path,
        audio::create_audio_object,
        audio::update_audio_object,
        audio::delete_audio_object,
        audio::create_audio_list,
        audio::update_audio_list,
        audio::delete_audio_list,
        audio::create_audio_composition,
        audio::update_audio_composition,
        audio::delete_audio_composition,
        audio::update_audio_mixer_settings,
        audio::get_scene_audio_configuration,
        audio::update_scene_audio_configuration,
        audio::get_scene_level_audio_configuration,
        audio::update_scene_level_audio_configuration
    ])
}
