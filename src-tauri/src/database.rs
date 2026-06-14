use rusqlite::Connection;
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

pub(crate) fn open_tabletop_database(app: &AppHandle) -> Result<Connection, String> {
    let database_path = tabletop_database_path(app)?;
    let database_directory = database_path
        .parent()
        .ok_or_else(|| "Tabletop database path has no parent directory".to_string())?;

    fs::create_dir_all(database_directory)
        .map_err(|error| format!("Could not create tabletop database directory: {error}"))?;

    let connection = Connection::open(&database_path)
        .map_err(|error| format!("Could not open tabletop database: {error}"))?;

    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| format!("Could not enable tabletop database foreign keys: {error}"))?;
    initialize_tabletop_database(&connection)?;

    Ok(connection)
}

fn tabletop_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {error}"))?
        .join("tabletop-tool.sqlite3"))
}

fn initialize_tabletop_database(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
        )
        .map_err(|error| format!("Could not initialize tabletop database: {error}"))
}
