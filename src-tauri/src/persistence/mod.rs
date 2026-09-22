//! SeaORM infrastructure for local persistent definitions.

pub mod core;
pub mod entities;

use crate::domain::DomainError;
use migration::{Migrator, MigratorTrait};
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use std::{error::Error, fmt, path::Path};

#[derive(Debug)]
pub enum RepositoryError {
    Database(DbErr),
    InvalidData(DomainError),
    NotFound(&'static str),
    PositionOverflow,
}

impl fmt::Display for RepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(_) => formatter.write_str("database operation failed"),
            Self::InvalidData(_) => formatter.write_str("stored domain data is invalid"),
            Self::NotFound(entity) => write!(formatter, "{entity} was not found"),
            Self::PositionOverflow => formatter.write_str("collection is too large"),
        }
    }
}

impl Error for RepositoryError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Database(error) => Some(error),
            Self::InvalidData(error) => Some(error),
            _ => None,
        }
    }
}

impl From<DbErr> for RepositoryError {
    fn from(value: DbErr) -> Self {
        Self::Database(value)
    }
}

impl From<DomainError> for RepositoryError {
    fn from(value: DomainError) -> Self {
        Self::InvalidData(value)
    }
}

pub async fn open(path: &Path) -> Result<DatabaseConnection, DbErr> {
    let normalized = path.to_string_lossy().replace('\\', "/");
    let options = ConnectOptions::new(format!("sqlite://{normalized}?mode=rwc"));
    let connection = Database::connect(options).await?;
    Migrator::up(&connection, None).await?;
    Ok(connection)
}
