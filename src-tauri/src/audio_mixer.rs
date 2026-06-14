use crate::database::open_tabletop_database;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

const AUDIO_MIXER_SCHEMA_VERSION: i64 = 1;
const AUDIO_MIXER_SCHEMA_KEY: &str = "audio_mixer_schema_version";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AudioRegionConfig {
    start_seconds: f64,
    end_seconds: Option<f64>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AudioLoopRegionConfig {
    enabled: bool,
    start_seconds: f64,
    end_seconds: Option<f64>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AudioObjectConfig {
    id: String,
    name: String,
    description: String,
    tags: Vec<String>,
    file_path: String,
    default_volume: f64,
    fade_in_ms: i64,
    fade_out_ms: i64,
    playable_region: AudioRegionConfig,
    loop_region: AudioLoopRegionConfig,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AudioObjectListConfig {
    id: String,
    name: String,
    description: String,
    audio_object_ids: Vec<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AudioMixerStore {
    schema_version: i64,
    audio_objects: Vec<AudioObjectConfig>,
    audio_object_lists: Vec<AudioObjectListConfig>,
}

#[tauri::command]
pub(crate) fn load_audio_mixer_store(app: AppHandle) -> Result<AudioMixerStore, String> {
    let connection = open_tabletop_database(&app)?;

    initialize_audio_mixer_schema(&connection)?;
    load_audio_mixer_store_from_database(&connection)
}

#[tauri::command]
pub(crate) fn save_audio_mixer_store(app: AppHandle, store: AudioMixerStore) -> Result<(), String> {
    let mut connection = open_tabletop_database(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start audio mixer transaction: {error}"))?;

    initialize_audio_mixer_schema(&transaction)?;
    save_audio_mixer_store_to_database(&transaction, store)?;

    transaction
        .commit()
        .map_err(|error| format!("Could not commit audio mixer store: {error}"))
}

fn initialize_audio_mixer_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS audio_objects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                file_path TEXT NOT NULL,
                default_volume REAL NOT NULL,
                fade_in_ms INTEGER NOT NULL,
                fade_out_ms INTEGER NOT NULL,
                playable_start_seconds REAL NOT NULL,
                playable_end_seconds REAL,
                loop_enabled INTEGER NOT NULL,
                loop_start_seconds REAL NOT NULL,
                loop_end_seconds REAL,
                sort_order INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS audio_object_tags (
                audio_object_id TEXT NOT NULL,
                tag TEXT NOT NULL,
                tag_order INTEGER NOT NULL,
                PRIMARY KEY (audio_object_id, tag_order),
                FOREIGN KEY (audio_object_id)
                    REFERENCES audio_objects(id)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS audio_object_lists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                sort_order INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS audio_object_list_items (
                list_id TEXT NOT NULL,
                audio_object_id TEXT NOT NULL,
                item_order INTEGER NOT NULL,
                PRIMARY KEY (list_id, audio_object_id),
                FOREIGN KEY (list_id)
                    REFERENCES audio_object_lists(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (audio_object_id)
                    REFERENCES audio_objects(id)
                    ON DELETE CASCADE
            );
            ",
        )
        .map_err(|error| format!("Could not initialize audio mixer schema: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO app_meta (key, value)
            VALUES (?1, ?2)
            ON CONFLICT(key) DO NOTHING
            ",
            params![
                AUDIO_MIXER_SCHEMA_KEY,
                AUDIO_MIXER_SCHEMA_VERSION.to_string()
            ],
        )
        .map_err(|error| format!("Could not initialize audio mixer schema version: {error}"))?;

    Ok(())
}

fn load_audio_mixer_store_from_database(
    connection: &Connection,
) -> Result<AudioMixerStore, String> {
    Ok(AudioMixerStore {
        schema_version: load_audio_mixer_schema_version(connection)?,
        audio_objects: load_audio_objects(connection)?,
        audio_object_lists: load_audio_object_lists(connection)?,
    })
}

fn load_audio_mixer_schema_version(connection: &Connection) -> Result<i64, String> {
    let version = connection
        .query_row(
            "SELECT value FROM app_meta WHERE key = ?1",
            params![AUDIO_MIXER_SCHEMA_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not read audio mixer schema version: {error}"))?;

    Ok(version
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(AUDIO_MIXER_SCHEMA_VERSION))
}

fn load_audio_objects(connection: &Connection) -> Result<Vec<AudioObjectConfig>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                id,
                name,
                description,
                file_path,
                default_volume,
                fade_in_ms,
                fade_out_ms,
                playable_start_seconds,
                playable_end_seconds,
                loop_enabled,
                loop_start_seconds,
                loop_end_seconds
            FROM audio_objects
            ORDER BY sort_order ASC, name ASC
            ",
        )
        .map_err(|error| format!("Could not prepare audio object query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let audio_object_id = row.get::<_, String>(0)?;

            Ok(AudioObjectConfig {
                tags: load_audio_object_tags(connection, &audio_object_id)?,
                id: audio_object_id,
                name: row.get(1)?,
                description: row.get(2)?,
                file_path: row.get(3)?,
                default_volume: row.get(4)?,
                fade_in_ms: row.get(5)?,
                fade_out_ms: row.get(6)?,
                playable_region: AudioRegionConfig {
                    start_seconds: row.get(7)?,
                    end_seconds: row.get(8)?,
                },
                loop_region: AudioLoopRegionConfig {
                    enabled: row.get::<_, i64>(9)? != 0,
                    start_seconds: row.get(10)?,
                    end_seconds: row.get(11)?,
                },
            })
        })
        .map_err(|error| format!("Could not read audio objects: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not map audio objects: {error}"))
}

fn load_audio_object_tags(
    connection: &Connection,
    audio_object_id: &str,
) -> rusqlite::Result<Vec<String>> {
    let mut statement = connection.prepare(
        "
        SELECT tag
        FROM audio_object_tags
        WHERE audio_object_id = ?1
        ORDER BY tag_order ASC
        ",
    )?;
    let rows = statement.query_map(params![audio_object_id], |row| row.get::<_, String>(0))?;

    rows.collect()
}

fn load_audio_object_lists(connection: &Connection) -> Result<Vec<AudioObjectListConfig>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, name, description
            FROM audio_object_lists
            ORDER BY sort_order ASC, name ASC
            ",
        )
        .map_err(|error| format!("Could not prepare audio object list query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let list_id = row.get::<_, String>(0)?;

            Ok(AudioObjectListConfig {
                audio_object_ids: load_audio_object_list_items(connection, &list_id)?,
                id: list_id,
                name: row.get(1)?,
                description: row.get(2)?,
            })
        })
        .map_err(|error| format!("Could not read audio object lists: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not map audio object lists: {error}"))
}

fn load_audio_object_list_items(
    connection: &Connection,
    list_id: &str,
) -> rusqlite::Result<Vec<String>> {
    let mut statement = connection.prepare(
        "
        SELECT audio_object_id
        FROM audio_object_list_items
        WHERE list_id = ?1
        ORDER BY item_order ASC
        ",
    )?;
    let rows = statement.query_map(params![list_id], |row| row.get::<_, String>(0))?;

    rows.collect()
}

fn save_audio_mixer_store_to_database(
    transaction: &Transaction<'_>,
    store: AudioMixerStore,
) -> Result<(), String> {
    if store.schema_version != AUDIO_MIXER_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported audio mixer schema version: {}",
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
            params![
                AUDIO_MIXER_SCHEMA_KEY,
                AUDIO_MIXER_SCHEMA_VERSION.to_string()
            ],
        )
        .map_err(|error| format!("Could not save audio mixer schema version: {error}"))?;

    clear_audio_mixer_tables(transaction)?;

    for (sort_order, audio_object) in store.audio_objects.iter().enumerate() {
        save_audio_object(transaction, audio_object, sort_order)?;
    }

    for (sort_order, audio_object_list) in store.audio_object_lists.iter().enumerate() {
        save_audio_object_list(transaction, audio_object_list, sort_order)?;
    }

    Ok(())
}

fn clear_audio_mixer_tables(transaction: &Transaction<'_>) -> Result<(), String> {
    transaction
        .execute("DELETE FROM audio_object_list_items", [])
        .map_err(|error| format!("Could not clear audio object list items: {error}"))?;
    transaction
        .execute("DELETE FROM audio_object_lists", [])
        .map_err(|error| format!("Could not clear audio object lists: {error}"))?;
    transaction
        .execute("DELETE FROM audio_object_tags", [])
        .map_err(|error| format!("Could not clear audio object tags: {error}"))?;
    transaction
        .execute("DELETE FROM audio_objects", [])
        .map_err(|error| format!("Could not clear audio objects: {error}"))?;

    Ok(())
}

fn save_audio_object(
    transaction: &Transaction<'_>,
    audio_object: &AudioObjectConfig,
    sort_order: usize,
) -> Result<(), String> {
    transaction
        .execute(
            "
            INSERT INTO audio_objects (
                id,
                name,
                description,
                file_path,
                default_volume,
                fade_in_ms,
                fade_out_ms,
                playable_start_seconds,
                playable_end_seconds,
                loop_enabled,
                loop_start_seconds,
                loop_end_seconds,
                sort_order
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
            ",
            params![
                audio_object.id,
                audio_object.name,
                audio_object.description,
                audio_object.file_path,
                audio_object.default_volume,
                audio_object.fade_in_ms,
                audio_object.fade_out_ms,
                audio_object.playable_region.start_seconds,
                audio_object.playable_region.end_seconds,
                if audio_object.loop_region.enabled {
                    1_i64
                } else {
                    0_i64
                },
                audio_object.loop_region.start_seconds,
                audio_object.loop_region.end_seconds,
                sort_order as i64,
            ],
        )
        .map_err(|error| format!("Could not save audio object: {error}"))?;

    for (tag_order, tag) in audio_object.tags.iter().enumerate() {
        transaction
            .execute(
                "
                INSERT INTO audio_object_tags (audio_object_id, tag, tag_order)
                VALUES (?1, ?2, ?3)
                ",
                params![audio_object.id, tag, tag_order as i64],
            )
            .map_err(|error| format!("Could not save audio object tag: {error}"))?;
    }

    Ok(())
}

fn save_audio_object_list(
    transaction: &Transaction<'_>,
    audio_object_list: &AudioObjectListConfig,
    sort_order: usize,
) -> Result<(), String> {
    transaction
        .execute(
            "
            INSERT INTO audio_object_lists (id, name, description, sort_order)
            VALUES (?1, ?2, ?3, ?4)
            ",
            params![
                audio_object_list.id,
                audio_object_list.name,
                audio_object_list.description,
                sort_order as i64,
            ],
        )
        .map_err(|error| format!("Could not save audio object list: {error}"))?;

    for (item_order, audio_object_id) in audio_object_list.audio_object_ids.iter().enumerate() {
        transaction
            .execute(
                "
                INSERT INTO audio_object_list_items (list_id, audio_object_id, item_order)
                VALUES (?1, ?2, ?3)
                ",
                params![audio_object_list.id, audio_object_id, item_order as i64],
            )
            .map_err(|error| format!("Could not save audio object list item: {error}"))?;
    }

    Ok(())
}
