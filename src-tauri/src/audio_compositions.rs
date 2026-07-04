use crate::database::open_tabletop_database;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use ts_rs::TS;

const AUDIO_COMPOSITION_SCHEMA_VERSION: i64 = 1;
const AUDIO_COMPOSITION_SCHEMA_KEY: &str = "audio_composition_schema_version";

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) enum AudioCompositionTrackSourceKind {
    AudioObject,
    AudioObjectList,
}

impl AudioCompositionTrackSourceKind {
    fn as_str(&self) -> &'static str {
        match self {
            Self::AudioObject => "audioObject",
            Self::AudioObjectList => "audioObjectList",
        }
    }

    fn from_str(value: &str) -> Result<Self, String> {
        match value {
            "audioObject" => Ok(Self::AudioObject),
            "audioObjectList" => Ok(Self::AudioObjectList),
            _ => Err(format!(
                "Unsupported audio composition source kind: {value}"
            )),
        }
    }
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) enum AudioCompositionPlaybackMode {
    Loop,
    OneShot,
    RandomInterval,
    Trigger,
}

impl AudioCompositionPlaybackMode {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Loop => "loop",
            Self::OneShot => "oneShot",
            Self::RandomInterval => "randomInterval",
            Self::Trigger => "trigger",
        }
    }

    fn from_str(value: &str) -> Result<Self, String> {
        match value {
            "loop" => Ok(Self::Loop),
            "oneShot" => Ok(Self::OneShot),
            "randomInterval" => Ok(Self::RandomInterval),
            "trigger" => Ok(Self::Trigger),
            _ => Err(format!(
                "Unsupported audio composition playback mode: {value}"
            )),
        }
    }
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct AudioCompositionTrackConfig {
    id: String,
    source_kind: AudioCompositionTrackSourceKind,
    source_id: String,
    volume: f64,
    playback_mode: AudioCompositionPlaybackMode,
    fade_in_ms: Option<i64>,
    fade_out_ms: Option<i64>,
    random_min_seconds: Option<f64>,
    random_max_seconds: Option<f64>,
    trigger_label: Option<String>,
    enabled: bool,
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct AudioCompositionConfig {
    id: String,
    name: String,
    description: String,
    tracks: Vec<AudioCompositionTrackConfig>,
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct AudioCompositionStore {
    schema_version: i64,
    audio_compositions: Vec<AudioCompositionConfig>,
}

#[tauri::command]
pub(crate) fn load_audio_composition_store(
    app: AppHandle,
) -> Result<AudioCompositionStore, String> {
    let connection = open_tabletop_database(&app)?;

    initialize_audio_composition_schema(&connection)?;
    load_audio_composition_store_from_database(&connection)
}

#[tauri::command]
pub(crate) fn save_audio_composition_store(
    app: AppHandle,
    store: AudioCompositionStore,
) -> Result<(), String> {
    let mut connection = open_tabletop_database(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start audio composition transaction: {error}"))?;

    initialize_audio_composition_schema(&transaction)?;
    save_audio_composition_store_to_database(&transaction, store)?;

    transaction
        .commit()
        .map_err(|error| format!("Could not commit audio composition store: {error}"))
}

fn initialize_audio_composition_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS audio_compositions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                sort_order INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS audio_composition_tracks (
                id TEXT PRIMARY KEY,
                composition_id TEXT NOT NULL,
                source_kind TEXT NOT NULL,
                source_id TEXT NOT NULL,
                volume REAL NOT NULL,
                playback_mode TEXT NOT NULL,
                fade_in_ms INTEGER,
                fade_out_ms INTEGER,
                random_min_seconds REAL,
                random_max_seconds REAL,
                trigger_label TEXT,
                enabled INTEGER NOT NULL,
                sort_order INTEGER NOT NULL,
                FOREIGN KEY (composition_id)
                    REFERENCES audio_compositions(id)
                    ON DELETE CASCADE
            );
            ",
        )
        .map_err(|error| format!("Could not initialize audio composition schema: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO app_meta (key, value)
            VALUES (?1, ?2)
            ON CONFLICT(key) DO NOTHING
            ",
            params![
                AUDIO_COMPOSITION_SCHEMA_KEY,
                AUDIO_COMPOSITION_SCHEMA_VERSION.to_string()
            ],
        )
        .map_err(|error| {
            format!("Could not initialize audio composition schema version: {error}")
        })?;

    Ok(())
}

fn load_audio_composition_store_from_database(
    connection: &Connection,
) -> Result<AudioCompositionStore, String> {
    Ok(AudioCompositionStore {
        schema_version: load_audio_composition_schema_version(connection)?,
        audio_compositions: load_audio_compositions(connection)?,
    })
}

fn load_audio_composition_schema_version(connection: &Connection) -> Result<i64, String> {
    let version = connection
        .query_row(
            "SELECT value FROM app_meta WHERE key = ?1",
            params![AUDIO_COMPOSITION_SCHEMA_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not read audio composition schema version: {error}"))?;

    Ok(version
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(AUDIO_COMPOSITION_SCHEMA_VERSION))
}

fn load_audio_compositions(connection: &Connection) -> Result<Vec<AudioCompositionConfig>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, name, description
            FROM audio_compositions
            ORDER BY sort_order ASC, name ASC
            ",
        )
        .map_err(|error| format!("Could not prepare audio composition query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let composition_id = row.get::<_, String>(0)?;

            Ok(AudioCompositionConfig {
                tracks: load_audio_composition_tracks(connection, &composition_id)?,
                id: composition_id,
                name: row.get(1)?,
                description: row.get(2)?,
            })
        })
        .map_err(|error| format!("Could not read audio compositions: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not map audio compositions: {error}"))
}

fn load_audio_composition_tracks(
    connection: &Connection,
    composition_id: &str,
) -> rusqlite::Result<Vec<AudioCompositionTrackConfig>> {
    let mut statement = connection.prepare(
        "
        SELECT
            id,
            source_kind,
            source_id,
            volume,
            playback_mode,
            fade_in_ms,
            fade_out_ms,
            random_min_seconds,
            random_max_seconds,
            trigger_label,
            enabled
        FROM audio_composition_tracks
        WHERE composition_id = ?1
        ORDER BY sort_order ASC
        ",
    )?;

    let rows = statement.query_map(params![composition_id], |row| {
        let source_kind = row.get::<_, String>(1)?;
        let playback_mode = row.get::<_, String>(4)?;

        Ok(AudioCompositionTrackConfig {
            id: row.get(0)?,
            source_kind: AudioCompositionTrackSourceKind::from_str(&source_kind).map_err(
                |error| {
                    rusqlite::Error::FromSqlConversionFailure(
                        1,
                        rusqlite::types::Type::Text,
                        Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, error)),
                    )
                },
            )?,
            source_id: row.get(2)?,
            volume: row.get(3)?,
            playback_mode: AudioCompositionPlaybackMode::from_str(&playback_mode).map_err(
                |error| {
                    rusqlite::Error::FromSqlConversionFailure(
                        4,
                        rusqlite::types::Type::Text,
                        Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, error)),
                    )
                },
            )?,
            fade_in_ms: row.get(5)?,
            fade_out_ms: row.get(6)?,
            random_min_seconds: row.get(7)?,
            random_max_seconds: row.get(8)?,
            trigger_label: row.get(9)?,
            enabled: row.get::<_, i64>(10)? != 0,
        })
    })?;

    rows.collect()
}

