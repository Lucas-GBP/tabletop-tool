use crate::database::open_tabletop_database;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use ts_rs::TS;

const SCENE_SCHEMA_VERSION: i64 = 1;
const SCENE_SCHEMA_KEY: &str = "scene_schema_version";

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct SceneConfig {
    id: String,
    name: String,
    description: String,
    notes: String,
    audio_composition_id: Option<String>,
    initiative_encounter_id: Option<String>,
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct SceneStore {
    schema_version: i64,
    scenes: Vec<SceneConfig>,
}

#[tauri::command]
pub(crate) fn load_scene_store(app: AppHandle) -> Result<SceneStore, String> {
    let connection = open_tabletop_database(&app)?;

    initialize_scene_schema(&connection)?;
    load_scene_store_from_database(&connection)
}

#[tauri::command]
pub(crate) fn save_scene_store(app: AppHandle, store: SceneStore) -> Result<(), String> {
    let mut connection = open_tabletop_database(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start scene transaction: {error}"))?;

    initialize_scene_schema(&transaction)?;
    save_scene_store_to_database(&transaction, store)?;

    transaction
        .commit()
        .map_err(|error| format!("Could not commit scene store: {error}"))
}

fn initialize_scene_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS scenes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                notes TEXT NOT NULL,
                audio_composition_id TEXT,
                initiative_encounter_id TEXT,
                sort_order INTEGER NOT NULL
            );
            ",
        )
        .map_err(|error| format!("Could not initialize scene schema: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO app_meta (key, value)
            VALUES (?1, ?2)
            ON CONFLICT(key) DO NOTHING
            ",
            params![SCENE_SCHEMA_KEY, SCENE_SCHEMA_VERSION.to_string()],
        )
        .map_err(|error| format!("Could not initialize scene schema version: {error}"))?;

    Ok(())
}

fn load_scene_store_from_database(connection: &Connection) -> Result<SceneStore, String> {
    Ok(SceneStore {
        schema_version: load_scene_schema_version(connection)?,
        scenes: load_scenes(connection)?,
    })
}

fn load_scene_schema_version(connection: &Connection) -> Result<i64, String> {
    let version = connection
        .query_row(
            "SELECT value FROM app_meta WHERE key = ?1",
            params![SCENE_SCHEMA_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not read scene schema version: {error}"))?;

    Ok(version
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(SCENE_SCHEMA_VERSION))
}

fn load_scenes(connection: &Connection) -> Result<Vec<SceneConfig>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                id,
                name,
                description,
                notes,
                audio_composition_id,
                initiative_encounter_id
            FROM scenes
            ORDER BY sort_order ASC, name ASC
            ",
        )
        .map_err(|error| format!("Could not prepare scene query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(SceneConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                notes: row.get(3)?,
                audio_composition_id: row.get(4)?,
                initiative_encounter_id: row.get(5)?,
            })
        })
        .map_err(|error| format!("Could not read scenes: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not map scenes: {error}"))
}

fn save_scene_store_to_database(
    transaction: &Transaction<'_>,
    store: SceneStore,
) -> Result<(), String> {
    if store.schema_version != SCENE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported scene schema version: {}",
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
            params![SCENE_SCHEMA_KEY, SCENE_SCHEMA_VERSION.to_string()],
        )
        .map_err(|error| format!("Could not save scene schema version: {error}"))?;

    transaction
        .execute("DELETE FROM scenes", [])
        .map_err(|error| format!("Could not clear scenes: {error}"))?;

    for (sort_order, scene) in store.scenes.iter().enumerate() {
        transaction
            .execute(
                "
                INSERT INTO scenes (
                    id,
                    name,
                    description,
                    notes,
                    audio_composition_id,
                    initiative_encounter_id,
                    sort_order
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ",
                params![
                    scene.id,
                    scene.name,
                    scene.description,
                    scene.notes,
                    scene.audio_composition_id,
                    scene.initiative_encounter_id,
                    sort_order as i64,
                ],
            )
            .map_err(|error| format!("Could not save scene: {error}"))?;
    }

    Ok(())
}
