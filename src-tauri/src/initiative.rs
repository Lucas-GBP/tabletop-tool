use crate::database::open_tabletop_database;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use ts_rs::TS;

const INITIATIVE_SCHEMA_VERSION: i64 = 1;
const INITIATIVE_SCHEMA_KEY: &str = "initiative_schema_version";

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) enum InitiativeParticipantRole {
    Player,
    Creature,
    Npc,
    Other,
}

impl InitiativeParticipantRole {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Player => "player",
            Self::Creature => "creature",
            Self::Npc => "npc",
            Self::Other => "other",
        }
    }

    fn from_str(value: &str) -> Result<Self, String> {
        match value {
            "player" => Ok(Self::Player),
            "creature" => Ok(Self::Creature),
            "npc" => Ok(Self::Npc),
            "other" => Ok(Self::Other),
            _ => Err(format!("Unsupported initiative participant role: {value}")),
        }
    }
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct InitiativeParticipantConfig {
    id: String,
    name: String,
    role: InitiativeParticipantRole,
    initiative_modifier: i64,
    armor_class: Option<i64>,
    hit_points: Option<i64>,
    notes: String,
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct InitiativeEncounterConfig {
    id: String,
    name: String,
    description: String,
    participants: Vec<InitiativeParticipantConfig>,
}

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub(crate) struct InitiativeStore {
    schema_version: i64,
    encounters: Vec<InitiativeEncounterConfig>,
}

#[tauri::command]
pub(crate) fn load_initiative_store(app: AppHandle) -> Result<InitiativeStore, String> {
    let connection = open_tabletop_database(&app)?;

    initialize_initiative_schema(&connection)?;
    load_initiative_store_from_database(&connection)
}

#[tauri::command]
pub(crate) fn save_initiative_store(app: AppHandle, store: InitiativeStore) -> Result<(), String> {
    let mut connection = open_tabletop_database(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start initiative transaction: {error}"))?;

    initialize_initiative_schema(&transaction)?;
    save_initiative_store_to_database(&transaction, store)?;

    transaction
        .commit()
        .map_err(|error| format!("Could not commit initiative store: {error}"))
}

fn initialize_initiative_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS initiative_encounters (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                sort_order INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS initiative_participants (
                id TEXT PRIMARY KEY,
                encounter_id TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                initiative_modifier INTEGER NOT NULL,
                armor_class INTEGER,
                hit_points INTEGER,
                notes TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                FOREIGN KEY (encounter_id)
                    REFERENCES initiative_encounters(id)
                    ON DELETE CASCADE
            );
            ",
        )
        .map_err(|error| format!("Could not initialize initiative schema: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO app_meta (key, value)
            VALUES (?1, ?2)
            ON CONFLICT(key) DO NOTHING
            ",
            params![INITIATIVE_SCHEMA_KEY, INITIATIVE_SCHEMA_VERSION.to_string()],
        )
        .map_err(|error| format!("Could not initialize initiative schema version: {error}"))?;

    Ok(())
}

fn load_initiative_store_from_database(connection: &Connection) -> Result<InitiativeStore, String> {
    Ok(InitiativeStore {
        schema_version: load_initiative_schema_version(connection)?,
        encounters: load_initiative_encounters(connection)?,
    })
}

fn load_initiative_schema_version(connection: &Connection) -> Result<i64, String> {
    let version = connection
        .query_row(
            "SELECT value FROM app_meta WHERE key = ?1",
            params![INITIATIVE_SCHEMA_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not read initiative schema version: {error}"))?;

    Ok(version
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(INITIATIVE_SCHEMA_VERSION))
}

fn load_initiative_encounters(
    connection: &Connection,
) -> Result<Vec<InitiativeEncounterConfig>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, name, description
            FROM initiative_encounters
            ORDER BY sort_order ASC, name ASC
            ",
        )
        .map_err(|error| format!("Could not prepare initiative encounter query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let encounter_id = row.get::<_, String>(0)?;

            Ok(InitiativeEncounterConfig {
                participants: load_initiative_participants(connection, &encounter_id)?,
                id: encounter_id,
                name: row.get(1)?,
                description: row.get(2)?,
            })
        })
        .map_err(|error| format!("Could not read initiative encounters: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not map initiative encounters: {error}"))
}

fn load_initiative_participants(
    connection: &Connection,
    encounter_id: &str,
) -> rusqlite::Result<Vec<InitiativeParticipantConfig>> {
    let mut statement = connection.prepare(
        "
        SELECT
            id,
            name,
            role,
            initiative_modifier,
            armor_class,
            hit_points,
            notes
        FROM initiative_participants
        WHERE encounter_id = ?1
        ORDER BY sort_order ASC, name ASC
        ",
    )?;

    let rows = statement.query_map(params![encounter_id], |row| {
        let role = row.get::<_, String>(2)?;

        Ok(InitiativeParticipantConfig {
            id: row.get(0)?,
            name: row.get(1)?,
            role: InitiativeParticipantRole::from_str(&role).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    2,
                    rusqlite::types::Type::Text,
                    Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, error)),
                )
            })?,
            initiative_modifier: row.get(3)?,
            armor_class: row.get(4)?,
            hit_points: row.get(5)?,
            notes: row.get(6)?,
        })
    })?;

    rows.collect()
}

fn save_initiative_store_to_database(
    transaction: &Transaction<'_>,
    store: InitiativeStore,
) -> Result<(), String> {
    if store.schema_version != INITIATIVE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported initiative schema version: {}",
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
            params![INITIATIVE_SCHEMA_KEY, INITIATIVE_SCHEMA_VERSION.to_string()],
        )
        .map_err(|error| format!("Could not save initiative schema version: {error}"))?;

    transaction
        .execute("DELETE FROM initiative_participants", [])
        .map_err(|error| format!("Could not clear initiative participants: {error}"))?;
    transaction
        .execute("DELETE FROM initiative_encounters", [])
        .map_err(|error| format!("Could not clear initiative encounters: {error}"))?;

    for (sort_order, encounter) in store.encounters.iter().enumerate() {
        save_initiative_encounter(transaction, encounter, sort_order)?;
    }

    Ok(())
}

fn save_initiative_encounter(
    transaction: &Transaction<'_>,
    encounter: &InitiativeEncounterConfig,
    sort_order: usize,
) -> Result<(), String> {
    transaction
        .execute(
            "
            INSERT INTO initiative_encounters (id, name, description, sort_order)
            VALUES (?1, ?2, ?3, ?4)
            ",
            params![
                encounter.id,
                encounter.name,
                encounter.description,
                sort_order as i64,
            ],
        )
        .map_err(|error| format!("Could not save initiative encounter: {error}"))?;

    for (participant_order, participant) in encounter.participants.iter().enumerate() {
        transaction
            .execute(
                "
                INSERT INTO initiative_participants (
                    id,
                    encounter_id,
                    name,
                    role,
                    initiative_modifier,
                    armor_class,
                    hit_points,
                    notes,
                    sort_order
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ",
                params![
                    participant.id,
                    encounter.id,
                    participant.name,
                    participant.role.as_str(),
                    participant.initiative_modifier,
                    participant.armor_class,
                    participant.hit_points,
                    participant.notes,
                    participant_order as i64,
                ],
            )
            .map_err(|error| format!("Could not save initiative participant: {error}"))?;
    }

    Ok(())
}
