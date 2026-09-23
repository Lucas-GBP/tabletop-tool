//! Ordered schema migrations for the local SQLite database.

pub use sea_orm_migration::prelude::*;

mod m20260921_000001_create_core_tables;
mod m20260922_000002_create_audio_mixer_tables;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260921_000001_create_core_tables::Migration),
            Box::new(m20260922_000002_create_audio_mixer_tables::Migration),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm_migration::sea_orm::{ConnectionTrait, Database, Statement};

    #[tokio::test]
    async fn sqlite_bootstraps_schema_and_can_run_again() -> Result<(), DbErr> {
        let connection = Database::connect("sqlite::memory:").await?;
        Migrator::up(&connection, None).await?;
        Migrator::up(&connection, None).await?;

        for table in [
            "core_campaigns",
            "core_sessions",
            "core_scenes",
            "core_scene_levels",
            "core_session_scenes",
            "app_settings",
            "tool_audio_mixer_settings",
            "tool_audio_objects",
            "tool_audio_lists",
            "tool_audio_list_entries",
            "tool_audio_compositions",
            "tool_audio_composition_layers",
            "tool_audio_scene_objects",
            "tool_audio_scene_lists",
            "tool_audio_scene_compositions",
            "tool_audio_scene_level_disabled_layers",
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

    #[tokio::test]
    async fn sqlite_refreshes_the_undistributed_baseline() -> Result<(), DbErr> {
        let connection = Database::connect("sqlite::memory:").await?;
        Migrator::up(&connection, None).await?;
        Migrator::refresh(&connection).await?;

        let manager = SchemaManager::new(&connection);
        assert!(manager.has_table("core_campaigns").await?);
        assert!(manager.has_table("tool_audio_compositions").await?);

        connection.close().await
    }

    #[tokio::test]
    async fn audio_schema_does_not_collide_with_legacy_tables() -> Result<(), DbErr> {
        let connection = Database::connect("sqlite::memory:").await?;
        connection
            .execute_unprepared(
                r#"
                CREATE TABLE audio_mixer_settings (id INTEGER PRIMARY KEY, volume REAL);
                CREATE TABLE audio_files (id TEXT PRIMARY KEY, path TEXT);
                CREATE TABLE audio_objects (id TEXT PRIMARY KEY, name TEXT);
                CREATE TABLE audio_compositions (id TEXT PRIMARY KEY, name TEXT);
                INSERT INTO audio_objects (id, name) VALUES ('legacy-object', 'Legacy');
                "#,
            )
            .await?;

        Migrator::up(&connection, None).await?;

        let legacy = connection
            .query_one_raw(Statement::from_string(
                connection.get_database_backend(),
                "SELECT name FROM audio_objects WHERE id = 'legacy-object'".to_owned(),
            ))
            .await?
            .expect("legacy audio row must be preserved");
        assert_eq!(legacy.try_get::<String>("", "name")?, "Legacy");

        let current = connection
            .query_one_raw(Statement::from_string(
                connection.get_database_backend(),
                "SELECT COUNT(*) AS count FROM tool_audio_objects".to_owned(),
            ))
            .await?
            .expect("current audio table must exist");
        assert_eq!(current.try_get::<i64>("", "count")?, 0);

        connection.close().await
    }
}
