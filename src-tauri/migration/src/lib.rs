//! Ordered schema migrations. Add domain migrations as the domain is implemented.

pub use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm_migration::sea_orm::{ConnectionTrait, Database, Statement};

    #[tokio::test]
    async fn sqlite_bootstraps_migration_history_and_can_run_again() -> Result<(), DbErr> {
        let connection = Database::connect("sqlite::memory:").await?;

        Migrator::up(&connection, None).await?;
        Migrator::up(&connection, None).await?;

        let history = connection
            .query_one_raw(Statement::from_string(
                connection.get_database_backend(),
                "SELECT COUNT(*) AS count FROM seaql_migrations",
            ))
            .await?
            .expect("migration history must be queryable");

        assert_eq!(history.try_get::<i64>("", "count")?, 0);
        connection.close().await
    }
}
