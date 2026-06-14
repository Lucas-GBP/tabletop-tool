mod audio_files;
mod audio_mixer;
mod database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            audio_files::list_audio_files,
            audio_mixer::load_audio_mixer_store,
            audio_mixer::save_audio_mixer_store
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
