use crate::{
    application::{audio::AudioApplicationError, core::ApplicationError},
    audio::AudioValidationError,
    domain::DomainError,
    persistence::{audio::AudioRepositoryError, RepositoryError},
};
use serde::Serialize;
use specta::Type;
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

#[allow(clippy::result_large_err)]
pub(super) fn parse_id(value: &str, operation: &str) -> Result<Uuid, AppErrorDto> {
    Uuid::parse_str(value).map_err(|_| AppErrorDto {
        code: "CORE_INVALID_ID".to_owned(),
        message: "O item selecionado não é válido.".to_owned(),
        operation: operation.to_owned(),
        entity_id: Some(value.to_owned()),
        details: None,
        recoverable: true,
    })
}

#[allow(clippy::result_large_err)]
pub(super) fn parse_position(value: i32, operation: &str) -> Result<usize, AppErrorDto> {
    usize::try_from(value).map_err(|_| AppErrorDto {
        code: "CORE_INVALID_POSITION".to_owned(),
        message: "A posição selecionada não é válida.".to_owned(),
        operation: operation.to_owned(),
        entity_id: None,
        details: None,
        recoverable: true,
    })
}

#[allow(clippy::result_large_err)]
pub(super) fn parse_audio_id(value: &str, operation: &str) -> Result<Uuid, AppErrorDto> {
    Uuid::parse_str(value).map_err(|_| AppErrorDto {
        code: "AUDIO_INVALID_ID".to_owned(),
        message: "O recurso de áudio selecionado não é válido.".to_owned(),
        operation: operation.to_owned(),
        entity_id: Some(value.to_owned()),
        details: None,
        recoverable: true,
    })
}

