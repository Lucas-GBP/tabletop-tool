use super::error::{audio_application_error, parse_audio_id, AppErrorDto};
use crate::{
    application::{self, AppState},
    assets::{AudioAsset, AudioAssetScanWarning},
    audio::{
        AudioComposition, AudioList, AudioListSelectionMode, AudioObject, AudioObjectDefinition,
        CompositionLayerDefinition, DisableBehavior, LayerExecution, LayerSource, LoopRegion,
    },
    persistence::audio::{AudioLibrary, SceneAudioConfiguration, SceneLevelAudioConfiguration},
};
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioLibraryDto {
    pub asset_directory: Option<String>,
    pub files: Vec<AudioAssetDto>,
    pub scan_warnings: Vec<AudioAssetScanWarningDto>,
    pub objects: Vec<AudioObjectDto>,
    pub lists: Vec<AudioListDto>,
    pub compositions: Vec<AudioCompositionDto>,
    pub settings: AudioMixerSettingsDto,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioAssetScanWarningDto {
    pub code: String,
    pub path: String,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioAssetDto {
    pub name: String,
    pub original_file_name: String,
    pub relative_path: String,
    pub media_type: String,
    #[specta(type = specta_typescript::Number)]
    pub duration_us: i64,
    #[specta(type = specta_typescript::Number)]
    pub size_bytes: i64,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioObjectDto {
    pub id: String,
    pub name: String,
    pub asset_path: String,
    #[specta(type = specta_typescript::Number)]
    pub volume_db: f64,
    #[specta(type = specta_typescript::Number)]
    pub start_time_us: i64,
    #[specta(type = specta_typescript::Number)]
    pub end_time_us: i64,
    #[specta(type = Option<specta_typescript::Number>)]
    pub start_loop_time_us: Option<i64>,
    #[specta(type = Option<specta_typescript::Number>)]
    pub end_loop_time_us: Option<i64>,
    #[specta(type = specta_typescript::Number)]
    pub fade_in_duration_us: i64,
    #[specta(type = specta_typescript::Number)]
    pub fade_out_duration_us: i64,
    #[specta(type = Option<specta_typescript::Number>)]
    pub loop_crossfade_duration_us: Option<i64>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum AudioListSelectionModeDto {
    Sequential,
    Random,
    WeightedRandom,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioListEntryDto {
    pub audio_object_id: String,
    pub position: i32,
    pub weight: u32,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioListDto {
    pub id: String,
    pub name: String,
    pub selection_mode: AudioListSelectionModeDto,
    pub entries: Vec<AudioListEntryDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum CompositionLayerSourceDto {
    AudioObject { audio_object_id: String },
    AudioList { audio_list_id: String },
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum LayerExecutionDto {
    Continuous,
    RandomInterval {
        #[specta(type = specta_typescript::Number)]
        min_interval_us: i64,
        #[specta(type = specta_typescript::Number)]
        max_interval_us: i64,
    },
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum DisableBehaviorDto {
    Stop,
    Finish,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CompositionLayerDto {
    pub id: String,
    pub name: String,
    pub position: i32,
    pub source: CompositionLayerSourceDto,
    pub execution: LayerExecutionDto,
    pub disable_behavior: DisableBehaviorDto,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioCompositionDto {
    pub id: String,
    pub name: String,
    pub layers: Vec<CompositionLayerDto>,
}

#[derive(Clone, Copy, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioMixerSettingsDto {
    #[specta(type = specta_typescript::Number)]
    pub master_volume_db: f64,
}

#[derive(Clone, Copy, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioMixerSettingsInputDto {
    #[specta(type = specta_typescript::Number)]
    pub master_volume_db: f64,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioObjectInputDto {
    pub name: String,
    pub asset_path: String,
    #[specta(type = specta_typescript::Number)]
    pub volume_db: f64,
    #[specta(type = specta_typescript::Number)]
    pub start_time_us: i64,
    #[specta(type = specta_typescript::Number)]
    pub end_time_us: i64,
    #[specta(type = Option<specta_typescript::Number>)]
    pub start_loop_time_us: Option<i64>,
    #[specta(type = Option<specta_typescript::Number>)]
    pub end_loop_time_us: Option<i64>,
    #[specta(type = specta_typescript::Number)]
    pub fade_in_duration_us: i64,
    #[specta(type = specta_typescript::Number)]
    pub fade_out_duration_us: i64,
    #[specta(type = Option<specta_typescript::Number>)]
    pub loop_crossfade_duration_us: Option<i64>,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioListEntryInputDto {
    pub audio_object_id: String,
    pub weight: u32,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioListInputDto {
    pub name: String,
    pub selection_mode: AudioListSelectionModeDto,
    pub entries: Vec<AudioListEntryInputDto>,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum CompositionLayerSourceInputDto {
    AudioObject { audio_object_id: String },
    AudioList { audio_list_id: String },
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum LayerExecutionInputDto {
    Continuous,
    RandomInterval {
        #[specta(type = specta_typescript::Number)]
        min_interval_us: i64,
        #[specta(type = specta_typescript::Number)]
        max_interval_us: i64,
    },
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CompositionLayerInputDto {
    pub id: Option<String>,
    pub name: String,
    pub source: CompositionLayerSourceInputDto,
    pub execution: LayerExecutionInputDto,
    pub disable_behavior: DisableBehaviorDto,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioCompositionInputDto {
    pub name: String,
    pub layers: Vec<CompositionLayerInputDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SceneAudioConfigurationDto {
    pub scene_id: String,
    pub audio_object_ids: Vec<String>,
    pub audio_list_ids: Vec<String>,
    pub audio_composition_ids: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SceneLevelAudioConfigurationDto {
    pub scene_level_id: String,
    pub disabled_layer_ids: Vec<String>,
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_audio_library(
    state: State<'_, AppState>,
) -> Result<AudioLibraryDto, AppErrorDto> {
    application::audio::list(&state)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("list_audio_library", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn resolve_asset_path(
    state: State<'_, AppState>,
    relative_path: String,
) -> Result<String, AppErrorDto> {
    application::audio::resolve_asset_path(&state, &relative_path)
        .await
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|error| audio_application_error("resolve_asset_path", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_audio_object(
    state: State<'_, AppState>,
    input: AudioObjectInputDto,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let definition = object_definition(input, "create_audio_object")?;
    application::audio::create_audio_object(&state, definition)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("create_audio_object", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn update_audio_object(
    state: State<'_, AppState>,
    audio_object_id: String,
    input: AudioObjectInputDto,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let id = parse_audio_id(&audio_object_id, "update_audio_object")?.into();
    let definition = object_definition(input, "update_audio_object")?;
    application::audio::update_audio_object(&state, id, definition)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("update_audio_object", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_audio_object(
    state: State<'_, AppState>,
    audio_object_id: String,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let id = parse_audio_id(&audio_object_id, "delete_audio_object")?.into();
    application::audio::delete_audio_object(state.connection(), id)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("delete_audio_object", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_audio_list(
    state: State<'_, AppState>,
    input: AudioListInputDto,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let (name, mode, entries) = list_input(input, "create_audio_list")?;
    application::audio::create_audio_list(state.connection(), &name, mode, entries)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("create_audio_list", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn update_audio_list(
    state: State<'_, AppState>,
    audio_list_id: String,
    input: AudioListInputDto,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let id = parse_audio_id(&audio_list_id, "update_audio_list")?.into();
    let (name, mode, entries) = list_input(input, "update_audio_list")?;
    application::audio::update_audio_list(state.connection(), id, &name, mode, entries)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("update_audio_list", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_audio_list(
    state: State<'_, AppState>,
    audio_list_id: String,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let id = parse_audio_id(&audio_list_id, "delete_audio_list")?.into();
    application::audio::delete_audio_list(state.connection(), id)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("delete_audio_list", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_audio_composition(
    state: State<'_, AppState>,
    input: AudioCompositionInputDto,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let (name, layers) = composition_input(input, "create_audio_composition")?;
    application::audio::create_audio_composition(state.connection(), &name, layers)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("create_audio_composition", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn update_audio_composition(
    state: State<'_, AppState>,
    audio_composition_id: String,
    input: AudioCompositionInputDto,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let id = parse_audio_id(&audio_composition_id, "update_audio_composition")?.into();
    let (name, layers) = composition_input(input, "update_audio_composition")?;
    application::audio::update_audio_composition(state.connection(), id, &name, layers)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("update_audio_composition", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_audio_composition(
    state: State<'_, AppState>,
    audio_composition_id: String,
) -> Result<AudioLibraryDto, AppErrorDto> {
    let id = parse_audio_id(&audio_composition_id, "delete_audio_composition")?.into();
    application::audio::delete_audio_composition(state.connection(), id)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("delete_audio_composition", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn update_audio_mixer_settings(
    state: State<'_, AppState>,
    input: AudioMixerSettingsInputDto,
) -> Result<AudioLibraryDto, AppErrorDto> {
    application::audio::update_settings(state.connection(), input.master_volume_db)
        .await
        .map(library_dto)
        .map_err(|error| audio_application_error("update_audio_mixer_settings", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_scene_audio_configuration(
    state: State<'_, AppState>,
    scene_id: String,
) -> Result<SceneAudioConfigurationDto, AppErrorDto> {
    let id = parse_audio_id(&scene_id, "get_scene_audio_configuration")?;
    application::audio::get_scene_configuration(state.connection(), id)
        .await
        .map(scene_configuration_dto)
        .map_err(|error| audio_application_error("get_scene_audio_configuration", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn update_scene_audio_configuration(
    state: State<'_, AppState>,
    scene_id: String,
    audio_object_ids: Vec<String>,
    audio_list_ids: Vec<String>,
    audio_composition_ids: Vec<String>,
) -> Result<SceneAudioConfigurationDto, AppErrorDto> {
    let operation = "update_scene_audio_configuration";
    let id = parse_audio_id(&scene_id, operation)?;
    let objects = parse_ids(&audio_object_ids, operation)?;
    let lists = parse_ids(&audio_list_ids, operation)?;
    let compositions = parse_ids(&audio_composition_ids, operation)?;
    application::audio::update_scene_configuration(
        state.connection(),
        id,
        objects.into_iter().map(Into::into).collect(),
        lists.into_iter().map(Into::into).collect(),
        compositions.into_iter().map(Into::into).collect(),
    )
    .await
    .map(scene_configuration_dto)
    .map_err(|error| audio_application_error(operation, error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_scene_level_audio_configuration(
    state: State<'_, AppState>,
    scene_level_id: String,
) -> Result<SceneLevelAudioConfigurationDto, AppErrorDto> {
    let id = parse_audio_id(&scene_level_id, "get_scene_level_audio_configuration")?;
    application::audio::get_scene_level_configuration(state.connection(), id)
        .await
        .map(scene_level_configuration_dto)
        .map_err(|error| audio_application_error("get_scene_level_audio_configuration", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn update_scene_level_audio_configuration(
    state: State<'_, AppState>,
    scene_level_id: String,
    disabled_layer_ids: Vec<String>,
) -> Result<SceneLevelAudioConfigurationDto, AppErrorDto> {
    let operation = "update_scene_level_audio_configuration";
    let id = parse_audio_id(&scene_level_id, operation)?;
    let layers = parse_ids(&disabled_layer_ids, operation)?;
    application::audio::update_scene_level_configuration(
        state.connection(),
        id,
        layers.into_iter().map(Into::into).collect(),
    )
    .await
    .map(scene_level_configuration_dto)
    .map_err(|error| audio_application_error(operation, error))
}

#[allow(clippy::result_large_err)]
fn parse_ids(values: &[String], operation: &str) -> Result<Vec<uuid::Uuid>, AppErrorDto> {
    values
        .iter()
        .map(|value| parse_audio_id(value, operation))
        .collect()
}

#[allow(clippy::result_large_err)]
fn object_definition(
    input: AudioObjectInputDto,
    operation: &str,
) -> Result<AudioObjectDefinition, AppErrorDto> {
    let loop_region = match (input.start_loop_time_us, input.end_loop_time_us) {
        (Some(start_time_us), Some(end_time_us)) => Some(LoopRegion {
            start_time_us,
            end_time_us,
        }),
        (None, None) => None,
        _ => {
            return Err(AppErrorDto {
                code: "AUDIO_INVALID_LOOP_REGION".to_owned(),
                message: "Informe o início e o fim do loop.".to_owned(),
                operation: operation.to_owned(),
                entity_id: None,
                details: None,
                recoverable: true,
            });
        }
    };
    Ok(AudioObjectDefinition {
        name: input.name,
        asset_path: input.asset_path,
        volume_db: input.volume_db,
        start_time_us: input.start_time_us,
        end_time_us: input.end_time_us,
        loop_region,
        fade_in_duration_us: input.fade_in_duration_us,
        fade_out_duration_us: input.fade_out_duration_us,
        loop_crossfade_duration_us: input.loop_crossfade_duration_us,
    })
}

type ListInput = (
    String,
    AudioListSelectionMode,
    Vec<(crate::audio::AudioObjectId, u32)>,
);

#[allow(clippy::result_large_err)]
fn list_input(input: AudioListInputDto, operation: &str) -> Result<ListInput, AppErrorDto> {
    let mode = match input.selection_mode {
        AudioListSelectionModeDto::Sequential => AudioListSelectionMode::Sequential,
        AudioListSelectionModeDto::Random => AudioListSelectionMode::Random,
        AudioListSelectionModeDto::WeightedRandom => AudioListSelectionMode::WeightedRandom,
    };
    let entries = input
        .entries
        .into_iter()
        .map(|entry| {
            Ok((
                parse_audio_id(&entry.audio_object_id, operation)?.into(),
                entry.weight,
            ))
        })
        .collect::<Result<Vec<_>, AppErrorDto>>()?;
    Ok((input.name, mode, entries))
}

#[allow(clippy::result_large_err)]
fn composition_input(
    input: AudioCompositionInputDto,
    operation: &str,
) -> Result<(String, Vec<CompositionLayerDefinition>), AppErrorDto> {
    let layers = input
        .layers
        .into_iter()
        .map(|layer| {
            let source = match layer.source {
                CompositionLayerSourceInputDto::AudioObject { audio_object_id } => {
                    LayerSource::AudioObject(parse_audio_id(&audio_object_id, operation)?.into())
                }
                CompositionLayerSourceInputDto::AudioList { audio_list_id } => {
                    LayerSource::AudioList(parse_audio_id(&audio_list_id, operation)?.into())
                }
            };
            let execution = match layer.execution {
                LayerExecutionInputDto::Continuous => LayerExecution::Continuous,
                LayerExecutionInputDto::RandomInterval {
                    min_interval_us,
                    max_interval_us,
                } => LayerExecution::RandomInterval {
                    min_interval_us,
                    max_interval_us,
                },
            };
            Ok(CompositionLayerDefinition {
                id: layer
                    .id
                    .map(|value| parse_audio_id(&value, operation).map(Into::into))
                    .transpose()?,
                name: layer.name,
                source,
                execution,
                disable_behavior: match layer.disable_behavior {
                    DisableBehaviorDto::Stop => DisableBehavior::Stop,
                    DisableBehaviorDto::Finish => DisableBehavior::Finish,
                },
            })
        })
        .collect::<Result<Vec<_>, AppErrorDto>>()?;
    Ok((input.name, layers))
}

fn library_dto(library: AudioLibrary) -> AudioLibraryDto {
    AudioLibraryDto {
        asset_directory: library.asset_directory,
        files: library.files.into_iter().map(file_dto).collect(),
        scan_warnings: library
            .scan_warnings
            .into_iter()
            .map(scan_warning_dto)
            .collect(),
        objects: library.objects.into_iter().map(object_dto).collect(),
        lists: library.lists.into_iter().map(list_dto).collect(),
        compositions: library
            .compositions
            .into_iter()
            .map(composition_dto)
            .collect(),
        settings: AudioMixerSettingsDto {
            master_volume_db: library.settings.master_volume_db,
        },
    }
}

fn scan_warning_dto(warning: AudioAssetScanWarning) -> AudioAssetScanWarningDto {
    AudioAssetScanWarningDto {
        code: warning.code.to_owned(),
        path: warning.path,
    }
}

fn file_dto(file: AudioAsset) -> AudioAssetDto {
    AudioAssetDto {
        name: file.name,
        original_file_name: file.original_file_name,
        relative_path: file.relative_path,
        media_type: file.media_type,
        duration_us: file.duration_us,
        size_bytes: file.size_bytes,
    }
}

fn object_dto(object: AudioObject) -> AudioObjectDto {
    let (start_loop_time_us, end_loop_time_us) =
        object.loop_region.map_or((None, None), |region| {
            (Some(region.start_time_us), Some(region.end_time_us))
        });
    AudioObjectDto {
        id: object.id.to_string(),
        name: object.name,
        asset_path: object.asset_path,
        volume_db: object.volume_db,
        start_time_us: object.start_time_us,
        end_time_us: object.end_time_us,
        start_loop_time_us,
        end_loop_time_us,
        fade_in_duration_us: object.fade_in_duration_us,
        fade_out_duration_us: object.fade_out_duration_us,
        loop_crossfade_duration_us: object.loop_crossfade_duration_us,
    }
}

fn list_dto(list: AudioList) -> AudioListDto {
    AudioListDto {
        id: list.id.to_string(),
        name: list.name,
        selection_mode: match list.selection_mode {
            AudioListSelectionMode::Sequential => AudioListSelectionModeDto::Sequential,
            AudioListSelectionMode::Random => AudioListSelectionModeDto::Random,
            AudioListSelectionMode::WeightedRandom => AudioListSelectionModeDto::WeightedRandom,
        },
        entries: list
            .entries
            .into_iter()
            .map(|entry| AudioListEntryDto {
                audio_object_id: entry.audio_object_id.to_string(),
                position: i32::try_from(entry.position)
                    .expect("positions loaded from SQLite fit in i32"),
                weight: entry.weight,
            })
            .collect(),
    }
}

fn composition_dto(composition: AudioComposition) -> AudioCompositionDto {
    AudioCompositionDto {
        id: composition.id.to_string(),
        name: composition.name,
        layers: composition
            .layers
            .into_iter()
            .map(|layer| CompositionLayerDto {
                id: layer.id.to_string(),
                name: layer.name,
                position: i32::try_from(layer.position)
                    .expect("positions loaded from SQLite fit in i32"),
                source: match layer.source {
                    LayerSource::AudioObject(id) => CompositionLayerSourceDto::AudioObject {
                        audio_object_id: id.to_string(),
                    },
                    LayerSource::AudioList(id) => CompositionLayerSourceDto::AudioList {
                        audio_list_id: id.to_string(),
                    },
                },
                execution: match layer.execution {
                    LayerExecution::Continuous => LayerExecutionDto::Continuous,
                    LayerExecution::RandomInterval {
                        min_interval_us,
                        max_interval_us,
                    } => LayerExecutionDto::RandomInterval {
                        min_interval_us,
                        max_interval_us,
                    },
                },
                disable_behavior: match layer.disable_behavior {
                    DisableBehavior::Stop => DisableBehaviorDto::Stop,
                    DisableBehavior::Finish => DisableBehaviorDto::Finish,
                },
            })
            .collect(),
    }
}

fn scene_configuration_dto(config: SceneAudioConfiguration) -> SceneAudioConfigurationDto {
    SceneAudioConfigurationDto {
        scene_id: config.scene_id.to_string(),
        audio_object_ids: config
            .audio_object_ids
            .into_iter()
            .map(|id| id.to_string())
            .collect(),
        audio_list_ids: config
            .audio_list_ids
            .into_iter()
            .map(|id| id.to_string())
            .collect(),
        audio_composition_ids: config
            .audio_composition_ids
            .into_iter()
            .map(|id| id.to_string())
            .collect(),
    }
}

fn scene_level_configuration_dto(
    config: SceneLevelAudioConfiguration,
) -> SceneLevelAudioConfigurationDto {
    SceneLevelAudioConfigurationDto {
        scene_level_id: config.scene_level_id.to_string(),
        disabled_layer_ids: config
            .disabled_layer_ids
            .into_iter()
            .map(|id| id.to_string())
            .collect(),
    }
}
