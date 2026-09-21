//! Typed application contracts shared by Tauri and the binding generator.

use crate::{
    domain,
    persistence::{self, AppState, CoreRecords, RepositoryError},
};
use serde::Serialize;
use specta::Type;
use tauri::State;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppErrorDto {
    pub code: String,
    pub message: String,
    pub operation: String,
    pub entity_id: Option<String>,
    pub details: Option<String>,
    pub recoverable: bool,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CoreSnapshotDto {
    pub campaigns: Vec<CampaignDto>,
    pub scenes: Vec<SceneDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CampaignDto {
    pub id: String,
    pub name: String,
    pub sessions: Vec<SessionDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionDto {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    pub position: i32,
    pub scenes: Vec<SessionSceneDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionSceneDto {
    pub id: String,
    pub session_id: String,
    pub scene_id: String,
    pub position: i32,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SceneDto {
    pub id: String,
    pub name: String,
    pub levels: Vec<SceneLevelDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SceneLevelDto {
    pub id: String,
    pub scene_id: String,
    pub name: String,
    pub position: i32,
}

#[tauri::command]
#[specta::specta]
async fn list_core(state: State<'_, AppState>) -> Result<CoreSnapshotDto, AppErrorDto> {
    load_snapshot(&state, "list_core").await
}

#[tauri::command]
#[specta::specta]
async fn create_scene(
    state: State<'_, AppState>,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let name = valid_name(&name, "create_scene")?;
    persistence::create_scene(state.connection(), name)
        .await
        .map_err(|error| repository_error("create_scene", error))?;
    load_snapshot(&state, "create_scene").await
}

#[tauri::command]
#[specta::specta]
async fn create_campaign(
    state: State<'_, AppState>,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let name = valid_name(&name, "create_campaign")?;
    persistence::create_campaign(state.connection(), name)
        .await
        .map_err(|error| repository_error("create_campaign", error))?;
    load_snapshot(&state, "create_campaign").await
}

#[tauri::command]
#[specta::specta]
async fn create_session(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    initial_scene_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let campaign_id = valid_id(&campaign_id, "create_session")?;
    let scene_id = valid_id(&initial_scene_id, "create_session")?;
    let name = valid_name(&name, "create_session")?;
    persistence::create_session(state.connection(), campaign_id, name, scene_id)
        .await
        .map_err(|error| repository_error("create_session", error))?;
    load_snapshot(&state, "create_session").await
}

#[tauri::command]
#[specta::specta]
async fn create_scene_level(
    state: State<'_, AppState>,
    scene_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let scene_id = valid_id(&scene_id, "create_scene_level")?;
    let name = valid_name(&name, "create_scene_level")?;
    persistence::create_scene_level(state.connection(), scene_id, name)
        .await
        .map_err(|error| repository_error("create_scene_level", error))?;
    load_snapshot(&state, "create_scene_level").await
}

#[tauri::command]
#[specta::specta]
async fn rename_campaign(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let campaign_id = valid_id(&campaign_id, "rename_campaign")?;
    let name = valid_name(&name, "rename_campaign")?;
    persistence::rename_campaign(state.connection(), campaign_id, name)
        .await
        .map_err(|error| repository_error("rename_campaign", error))?;
    load_snapshot(&state, "rename_campaign").await
}

#[tauri::command]
#[specta::specta]
async fn rename_scene(
    state: State<'_, AppState>,
    scene_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let scene_id = valid_id(&scene_id, "rename_scene")?;
    let name = valid_name(&name, "rename_scene")?;
    persistence::rename_scene(state.connection(), scene_id, name)
        .await
        .map_err(|error| repository_error("rename_scene", error))?;
    load_snapshot(&state, "rename_scene").await
}

#[tauri::command]
#[specta::specta]
async fn rename_scene_level(
    state: State<'_, AppState>,
    level_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let level_id = valid_id(&level_id, "rename_scene_level")?;
    let name = valid_name(&name, "rename_scene_level")?;
    persistence::rename_scene_level(state.connection(), level_id, name)
        .await
        .map_err(|error| repository_error("rename_scene_level", error))?;
    load_snapshot(&state, "rename_scene_level").await
}

#[tauri::command]
#[specta::specta]
async fn associate_scene(
    state: State<'_, AppState>,
    session_id: String,
    scene_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let session_id = valid_id(&session_id, "associate_scene")?;
    let scene_id = valid_id(&scene_id, "associate_scene")?;
    persistence::associate_scene(state.connection(), session_id, scene_id)
        .await
        .map_err(|error| repository_error("associate_scene", error))?;
    load_snapshot(&state, "associate_scene").await
}

async fn load_snapshot(
    state: &State<'_, AppState>,
    operation: &str,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    persistence::snapshot(state.connection())
        .await
        .map(snapshot_dto)
        .map_err(|error| repository_error(operation, error))
}

fn snapshot_dto(records: CoreRecords) -> CoreSnapshotDto {
    let scenes = records
        .scenes
        .into_iter()
        .map(|scene| SceneDto {
            id: scene.id.to_string(),
            name: scene.name,
            levels: records
                .levels
                .iter()
                .filter(|level| level.scene_id == scene.id)
                .map(|level| SceneLevelDto {
                    id: level.id.to_string(),
                    scene_id: level.scene_id.to_string(),
                    name: level.name.clone(),
                    position: level.position,
                })
                .collect(),
        })
        .collect();
    let campaigns = records
        .campaigns
        .into_iter()
        .map(|campaign| CampaignDto {
            id: campaign.id.to_string(),
            name: campaign.name,
            sessions: records
                .sessions
                .iter()
                .filter(|session| session.campaign_id == campaign.id)
                .map(|session| SessionDto {
                    id: session.id.to_string(),
                    campaign_id: session.campaign_id.to_string(),
                    name: session.name.clone(),
                    position: session.position,
                    scenes: records
                        .associations
                        .iter()
                        .filter(|link| link.session_id == session.id)
                        .map(|link| SessionSceneDto {
                            id: link.id.to_string(),
                            session_id: link.session_id.to_string(),
                            scene_id: link.scene_id.to_string(),
                            position: link.position,
                        })
                        .collect(),
                })
                .collect(),
        })
        .collect();
    CoreSnapshotDto { campaigns, scenes }
}

// The structured IPC error intentionally carries user and diagnostic context.
#[allow(clippy::result_large_err)]
fn valid_name(value: &str, operation: &str) -> Result<String, AppErrorDto> {
    domain::validate_name(value).map_err(|_| AppErrorDto {
        code: "CORE_INVALID_NAME".to_owned(),
        message: "Informe um nome.".to_owned(),
        operation: operation.to_owned(),
        entity_id: None,
        details: None,
        recoverable: true,
    })
}

#[allow(clippy::result_large_err)]
fn valid_id(value: &str, operation: &str) -> Result<Uuid, AppErrorDto> {
    Uuid::parse_str(value).map_err(|_| AppErrorDto {
        code: "CORE_INVALID_ID".to_owned(),
        message: "O item selecionado não é válido.".to_owned(),
        operation: operation.to_owned(),
        entity_id: Some(value.to_owned()),
        details: None,
        recoverable: true,
    })
}

fn repository_error(operation: &str, error: RepositoryError) -> AppErrorDto {
    let (code, message, recoverable) = match &error {
        RepositoryError::NotFound(_) => (
            "CORE_NOT_FOUND",
            "O item selecionado não existe mais.",
            true,
        ),
        RepositoryError::SceneAlreadyAssociated => (
            "CORE_SCENE_ALREADY_ASSOCIATED",
            "Esta cena já pertence à sessão.",
            true,
        ),
        RepositoryError::PositionOverflow => (
            "CORE_POSITION_OVERFLOW",
            "Não foi possível adicionar mais itens.",
            true,
        ),
        RepositoryError::Database(_) => (
            "DATABASE_ERROR",
            "Não foi possível salvar os dados locais.",
            false,
        ),
    };
    AppErrorDto {
        code: code.to_owned(),
        message: message.to_owned(),
        operation: operation.to_owned(),
        entity_id: None,
        details: Some(error.to_string()),
        recoverable,
    }
}

pub fn builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::new().commands(tauri_specta::collect_commands![
        list_core,
        create_scene,
        create_campaign,
        create_session,
        create_scene_level,
        rename_campaign,
        rename_scene,
        rename_scene_level,
        associate_scene
    ])
}