pub(super) fn application_error(operation: &str, error: ApplicationError) -> AppErrorDto {
    let (code, message, recoverable) = match &error {
        ApplicationError::Domain(DomainError::InvalidName) => {
            ("CORE_INVALID_NAME", "Informe um nome.", true)
        }
        ApplicationError::Domain(DomainError::SceneAlreadyAssociated { .. }) => (
            "CORE_SCENE_ALREADY_ASSOCIATED",
            "Esta cena já pertence à sessão.",
            true,
        ),
        ApplicationError::Domain(DomainError::CannotRemoveLastSession(_)) => (
            "CORE_LAST_SESSION",
            "A campanha precisa manter ao menos uma sessão.",
            true,
        ),
        ApplicationError::Domain(DomainError::CannotRemoveLastScene(_)) => (
            "CORE_LAST_SESSION_SCENE",
            "A sessão precisa manter ao menos uma cena.",
            true,
        ),
        ApplicationError::Domain(DomainError::CannotRemoveLastSceneLevel(_)) => (
            "CORE_LAST_SCENE_LEVEL",
            "A cena precisa manter ao menos um nível.",
            true,
        ),
        ApplicationError::Domain(DomainError::SceneRequiredBySessions { .. }) => (
            "CORE_SCENE_REQUIRED_BY_SESSIONS",
            "A cena é a única cena de uma ou mais sessões.",
            true,
        ),
        ApplicationError::Domain(_) => (
            "CORE_INVALID_OPERATION",
            "A operação não respeita a estrutura do jogo.",
            true,
        ),
        ApplicationError::Repository(RepositoryError::NotFound(_)) => (
            "CORE_NOT_FOUND",
            "O item selecionado não existe mais.",
            true,
        ),
        ApplicationError::Repository(RepositoryError::PositionOverflow) => (
            "CORE_POSITION_OVERFLOW",
            "Não foi possível adicionar mais itens.",
            true,
        ),
        ApplicationError::Repository(RepositoryError::InvalidData(_)) => (
            "CORE_INVALID_DATA",
            "Os dados locais não possuem uma estrutura válida.",
            false,
        ),
        ApplicationError::Repository(RepositoryError::Database(_)) => (
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

pub(super) fn audio_application_error(
    operation: &str,
    error: AudioApplicationError,
) -> AppErrorDto {
    let (code, message, recoverable, entity_id) = match &error {
        AudioApplicationError::Validation(validation) => {
            let (code, message) = match validation {
                AudioValidationError::InvalidName => ("AUDIO_INVALID_NAME", "Informe um nome."),
                AudioValidationError::InvalidAssetPath => (
                    "AUDIO_INVALID_ASSET_PATH",
                    "Selecione um arquivo dentro da pasta de assets.",
                ),
                AudioValidationError::InvalidVolume => {
                    ("AUDIO_INVALID_VOLUME", "Informe um volume válido em dB.")
                }
                AudioValidationError::InvalidDuration => {
                    ("AUDIO_INVALID_DURATION", "A duração do áudio não é válida.")
                }
                AudioValidationError::InvalidPlaybackRegion => (
                    "AUDIO_INVALID_PLAYBACK_REGION",
                    "A região de reprodução precisa ficar dentro do arquivo.",
                ),
                AudioValidationError::InvalidLoopRegion => (
                    "AUDIO_INVALID_LOOP_REGION",
                    "A região de loop precisa ficar dentro da reprodução.",
                ),
                AudioValidationError::InvalidFadeDuration => {
                    ("AUDIO_INVALID_FADE", "As durações de fade não são válidas.")
                }
                AudioValidationError::InvalidCrossfadeDuration => (
                    "AUDIO_INVALID_CROSSFADE",
                    "O crossfade precisa ser menor que a região de loop.",
                ),
                AudioValidationError::EmptyAudioList
                | AudioValidationError::DuplicateAudioObject
                | AudioValidationError::InvalidWeight
                | AudioValidationError::WeightOverflow => (
                    "AUDIO_INVALID_LIST",
                    "A lista de áudio não possui uma configuração válida.",
                ),
                AudioValidationError::EmptyComposition
                | AudioValidationError::DuplicateLayer
                | AudioValidationError::InvalidInterval => (
                    "AUDIO_INVALID_COMPOSITION",
                    "A composição de áudio não possui uma configuração válida.",
                ),
            };
            (code, message, true, None)
        }
        AudioApplicationError::Repository(AudioRepositoryError::NotFound(_)) => (
            "AUDIO_NOT_FOUND",
            "O recurso de áudio selecionado não existe mais.",
            true,
            None,
        ),
        AudioApplicationError::Repository(AudioRepositoryError::InUse(_)) => (
            "AUDIO_IN_USE",
            "Este recurso ainda é usado por outra definição de áudio.",
            true,
            None,
        ),
        AudioApplicationError::Repository(AudioRepositoryError::InvalidData(validation)) => {
            return audio_application_error(
                operation,
                AudioApplicationError::Validation(validation.clone()),
            );
        }
        AudioApplicationError::Repository(AudioRepositoryError::InvalidStoredData(_)) => (
            "AUDIO_INVALID_STORED_DATA",
            "Os dados locais de áudio possuem uma estrutura inválida.",
            false,
            None,
        ),
        AudioApplicationError::Repository(AudioRepositoryError::Database(_)) => (
            "DATABASE_ERROR",
            "Não foi possível salvar os dados locais de áudio.",
            false,
            None,
        ),
        AudioApplicationError::FileSystem(_) => (
            "FILESYSTEM_ERROR",
            "Não foi possível acessar o diretório de áudio configurado.",
            false,
            None,
        ),
        AudioApplicationError::MissingAudioFile(id) => (
            "AUDIO_FILE_MISSING",
            "O arquivo de áudio não está disponível no diretório configurado.",
            true,
            Some(id.to_string()),
        ),
        AudioApplicationError::InvalidAssetDirectory => (
            "ASSET_DIRECTORY_INVALID",
            "Selecione um diretório de arquivos válido.",
            true,
            None,
        ),
        AudioApplicationError::InvalidReference(_) => (
            "AUDIO_REFERENCE_NOT_FOUND",
            "Uma definição de áudio referenciada não existe mais.",
            true,
            None,
        ),
        AudioApplicationError::LayerOutsideScene(id) => (
            "AUDIO_LAYER_NOT_IN_SCENE",
            "A camada selecionada não pertence às composições desta cena.",
            true,
            Some(id.to_string()),
        ),
    };

    AppErrorDto {
        code: code.to_owned(),
        message: message.to_owned(),
        operation: operation.to_owned(),
        entity_id,
        details: Some(error.to_string()),
        recoverable,
    }
}
