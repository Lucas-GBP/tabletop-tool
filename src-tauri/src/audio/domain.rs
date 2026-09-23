use std::{collections::HashSet, error::Error, fmt};
use uuid::Uuid;

macro_rules! audio_id {
    ($name:ident) => {
        #[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
        pub struct $name(Uuid);

        impl $name {
            #[must_use]
            pub fn new() -> Self {
                Self(Uuid::new_v4())
            }

            #[must_use]
            pub const fn from_uuid(value: Uuid) -> Self {
                Self(value)
            }

            #[must_use]
            pub const fn into_uuid(self) -> Uuid {
                self.0
            }
        }

        impl Default for $name {
            fn default() -> Self {
                Self::new()
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                self.0.fmt(formatter)
            }
        }

        impl From<Uuid> for $name {
            fn from(value: Uuid) -> Self {
                Self::from_uuid(value)
            }
        }
    };
}

audio_id!(AudioObjectId);
audio_id!(AudioListId);
audio_id!(AudioCompositionId);
audio_id!(CompositionLayerId);

#[derive(Clone, Debug, PartialEq)]
pub enum AudioValidationError {
    InvalidName,
    InvalidAssetPath,
    InvalidVolume,
    InvalidDuration,
    InvalidPlaybackRegion,
    InvalidLoopRegion,
    InvalidFadeDuration,
    InvalidCrossfadeDuration,
    EmptyAudioList,
    DuplicateAudioObject,
    InvalidWeight,
    WeightOverflow,
    EmptyComposition,
    DuplicateLayer,
    InvalidInterval,
}

impl fmt::Display for AudioValidationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::InvalidName => "name must not be empty",
            Self::InvalidAssetPath => "asset path must be a normalized relative path",
            Self::InvalidVolume => "volume must be finite",
            Self::InvalidDuration => "audio duration must be positive",
            Self::InvalidPlaybackRegion => "playback region is invalid",
            Self::InvalidLoopRegion => "loop region is invalid",
            Self::InvalidFadeDuration => "fade duration is invalid",
            Self::InvalidCrossfadeDuration => "loop crossfade duration is invalid",
            Self::EmptyAudioList => "audio list must contain at least one entry",
            Self::DuplicateAudioObject => "audio list contains a duplicate audio object",
            Self::InvalidWeight => "audio list entry weight must be positive",
            Self::WeightOverflow => "audio list weights exceed the supported range",
            Self::EmptyComposition => "audio composition must contain at least one layer",
            Self::DuplicateLayer => "audio composition contains a duplicate layer",
            Self::InvalidInterval => "random interval is invalid",
        })
    }
}

impl Error for AudioValidationError {}

fn name(value: &str) -> Result<String, AudioValidationError> {
    let value = value.trim();
    if value.is_empty() {
        Err(AudioValidationError::InvalidName)
    } else {
        Ok(value.to_owned())
    }
}

