use crate::{
    application::core::ApplicationError, domain::DomainError, persistence::RepositoryError,
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
