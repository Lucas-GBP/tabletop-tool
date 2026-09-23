use super::error::AppErrorDto;
use crate::application::{self, settings::SettingsApplicationError, AppState};
use serde::Serialize;
use specta::Type;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsDto {
    pub asset_directory: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_app_settings(
    state: State<'_, AppState>,
) -> Result<AppSettingsDto, AppErrorDto> {
    application::settings::get(&state)
        .await
        .map(settings_dto)
        .map_err(|error| settings_error("get_app_settings", error))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn configure_asset_directory(
    app: AppHandle,
    state: State<'_, AppState>,
    directory: String,
) -> Result<AppSettingsDto, AppErrorDto> {
    let settings =
        application::settings::configure_asset_directory(&state, &PathBuf::from(directory))
            .await
            .map_err(|error| settings_error("configure_asset_directory", error))?;
    if let Some(directory) = &settings.asset_directory {
        app.asset_protocol_scope()
            .allow_directory(directory, true)
            .map_err(|error| AppErrorDto {
                code: "ASSET_SCOPE_ERROR".to_owned(),
                message: "Não foi possível liberar o acesso à pasta de assets.".to_owned(),
                operation: "configure_asset_directory".to_owned(),
                entity_id: None,
                details: Some(error.to_string()),
                recoverable: true,
            })?;
    }
    Ok(settings_dto(settings))
}

fn settings_dto(settings: crate::persistence::settings::AppSettings) -> AppSettingsDto {
    AppSettingsDto {
        asset_directory: settings.asset_directory,
    }
}

fn settings_error(operation: &str, error: SettingsApplicationError) -> AppErrorDto {
    let (code, message, recoverable) = match &error {
        SettingsApplicationError::InvalidAssetDirectory => (
            "INVALID_ASSET_DIRECTORY",
            "Selecione uma pasta de assets válida.",
            true,
        ),
        SettingsApplicationError::FileSystem(_) => (
            "ASSET_DIRECTORY_UNAVAILABLE",
            "Não foi possível acessar a pasta de assets.",
            true,
        ),
        SettingsApplicationError::Database(_) => (
            "DATABASE_ERROR",
            "Não foi possível salvar as configurações.",
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