fn asset_path(value: &str) -> Result<String, AudioValidationError> {
    let value = value.trim().replace('\\', "/");
    if value.is_empty()
        || value.starts_with('/')
        || value.contains(':')
        || value
            .split('/')
            .any(|component| component.is_empty() || component == "." || component == "..")
    {
        return Err(AudioValidationError::InvalidAssetPath);
    }
    Ok(value)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LoopRegion {
    pub start_time_us: i64,
    pub end_time_us: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct AudioObject {
    pub id: AudioObjectId,
    pub name: String,
    pub asset_path: String,
    pub volume_db: f64,
    pub start_time_us: i64,
    pub end_time_us: i64,
    pub loop_region: Option<LoopRegion>,
    pub fade_in_duration_us: i64,
    pub fade_out_duration_us: i64,
    pub loop_crossfade_duration_us: Option<i64>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct AudioObjectDefinition {
    pub name: String,
    pub asset_path: String,
    pub volume_db: f64,
    pub start_time_us: i64,
    pub end_time_us: i64,
    pub loop_region: Option<LoopRegion>,
    pub fade_in_duration_us: i64,
    pub fade_out_duration_us: i64,
    pub loop_crossfade_duration_us: Option<i64>,
}

impl AudioObject {
    pub fn new(
        definition: AudioObjectDefinition,
        file_duration_us: i64,
    ) -> Result<Self, AudioValidationError> {
        let object = Self::from_parts(AudioObjectId::new(), definition)?;
        if object.end_time_us > file_duration_us {
            return Err(AudioValidationError::InvalidPlaybackRegion);
        }
        Ok(object)
    }

    pub fn from_parts(
        id: AudioObjectId,
        mut definition: AudioObjectDefinition,
    ) -> Result<Self, AudioValidationError> {
        definition.name = name(&definition.name)?;
        definition.asset_path = asset_path(&definition.asset_path)?;
        if !definition.volume_db.is_finite() {
            return Err(AudioValidationError::InvalidVolume);
        }
        if definition.start_time_us < 0 || definition.start_time_us >= definition.end_time_us {
            return Err(AudioValidationError::InvalidPlaybackRegion);
        }
        let region_duration = definition.end_time_us - definition.start_time_us;
        if definition.fade_in_duration_us < 0
            || definition.fade_out_duration_us < 0
            || definition.fade_in_duration_us > region_duration
            || definition.fade_out_duration_us > region_duration
        {
            return Err(AudioValidationError::InvalidFadeDuration);
        }
        match (
            definition.loop_region,
            definition.loop_crossfade_duration_us,
        ) {
            (Some(loop_region), crossfade) => {
                if loop_region.start_time_us < definition.start_time_us
                    || loop_region.start_time_us >= loop_region.end_time_us
                    || loop_region.end_time_us > definition.end_time_us
                {
                    return Err(AudioValidationError::InvalidLoopRegion);
                }
                if let Some(value) = crossfade {
                    if value <= 0 || value >= loop_region.end_time_us - loop_region.start_time_us {
                        return Err(AudioValidationError::InvalidCrossfadeDuration);
                    }
                }
            }
            (None, Some(_)) => return Err(AudioValidationError::InvalidCrossfadeDuration),
            (None, None) => {}
        }
        Ok(Self {
            id,
            name: definition.name,
            asset_path: definition.asset_path,
            volume_db: definition.volume_db,
            start_time_us: definition.start_time_us,
            end_time_us: definition.end_time_us,
            loop_region: definition.loop_region,
            fade_in_duration_us: definition.fade_in_duration_us,
            fade_out_duration_us: definition.fade_out_duration_us,
            loop_crossfade_duration_us: definition.loop_crossfade_duration_us,
        })
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AudioListSelectionMode {
    Sequential,
    Random,
    WeightedRandom,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AudioListEntry {
    pub audio_object_id: AudioObjectId,
    pub position: usize,
    pub weight: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AudioList {
    pub id: AudioListId,
    pub name: String,
    pub selection_mode: AudioListSelectionMode,
    pub entries: Vec<AudioListEntry>,
}

impl AudioList {
    pub fn new(
        name_value: &str,
        selection_mode: AudioListSelectionMode,
        entries: Vec<(AudioObjectId, u32)>,
    ) -> Result<Self, AudioValidationError> {
        Self::from_parts(AudioListId::new(), name_value, selection_mode, entries)
    }

    pub fn from_parts(
        id: AudioListId,
        name_value: &str,
        selection_mode: AudioListSelectionMode,
        entries: Vec<(AudioObjectId, u32)>,
    ) -> Result<Self, AudioValidationError> {
        if entries.is_empty() {
            return Err(AudioValidationError::EmptyAudioList);
        }
        let mut ids = HashSet::new();
        let mut total = 0_u64;
        let entries = entries
            .into_iter()
            .enumerate()
            .map(|(position, (audio_object_id, weight))| {
                if !ids.insert(audio_object_id) {
                    return Err(AudioValidationError::DuplicateAudioObject);
                }
                if weight == 0 {
                    return Err(AudioValidationError::InvalidWeight);
                }
                total = total
                    .checked_add(u64::from(weight))
                    .ok_or(AudioValidationError::WeightOverflow)?;
                Ok(AudioListEntry {
                    audio_object_id,
                    position,
                    weight,
                })
            })
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Self {
            id,
            name: name(name_value)?,
            selection_mode,
            entries,
        })
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum LayerSource {
    AudioObject(AudioObjectId),
    AudioList(AudioListId),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LayerExecution {
    Continuous,
    RandomInterval {
        min_interval_us: i64,
        max_interval_us: i64,
    },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DisableBehavior {
    Stop,
    Finish,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompositionLayer {
    pub id: CompositionLayerId,
    pub name: String,
    pub position: usize,
    pub source: LayerSource,
    pub execution: LayerExecution,
    pub disable_behavior: DisableBehavior,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompositionLayerDefinition {
    pub id: Option<CompositionLayerId>,
    pub name: String,
    pub source: LayerSource,
    pub execution: LayerExecution,
    pub disable_behavior: DisableBehavior,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AudioComposition {
    pub id: AudioCompositionId,
    pub name: String,
    pub layers: Vec<CompositionLayer>,
}

impl AudioComposition {
    pub fn new(
        name_value: &str,
        layers: Vec<CompositionLayerDefinition>,
    ) -> Result<Self, AudioValidationError> {
        Self::from_parts(AudioCompositionId::new(), name_value, layers)
    }

    pub fn from_parts(
        id: AudioCompositionId,
        name_value: &str,
        layers: Vec<CompositionLayerDefinition>,
    ) -> Result<Self, AudioValidationError> {
        if layers.is_empty() {
            return Err(AudioValidationError::EmptyComposition);
        }
        let mut ids = HashSet::new();
        let layers = layers
            .into_iter()
            .enumerate()
            .map(|(position, layer)| {
                let layer_id = layer.id.unwrap_or_default();
                if !ids.insert(layer_id) {
                    return Err(AudioValidationError::DuplicateLayer);
                }
                if let LayerExecution::RandomInterval {
                    min_interval_us,
                    max_interval_us,
                } = layer.execution
                {
                    if min_interval_us < 0 || min_interval_us > max_interval_us {
                        return Err(AudioValidationError::InvalidInterval);
                    }
                }
                Ok(CompositionLayer {
                    id: layer_id,
                    name: name(&layer.name)?,
                    position,
                    source: layer.source,
                    execution: layer.execution,
                    disable_behavior: layer.disable_behavior,
                })
            })
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Self {
            id,
            name: name(name_value)?,
            layers,
        })
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AudioMixerSettings {
    pub master_volume_db: f64,
}

impl AudioMixerSettings {
    pub fn new(master_volume_db: f64) -> Result<Self, AudioValidationError> {
        if !master_volume_db.is_finite() {
            return Err(AudioValidationError::InvalidVolume);
        }
        Ok(Self { master_volume_db })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn object_definition() -> AudioObjectDefinition {
        AudioObjectDefinition {
            name: " Rain ".into(),
            asset_path: "audio/rain.ogg".into(),
            volume_db: 0.0,
            start_time_us: 0,
            end_time_us: 10_000,
            loop_region: None,
            fade_in_duration_us: 1_000,
            fade_out_duration_us: 1_000,
            loop_crossfade_duration_us: None,
        }
    }

    #[test]
    fn validates_audio_object_regions_and_crossfade() {
        let object = AudioObject::new(object_definition(), 10_000).unwrap();
        assert_eq!(object.name, "Rain");
        let mut invalid = object_definition();
        invalid.loop_region = Some(LoopRegion {
            start_time_us: 2_000,
            end_time_us: 4_000,
        });
        invalid.loop_crossfade_duration_us = Some(2_000);
        assert_eq!(
            AudioObject::new(invalid, 10_000),
            Err(AudioValidationError::InvalidCrossfadeDuration)
        );
    }

    #[test]
    fn rejects_empty_or_duplicate_audio_lists() {
        assert_eq!(
            AudioList::new("List", AudioListSelectionMode::Random, vec![]),
            Err(AudioValidationError::EmptyAudioList)
        );
        let id = AudioObjectId::new();
        assert_eq!(
            AudioList::new(
                "List",
                AudioListSelectionMode::Random,
                vec![(id, 1), (id, 2)]
            ),
            Err(AudioValidationError::DuplicateAudioObject)
        );
    }

    #[test]
    fn random_interval_must_be_ordered_and_non_negative() {
        let layer = CompositionLayerDefinition {
            id: None,
            name: "Birds".into(),
            source: LayerSource::AudioObject(AudioObjectId::new()),
            execution: LayerExecution::RandomInterval {
                min_interval_us: 2,
                max_interval_us: 1,
            },
            disable_behavior: DisableBehavior::Finish,
        };
        assert_eq!(
            AudioComposition::new("Forest", vec![layer]),
            Err(AudioValidationError::InvalidInterval)
        );
    }
}