fn save_audio_composition_store_to_database(
    transaction: &Transaction<'_>,
    store: AudioCompositionStore,
) -> Result<(), String> {
    if store.schema_version != AUDIO_COMPOSITION_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported audio composition schema version: {}",
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
                AUDIO_COMPOSITION_SCHEMA_KEY,
                AUDIO_COMPOSITION_SCHEMA_VERSION.to_string()
            ],
        )
        .map_err(|error| format!("Could not save audio composition schema version: {error}"))?;

    transaction
        .execute("DELETE FROM audio_composition_tracks", [])
        .map_err(|error| format!("Could not clear audio composition tracks: {error}"))?;
    transaction
        .execute("DELETE FROM audio_compositions", [])
        .map_err(|error| format!("Could not clear audio compositions: {error}"))?;

    for (sort_order, composition) in store.audio_compositions.iter().enumerate() {
        save_audio_composition(transaction, composition, sort_order)?;
    }

    Ok(())
}

fn save_audio_composition(
    transaction: &Transaction<'_>,
    composition: &AudioCompositionConfig,
    sort_order: usize,
) -> Result<(), String> {
    transaction
        .execute(
            "
            INSERT INTO audio_compositions (id, name, description, sort_order)
            VALUES (?1, ?2, ?3, ?4)
            ",
            params![
                composition.id,
                composition.name,
                composition.description,
                sort_order as i64,
            ],
        )
        .map_err(|error| format!("Could not save audio composition: {error}"))?;

    for (track_order, track) in composition.tracks.iter().enumerate() {
        transaction
            .execute(
                "
                INSERT INTO audio_composition_tracks (
                    id,
                    composition_id,
                    source_kind,
                    source_id,
                    volume,
                    playback_mode,
                    fade_in_ms,
                    fade_out_ms,
                    random_min_seconds,
                    random_max_seconds,
                    trigger_label,
                    enabled,
                    sort_order
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
                ",
                params![
                    track.id,
                    composition.id,
                    track.source_kind.as_str(),
                    track.source_id,
                    track.volume,
                    track.playback_mode.as_str(),
                    track.fade_in_ms,
                    track.fade_out_ms,
                    track.random_min_seconds,
                    track.random_max_seconds,
                    track.trigger_label,
                    if track.enabled { 1_i64 } else { 0_i64 },
                    track_order as i64,
                ],
            )
            .map_err(|error| format!("Could not save audio composition track: {error}"))?;
    }

    Ok(())
}
