//! Ordered schema migrations for the local SQLite database.

pub use sea_orm_migration::prelude::*;

mod m20260921_000001_create_core_tables;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(m20260921_000001_create_core_tables::Migration)]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm_migration::sea_orm::{ConnectionTrait, Database, Statement};

    #[tokio::test]
    async fn sqlite_bootstraps_core_schema_and_can_run_again() -> Result<(), DbErr> {
        let connection = Database::connect("sqlite::memory:").await?;
        Migrator::up(&connection, None).await?;
        Migrator::up(&connection, None).await?;

        for table in [
            "core_campaigns",
            "core_sessions",
            "core_scenes",
            "core_scene_levels",
            "core_session_scenes",
        ] {
            let row = connection
                .query_one_raw(Statement::from_sql_and_values(
                    connection.get_database_backend(),
                    "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?",
                    [table.into()],
                ))
                .await?
                .expect("schema query must return one row");
            assert_eq!(row.try_get::<i64>("", "count")?, 1, "missing {table}");
        }

        connection.close().await
    }
}
