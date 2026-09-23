use crate::{
    application::AppState,
    assets,
    audio::{
        AudioComposition, AudioCompositionId, AudioList, AudioListId, AudioListSelectionMode,
        AudioMixerSettings, AudioObject, AudioObjectDefinition, AudioObjectId,
        AudioValidationError, CompositionLayerDefinition, CompositionLayerId, LayerSource,
    },
    persistence::audio::{
        self, AudioLibrary, AudioRepositoryError, SceneAudioConfiguration,
        SceneLevelAudioConfiguration,
    },
};
use sea_orm::DatabaseConnection;
use std::{
    error::Error,
    fmt, io,
    path::{Component, Path, PathBuf},
};
use uuid::Uuid;

#[derive(Debug)]
pub enum AudioApplicationError {
    Validation(AudioValidationError),
    Repository(AudioRepositoryError),
    FileSystem(io::Error),
    MissingAudioFile(String),
    InvalidAssetDirectory,
    InvalidReference(&'static str),
    LayerOutsideScene(CompositionLayerId),
}

impl fmt::Display for AudioApplicationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Validation(error) => error.fmt(formatter),
            Self::Repository(error) => error.fmt(formatter),
            Self::FileSystem(error) => {
                write!(formatter, "audio filesystem operation failed: {error}")
            }
            Self::MissingAudioFile(id) => write!(formatter, "audio file {id} is unavailable"),
            Self::InvalidAssetDirectory => {
                formatter.write_str("asset directory does not exist or is not a directory")
            }
            Self::InvalidReference(entity) => {
                write!(formatter, "referenced {entity} does not exist")
            }
            Self::LayerOutsideScene(id) => {
                write!(
                    formatter,
                    "composition layer {id} is not configured for the scene"
                )
            }
        }
    }
}

impl Error for AudioApplicationError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Validation(error) => Some(error),
            Self::Repository(error) => Some(error),
            Self::FileSystem(error) => Some(error),
            _ => None,
        }
    }
}

impl From<AudioValidationError> for AudioApplicationError {
    fn from(value: AudioValidationError) -> Self {
        Self::Validation(value)
    }
}

impl From<AudioRepositoryError> for AudioApplicationError {
    fn from(value: AudioRepositoryError) -> Self {
        Self::Repository(value)
    }
}

impl From<io::Error> for AudioApplicationError {
    fn from(value: io::Error) -> Self {
        Self::FileSystem(value)
    }
}

pub async fn list(state: &AppState) -> Result<AudioLibrary, AudioApplicationError> {
    let mut library = audio::load_library(state.connection()).await?;
    library.asset_directory = crate::persistence::settings::load(state.connection())
        .await
        .map_err(AudioRepositoryError::Database)?
        .asset_directory;
    library.files = match library.asset_directory.as_deref() {
        Some(directory) if Path::new(directory).is_dir() => {
            let root = PathBuf::from(directory);
            tokio::task::spawn_blocking(move || assets::scan_audio_directory(&root))
                .await
                .map_err(|error| io::Error::other(format!("asset scan task failed: {error}")))??
        }
        _ => Vec::new(),
    };
    Ok(library)
}

async fn load_cached(
    connection: &DatabaseConnection,
) -> Result<AudioLibrary, AudioApplicationError> {
    Ok(audio::load_library(connection).await?)
}

pub async fn resolve_asset_path(
    state: &AppState,
    relative_path: &str,
) -> Result<PathBuf, AudioApplicationError> {
    let settings = crate::persistence::settings::load(state.connection())
        .await
        .map_err(AudioRepositoryError::Database)?;
    let root = settings
        .asset_directory
        .as_deref()
        .map(Path::new)
        .ok_or(AudioApplicationError::InvalidAssetDirectory)?;
    if !root.is_dir() {
        return Err(AudioApplicationError::InvalidAssetDirectory);
    }
    if Path::new(relative_path)
        .components()
        .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(AudioValidationError::InvalidAssetPath.into());
    }
    let root = root.canonicalize()?;
    let path = root.join(relative_path).canonicalize().map_err(|error| {
        if error.kind() == io::ErrorKind::NotFound {
            AudioApplicationError::MissingAudioFile(relative_path.to_owned())
        } else {
            AudioApplicationError::FileSystem(error)
        }
    })?;
    if !path.starts_with(&root) || !path.is_file() {
        return Err(AudioApplicationError::MissingAudioFile(
            relative_path.to_owned(),
        ));
    }
    Ok(path)
}
pub async fn create_audio_object(
    state: &AppState,
    definition: AudioObjectDefinition,
) -> Result<AudioLibrary, AudioApplicationError> {
    let library = list(state).await?;
    let duration = file_duration(&library, &definition.asset_path)?;
    let object = AudioObject::new(definition, duration)?;
    audio::save_audio_object(state.connection(), &object, true).await?;
    reload_with_assets(state.connection(), library).await
}

