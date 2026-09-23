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
    let previous = application::settings::get(&state)
        .await
        .map_err(|error| settings_error("configure_asset_directory", error))?
        .asset_directory;
    let directory = application::settings::normalize_asset_directory(&PathBuf::from(directory))
        .map_err(|error| settings_error("configure_asset_directory", error))?;
    let scope = app.asset_protocol_scope();
    let changed = previous.as_deref() != Some(directory.as_str());

    scope
        .allow_directory(&directory, true)
        .map_err(|error| scope_error("liberar", error))?;

    let settings = match application::settings::save_asset_directory(&state, &directory).await {
        Ok(settings) => settings,
        Err(error) => {
            if changed {
                let _ = scope.forbid_directory(&directory, true);
            }
            return Err(settings_error("configure_asset_directory", error));
        }
    };

    if let Some(previous) = previous.filter(|_| changed) {
        if let Err(error) = scope.forbid_directory(&previous, true) {
            let rollback = application::settings::save_asset_directory(&state, &previous).await;
            let _ = scope.forbid_directory(&directory, true);
            if let Err(rollback_error) = rollback {
                return Err(settings_error("rollback_asset_directory", rollback_error));
            }
            return Err(scope_error("revogar", error));
        }
    }
    Ok(settings_dto(settings))
}

fn scope_error(action: &str, error: tauri::Error) -> AppErrorDto {
    AppErrorDto {
        code: "ASSET_SCOPE_ERROR".to_owned(),
        message: format!("Não foi possível {action} o acesso à pasta de assets."),
        operation: "configure_asset_directory".to_owned(),
        entity_id: None,
        details: Some(error.to_string()),
        recoverable: true,
    }
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
