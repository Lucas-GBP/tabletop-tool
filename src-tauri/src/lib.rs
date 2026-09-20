pub mod ipc;
pub mod persistence;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let commands = ipc::builder();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(commands.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