pub async fn update_audio_object(
    state: &AppState,
    id: AudioObjectId,
    definition: AudioObjectDefinition,
) -> Result<AudioLibrary, AudioApplicationError> {
    let library = list(state).await?;
    if !library.objects.iter().any(|object| object.id == id) {
        return Err(AudioRepositoryError::NotFound("audio object").into());
    }
    let duration = file_duration(&library, &definition.asset_path)?;
    let object = AudioObject::from_parts(id, definition)?;
    if object.end_time_us > duration {
        return Err(AudioValidationError::InvalidPlaybackRegion.into());
    }
    audio::save_audio_object(state.connection(), &object, false).await?;
    reload_with_assets(state.connection(), library).await
}

async fn reload_with_assets(
    connection: &DatabaseConnection,
    current: AudioLibrary,
) -> Result<AudioLibrary, AudioApplicationError> {
    let mut updated = load_cached(connection).await?;
    updated.asset_directory = current.asset_directory;
    updated.files = current.files;
    Ok(updated)
}

pub async fn delete_audio_object(
    connection: &DatabaseConnection,
    id: AudioObjectId,
) -> Result<AudioLibrary, AudioApplicationError> {
    audio::delete_audio_object(connection, id).await?;
    load_cached(connection).await
}

fn file_duration(library: &AudioLibrary, path: &str) -> Result<i64, AudioApplicationError> {
    library
        .files
        .iter()
        .find(|file| file.relative_path == path)
        .map(|file| file.duration_us)
        .ok_or(AudioApplicationError::InvalidReference("audio asset"))
}

pub async fn create_audio_list(
    connection: &DatabaseConnection,
    name: &str,
    mode: AudioListSelectionMode,
    entries: Vec<(AudioObjectId, u32)>,
) -> Result<AudioLibrary, AudioApplicationError> {
    let library = load_cached(connection).await?;
    validate_object_references(&library, entries.iter().map(|entry| entry.0))?;
    let list_definition = AudioList::new(name, mode, entries)?;
    audio::save_audio_list(connection, &list_definition, true).await?;
    load_cached(connection).await
}

pub async fn update_audio_list(
    connection: &DatabaseConnection,
    id: AudioListId,
    name: &str,
    mode: AudioListSelectionMode,
    entries: Vec<(AudioObjectId, u32)>,
) -> Result<AudioLibrary, AudioApplicationError> {
    let library = load_cached(connection).await?;
    if !library.lists.iter().any(|list| list.id == id) {
        return Err(AudioRepositoryError::NotFound("audio list").into());
    }
    validate_object_references(&library, entries.iter().map(|entry| entry.0))?;
    let list_definition = AudioList::from_parts(id, name, mode, entries)?;
    audio::save_audio_list(connection, &list_definition, false).await?;
    load_cached(connection).await
}

pub async fn delete_audio_list(
    connection: &DatabaseConnection,
    id: AudioListId,
) -> Result<AudioLibrary, AudioApplicationError> {
    audio::delete_audio_list(connection, id).await?;
    load_cached(connection).await
}

fn validate_object_references(
    library: &AudioLibrary,
    ids: impl Iterator<Item = AudioObjectId>,
) -> Result<(), AudioApplicationError> {
    if ids
        .into_iter()
        .all(|id| library.objects.iter().any(|object| object.id == id))
    {
        Ok(())
    } else {
        Err(AudioApplicationError::InvalidReference("audio object"))
    }
}

