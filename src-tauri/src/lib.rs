pub mod application;
pub mod assets;
pub mod audio;
pub mod domain;
pub mod ipc;
pub mod persistence;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let commands = ipc::builder();

    tauri::Builder::default()
        .setup(|app| {
            let data_directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_directory)?;
            let database_path = data_directory.join("tabletop-tool.sqlite3");
            let connection = tauri::async_runtime::block_on(persistence::open(&database_path))?;
            let settings =
                tauri::async_runtime::block_on(persistence::settings::load(&connection))?;
            if let Some(directory) = settings.asset_directory {
                let directory = std::path::PathBuf::from(directory);
                if directory.is_dir() {
                    app.asset_protocol_scope()
                        .allow_directory(directory, true)?;
                }
            }
            app.manage(application::AppState::new(connection));
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(commands.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
