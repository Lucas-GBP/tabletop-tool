//! Persistence infrastructure; domain models and IPC DTOs remain separate.

use migration::{Migrator, MigratorTrait};
use sea_orm::{DatabaseConnection, DbErr};

/// Apply registered migrations to a connection owned by the application.
///
/// Startup will supply the managed SQLite connection when persistence is introduced.
/// The project skeleton deliberately does not create a user database yet.
pub async fn migrate(connection: &DatabaseConnection) -> Result<(), DbErr> {
    Migrator::up(connection, None).await
}