pub async fn create_audio_composition(
    connection: &DatabaseConnection,
    name: &str,
    layers: Vec<CompositionLayerDefinition>,
) -> Result<AudioLibrary, AudioApplicationError> {
    let library = load_cached(connection).await?;
    validate_layer_sources(&library, &layers)?;
    let composition = AudioComposition::new(name, layers)?;
    audio::save_audio_composition(connection, &composition, true).await?;
    load_cached(connection).await
}

pub async fn update_audio_composition(
    connection: &DatabaseConnection,
    id: AudioCompositionId,
    name: &str,
    layers: Vec<CompositionLayerDefinition>,
) -> Result<AudioLibrary, AudioApplicationError> {
    let library = load_cached(connection).await?;
    let current = library
        .compositions
        .iter()
        .find(|composition| composition.id == id)
        .ok_or(AudioRepositoryError::NotFound("audio composition"))?;
    let current_layer_ids = current
        .layers
        .iter()
        .map(|layer| layer.id)
        .collect::<Vec<_>>();
    if layers
        .iter()
        .filter_map(|layer| layer.id)
        .any(|layer_id| !current_layer_ids.contains(&layer_id))
    {
        return Err(AudioApplicationError::InvalidReference("composition layer"));
    }
    validate_layer_sources(&library, &layers)?;
    let composition = AudioComposition::from_parts(id, name, layers)?;
    audio::save_audio_composition(connection, &composition, false).await?;
    load_cached(connection).await
}

pub async fn delete_audio_composition(
    connection: &DatabaseConnection,
    id: AudioCompositionId,
) -> Result<AudioLibrary, AudioApplicationError> {
    audio::delete_audio_composition(connection, id).await?;
    load_cached(connection).await
}

fn validate_layer_sources(
    library: &AudioLibrary,
    layers: &[CompositionLayerDefinition],
) -> Result<(), AudioApplicationError> {
    for layer in layers {
        let exists = match layer.source {
            LayerSource::AudioObject(id) => library.objects.iter().any(|item| item.id == id),
            LayerSource::AudioList(id) => library.lists.iter().any(|item| item.id == id),
        };
        if !exists {
            return Err(AudioApplicationError::InvalidReference(
                "composition source",
            ));
        }
    }
    Ok(())
}

pub async fn update_settings(
    connection: &DatabaseConnection,
    master_volume_db: f64,
) -> Result<AudioLibrary, AudioApplicationError> {
    audio::update_settings(connection, AudioMixerSettings::new(master_volume_db)?).await?;
    load_cached(connection).await
}

pub async fn get_scene_configuration(
    connection: &DatabaseConnection,
    scene_id: Uuid,
) -> Result<SceneAudioConfiguration, AudioApplicationError> {
    Ok(audio::load_scene_configuration(connection, scene_id).await?)
}

pub async fn update_scene_configuration(
    connection: &DatabaseConnection,
    scene_id: Uuid,
    audio_object_ids: Vec<AudioObjectId>,
    audio_list_ids: Vec<AudioListId>,
    audio_composition_ids: Vec<AudioCompositionId>,
) -> Result<SceneAudioConfiguration, AudioApplicationError> {
    let library = load_cached(connection).await?;
    if !audio::scene_exists(connection, scene_id).await? {
        return Err(AudioRepositoryError::NotFound("scene").into());
    }
    ensure_unique_and_existing(
        &audio_object_ids,
        |id| library.objects.iter().any(|item| item.id == *id),
        "audio object",
    )?;
    ensure_unique_and_existing(
        &audio_list_ids,
        |id| library.lists.iter().any(|item| item.id == *id),
        "audio list",
    )?;
    ensure_unique_and_existing(
        &audio_composition_ids,
        |id| library.compositions.iter().any(|item| item.id == *id),
        "audio composition",
    )?;
    let config = SceneAudioConfiguration {
        scene_id,
        audio_object_ids,
        audio_list_ids,
        audio_composition_ids,
    };
    audio::replace_scene_configuration(connection, &config).await?;
    get_scene_configuration(connection, scene_id).await
}

fn ensure_unique_and_existing<T: Copy + Eq + std::hash::Hash>(
    values: &[T],
    exists: impl Fn(&T) -> bool,
    entity: &'static str,
) -> Result<(), AudioApplicationError> {
    let mut unique = std::collections::HashSet::new();
    if values
        .iter()
        .all(|value| unique.insert(*value) && exists(value))
    {
        Ok(())
    } else {
        Err(AudioApplicationError::InvalidReference(entity))
    }
}

