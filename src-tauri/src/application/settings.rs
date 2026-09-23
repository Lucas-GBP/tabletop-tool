use super::AppState;
use crate::persistence::settings::{self, AppSettings};
use sea_orm::DbErr;
use std::{error::Error, fmt, fs, io, path::Path};

#[derive(Debug)]
pub enum SettingsApplicationError {
    Database(DbErr),
    FileSystem(io::Error),
    InvalidAssetDirectory,
}

impl fmt::Display for SettingsApplicationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(_) => formatter.write_str("settings database operation failed"),
            Self::FileSystem(_) => formatter.write_str("asset directory could not be accessed"),
            Self::InvalidAssetDirectory => formatter.write_str("asset directory is invalid"),
        }
    }
}

impl Error for SettingsApplicationError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Database(error) => Some(error),
            Self::FileSystem(error) => Some(error),
            Self::InvalidAssetDirectory => None,
        }
    }
}

impl From<DbErr> for SettingsApplicationError {
    fn from(value: DbErr) -> Self {
        Self::Database(value)
    }
}

impl From<io::Error> for SettingsApplicationError {
    fn from(value: io::Error) -> Self {
        Self::FileSystem(value)
    }
}

pub async fn get(state: &AppState) -> Result<AppSettings, SettingsApplicationError> {
    Ok(settings::load(state.connection()).await?)
}

pub async fn configure_asset_directory(
    state: &AppState,
    directory: &Path,
) -> Result<AppSettings, SettingsApplicationError> {
    if !directory.is_dir() {
        return Err(SettingsApplicationError::InvalidAssetDirectory);
    }
    let canonical = fs::canonicalize(directory)?;
    let stored_path = storage_path(&canonical);
    Ok(settings::update_asset_directory(state.connection(), &stored_path).await?)
}

fn storage_path(path: &Path) -> String {
    let value = path.to_string_lossy();
    #[cfg(windows)]
    {
        if let Some(unc) = value.strip_prefix(r"\\?\UNC\") {
            return format!(r"\\{unc}");
        }
        if let Some(local) = value.strip_prefix(r"\\?\") {
            return local.to_owned();
        }
    }
    value.into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(windows)]
    #[test]
    fn removes_windows_verbatim_prefix_from_stored_setting() {
        assert_eq!(
            storage_path(Path::new(r"\\?\C:\Tabletop\Assets")),
            r"C:\Tabletop\Assets"
        );
        assert_eq!(
            storage_path(Path::new(r"\\?\UNC\server\share\Assets")),
            r"\\server\share\Assets"
        );
    }
}
