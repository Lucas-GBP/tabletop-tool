mod audio_compositions;
mod audio_files;
mod audio_mixer;
mod database;
mod initiative;
mod scenes;
mod sessions;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            audio_compositions::load_audio_composition_store,
            audio_compositions::save_audio_composition_store,
            audio_files::list_audio_files,
            initiative::load_initiative_store,
            initiative::save_initiative_store,
            audio_mixer::load_audio_mixer_store,
            audio_mixer::save_audio_mixer_store,
            scenes::load_scene_store,
            scenes::save_scene_store,
            sessions::load_session_store,
            sessions::save_session_store
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