pub async fn get_scene_level_configuration(
    connection: &DatabaseConnection,
    level_id: Uuid,
) -> Result<SceneLevelAudioConfiguration, AudioApplicationError> {
    Ok(audio::load_scene_level_configuration(connection, level_id).await?)
}

pub async fn update_scene_level_configuration(
    connection: &DatabaseConnection,
    level_id: Uuid,
    disabled_layer_ids: Vec<CompositionLayerId>,
) -> Result<SceneLevelAudioConfiguration, AudioApplicationError> {
    let scene_id = audio::scene_level_parent(connection, level_id)
        .await?
        .ok_or(AudioRepositoryError::NotFound("scene level"))?;
    let mut unique = std::collections::HashSet::new();
    for layer_id in &disabled_layer_ids {
        if !unique.insert(*layer_id)
            || !audio::layer_belongs_to_scene(connection, scene_id, *layer_id).await?
        {
            return Err(AudioApplicationError::LayerOutsideScene(*layer_id));
        }
    }
    let config = SceneLevelAudioConfiguration {
        scene_level_id: level_id,
        disabled_layer_ids,
    };
    audio::replace_scene_level_configuration(connection, &config).await?;
    get_scene_level_configuration(connection, level_id).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use migration::{Migrator, MigratorTrait};
    use sea_orm::Database;
    use tempfile::tempdir;

    async fn database() -> DatabaseConnection {
        let connection = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&connection, None).await.unwrap();
        connection
    }

    #[tokio::test]
    async fn settings_round_trip_without_entering_core_snapshot() {
        let connection = database().await;
        let library = update_settings(&connection, -8.5).await.unwrap();
        assert_eq!(library.settings.master_volume_db, -8.5);
    }

    #[tokio::test]
    async fn invalid_object_reference_is_rejected_before_list_write() {
        let connection = database().await;
        let result = create_audio_list(
            &connection,
            "Hits",
            AudioListSelectionMode::Sequential,
            vec![(AudioObjectId::new(), 1)],
        )
        .await;
        assert!(matches!(
            result,
            Err(AudioApplicationError::InvalidReference("audio object"))
        ));
        assert!(load_cached(&connection).await.unwrap().lists.is_empty());
    }

    #[tokio::test]
    async fn configured_directory_is_scanned_without_copying_files() {
        let connection = database().await;
        let directory = tempdir().unwrap();
        let nested = directory.path().join("weather");
        std::fs::create_dir(&nested).unwrap();
        let source = nested.join("rain.wav");
        std::fs::write(&source, silent_wav()).unwrap();
        let state = AppState::new(connection);

        crate::application::settings::configure_asset_directory(&state, directory.path())
            .await
            .unwrap();
        let library = list(&state).await.unwrap();
        let discovered = library.files.first().unwrap();
        assert_eq!(discovered.name, "rain");
        assert_eq!(discovered.original_file_name, "rain.wav");
        assert_eq!(discovered.relative_path, "weather/rain.wav");
        assert_eq!(discovered.media_type, "audio/wav");
        assert!(discovered.duration_us > 0);
        let resolved = resolve_asset_path(&state, &discovered.relative_path)
            .await
            .unwrap();
        assert_eq!(resolved, source.canonicalize().unwrap());

        std::fs::remove_file(source).unwrap();
        let library = list(&state).await.unwrap();
        assert!(library.files.is_empty());
    }

    fn silent_wav() -> Vec<u8> {
        let samples = vec![128_u8; 800];
        let data_size = u32::try_from(samples.len()).unwrap();
        let mut bytes = Vec::with_capacity(44 + samples.len());
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + data_size).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16_u32.to_le_bytes());
        bytes.extend_from_slice(&1_u16.to_le_bytes());
        bytes.extend_from_slice(&1_u16.to_le_bytes());
        bytes.extend_from_slice(&8_000_u32.to_le_bytes());
        bytes.extend_from_slice(&8_000_u32.to_le_bytes());
        bytes.extend_from_slice(&1_u16.to_le_bytes());
        bytes.extend_from_slice(&8_u16.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_size.to_le_bytes());
        bytes.extend_from_slice(&samples);
        bytes
    }
}
