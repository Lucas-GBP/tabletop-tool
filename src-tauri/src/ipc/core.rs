use super::error::{application_error, parse_id, AppErrorDto};
use crate::{
    application::{self, AppState},
    persistence::core::CoreDefinitions,
};
use serde::Serialize;
use specta::Type;
use tauri::State;

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
pub(crate) async fn list_core(state: State<'_, AppState>) -> Result<CoreSnapshotDto, AppErrorDto> {
    application::core::list(state.connection())
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("list_core", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_scene(
    state: State<'_, AppState>,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    application::core::create_scene(state.connection(), &name)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("create_scene", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_campaign(
    state: State<'_, AppState>,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    application::core::create_campaign(state.connection(), &name)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("create_campaign", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_session(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    initial_scene_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let campaign_id = parse_id(&campaign_id, "create_session")?.into();
    let scene_id = parse_id(&initial_scene_id, "create_session")?.into();
    application::core::create_session(state.connection(), campaign_id, &name, scene_id)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("create_session", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_scene_level(
    state: State<'_, AppState>,
    scene_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let scene_id = parse_id(&scene_id, "create_scene_level")?.into();
    application::core::create_scene_level(state.connection(), scene_id, &name)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("create_scene_level", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn rename_campaign(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let campaign_id = parse_id(&campaign_id, "rename_campaign")?.into();
    application::core::rename_campaign(state.connection(), campaign_id, &name)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("rename_campaign", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn rename_session(
    state: State<'_, AppState>,
    session_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let session_id = parse_id(&session_id, "rename_session")?.into();
    application::core::rename_session(state.connection(), session_id, &name)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("rename_session", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn rename_scene(
    state: State<'_, AppState>,
    scene_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let scene_id = parse_id(&scene_id, "rename_scene")?.into();
    application::core::rename_scene(state.connection(), scene_id, &name)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("rename_scene", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn rename_scene_level(
    state: State<'_, AppState>,
    level_id: String,
    name: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let level_id = parse_id(&level_id, "rename_scene_level")?.into();
    application::core::rename_scene_level(state.connection(), level_id, &name)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("rename_scene_level", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn associate_scene(
    state: State<'_, AppState>,
    session_id: String,
    scene_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let session_id = parse_id(&session_id, "associate_scene")?.into();
    let scene_id = parse_id(&scene_id, "associate_scene")?.into();
    application::core::associate_scene(state.connection(), session_id, scene_id)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("associate_scene", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_campaign(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let campaign_id = parse_id(&campaign_id, "delete_campaign")?.into();
    application::core::delete_campaign(state.connection(), campaign_id)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("delete_campaign", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let session_id = parse_id(&session_id, "delete_session")?.into();
    application::core::delete_session(state.connection(), session_id)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("delete_session", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_scene(
    state: State<'_, AppState>,
    scene_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let scene_id = parse_id(&scene_id, "delete_scene")?.into();
    application::core::delete_scene(state.connection(), scene_id)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("delete_scene", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_scene_level(
    state: State<'_, AppState>,
    level_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let level_id = parse_id(&level_id, "delete_scene_level")?.into();
    application::core::delete_scene_level(state.connection(), level_id)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("delete_scene_level", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn remove_scene_from_session(
    state: State<'_, AppState>,
    session_id: String,
    scene_id: String,
) -> Result<CoreSnapshotDto, AppErrorDto> {
    let session_id = parse_id(&session_id, "remove_scene_from_session")?.into();
    let scene_id = parse_id(&scene_id, "remove_scene_from_session")?.into();
    application::core::remove_scene_from_session(state.connection(), session_id, scene_id)
        .await
        .map(snapshot_dto)
        .map_err(|error| application_error("remove_scene_from_session", error))
}

fn snapshot_dto(definitions: CoreDefinitions) -> CoreSnapshotDto {
    CoreSnapshotDto {
        campaigns: definitions
            .campaigns
            .into_iter()
            .map(|campaign| CampaignDto {
                id: campaign.id().to_string(),
                name: campaign.name().to_owned(),
                sessions: campaign
                    .sessions()
                    .iter()
                    .map(|session| SessionDto {
                        id: session.id().to_string(),
                        campaign_id: session.campaign_id().to_string(),
                        name: session.name().to_owned(),
                        position: dto_position(session.position()),
                        scenes: session
                            .scenes()
                            .iter()
                            .map(|association| SessionSceneDto {
                                id: association.id().to_string(),
                                session_id: association.session_id().to_string(),
                                scene_id: association.scene_id().to_string(),
                                position: dto_position(association.position()),
                            })
                            .collect(),
                    })
                    .collect(),
            })
            .collect(),
        scenes: definitions
            .scenes
            .into_iter()
            .map(|scene| SceneDto {
                id: scene.id().to_string(),
                name: scene.name().to_owned(),
                levels: scene
                    .levels()
                    .iter()
                    .map(|level| SceneLevelDto {
                        id: level.id().to_string(),
                        scene_id: level.scene_id().to_string(),
                        name: level.name().to_owned(),
                        position: dto_position(level.position()),
                    })
                    .collect(),
            })
            .collect(),
    }
}

fn dto_position(position: usize) -> i32 {
    i32::try_from(position).expect("positions loaded from SQLite fit in i32")
}
