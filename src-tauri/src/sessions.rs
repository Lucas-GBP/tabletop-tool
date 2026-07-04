use crate::database::open_tabletop_database;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use ts_rs::TS;

const SESSION_SCHEMA_VERSION: i64 = 1;
const SESSION_SCHEMA_KEY: &str = "session_schema_version";

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct SessionConfig {
    id: String,
    name: String,
    description: String,
    notes: String,
    scene_ids: Vec<String>,
    active_scene_id: Option<String>,
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct SessionStore {
    schema_version: i64,
    sessions: Vec<SessionConfig>,
}

#[tauri::command]
pub(crate) fn load_session_store(app: AppHandle) -> Result<SessionStore, String> {
    let connection = open_tabletop_database(&app)?;

    initialize_session_schema(&connection)?;
    load_session_store_from_database(&connection)
}

#[tauri::command]
pub(crate) fn save_session_store(app: AppHandle, store: SessionStore) -> Result<(), String> {
    let mut connection = open_tabletop_database(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start session transaction: {error}"))?;

    initialize_session_schema(&transaction)?;
    save_session_store_to_database(&transaction, store)?;

    transaction
        .commit()
        .map_err(|error| format!("Could not commit session store: {error}"))
}

fn initialize_session_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                notes TEXT NOT NULL,
                active_scene_id TEXT,
                sort_order INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS session_scenes (
                session_id TEXT NOT NULL,
                scene_id TEXT NOT NULL,
                scene_order INTEGER NOT NULL,
                PRIMARY KEY (session_id, scene_order),
                FOREIGN KEY (session_id)
                    REFERENCES sessions(id)
                    ON DELETE CASCADE
            );
            ",
        )
        .map_err(|error| format!("Could not initialize session schema: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO app_meta (key, value)
            VALUES (?1, ?2)
            ON CONFLICT(key) DO NOTHING
            ",
            params![SESSION_SCHEMA_KEY, SESSION_SCHEMA_VERSION.to_string()],
        )
        .map_err(|error| format!("Could not initialize session schema version: {error}"))?;

    Ok(())
}

fn load_session_store_from_database(connection: &Connection) -> Result<SessionStore, String> {
    Ok(SessionStore {
        schema_version: load_session_schema_version(connection)?,
        sessions: load_sessions(connection)?,
    })
}

fn load_session_schema_version(connection: &Connection) -> Result<i64, String> {
    let version = connection
        .query_row(
            "SELECT value FROM app_meta WHERE key = ?1",
            params![SESSION_SCHEMA_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not read session schema version: {error}"))?;

    Ok(version
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(SESSION_SCHEMA_VERSION))
}

fn load_sessions(connection: &Connection) -> Result<Vec<SessionConfig>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, name, description, notes, active_scene_id
            FROM sessions
            ORDER BY sort_order ASC, name ASC
            ",
        )
        .map_err(|error| format!("Could not prepare session query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let session_id = row.get::<_, String>(0)?;

            Ok(SessionConfig {
                scene_ids: load_session_scene_ids(connection, &session_id)?,
                id: session_id,
                name: row.get(1)?,
                description: row.get(2)?,
                notes: row.get(3)?,
                active_scene_id: row.get(4)?,
            })
        })
        .map_err(|error| format!("Could not read sessions: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not map sessions: {error}"))
}

fn load_session_scene_ids(
    connection: &Connection,
    session_id: &str,
) -> rusqlite::Result<Vec<String>> {
    let mut statement = connection.prepare(
        "
        SELECT scene_id
        FROM session_scenes
        WHERE session_id = ?1
        ORDER BY scene_order ASC
        ",
    )?;
    let rows = statement.query_map(params![session_id], |row| row.get::<_, String>(0))?;

    rows.collect()
}

fn save_session_store_to_database(
    transaction: &Transaction<'_>,
    store: SessionStore,
) -> Result<(), String> {
    if store.schema_version != SESSION_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported session schema version: {}",
            store.schema_version
        ));
    }

    transaction
        .execute(
            "
            INSERT INTO app_meta (key, value)
            VALUES (?1, ?2)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            ",
            params![SESSION_SCHEMA_KEY, SESSION_SCHEMA_VERSION.to_string()],
        )
        .map_err(|error| format!("Could not save session schema version: {error}"))?;

    transaction
        .execute("DELETE FROM session_scenes", [])
        .map_err(|error| format!("Could not clear session scenes: {error}"))?;
    transaction
        .execute("DELETE FROM sessions", [])
        .map_err(|error| format!("Could not clear sessions: {error}"))?;

    for (sort_order, session) in store.sessions.iter().enumerate() {
        save_session(transaction, session, sort_order)?;
    }

    Ok(())
}

fn save_session(
    transaction: &Transaction<'_>,
    session: &SessionConfig,
    sort_order: usize,
) -> Result<(), String> {
    transaction
        .execute(
            "
            INSERT INTO sessions (
                id,
                name,
                description,
                notes,
                active_scene_id,
                sort_order
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ",
            params![
                session.id,
                session.name,
                session.description,
                session.notes,
                session.active_scene_id,
                sort_order as i64,
            ],
        )
        .map_err(|error| format!("Could not save session: {error}"))?;

    for (scene_order, scene_id) in session.scene_ids.iter().enumerate() {
        transaction
            .execute(
                "
                INSERT INTO session_scenes (session_id, scene_id, scene_order)
                VALUES (?1, ?2, ?3)
                ",
                params![session.id, scene_id, scene_order as i64],
            )
            .map_err(|error| format!("Could not save session scene: {error}"))?;
    }

    Ok(())
}
