use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS core_campaigns (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL CHECK (length(trim(name)) > 0)
            );
            CREATE TABLE IF NOT EXISTS core_scenes (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL CHECK (length(trim(name)) > 0)
            );
            CREATE TABLE IF NOT EXISTS core_sessions (
                id TEXT PRIMARY KEY NOT NULL,
                campaign_id TEXT NOT NULL,
                name TEXT NOT NULL CHECK (length(trim(name)) > 0),
                position INTEGER NOT NULL CHECK (position >= 0),
                FOREIGN KEY (campaign_id) REFERENCES core_campaigns(id) ON DELETE CASCADE,
                UNIQUE (campaign_id, position)
            );
            CREATE TABLE IF NOT EXISTS core_scene_levels (
                id TEXT PRIMARY KEY NOT NULL,
                scene_id TEXT NOT NULL,
                name TEXT NOT NULL CHECK (length(trim(name)) > 0),
                position INTEGER NOT NULL CHECK (position >= 0),
                FOREIGN KEY (scene_id) REFERENCES core_scenes(id) ON DELETE CASCADE,
                UNIQUE (scene_id, position)
            );
            CREATE TABLE IF NOT EXISTS core_session_scenes (
                id TEXT PRIMARY KEY NOT NULL,
                session_id TEXT NOT NULL,
                scene_id TEXT NOT NULL,
                position INTEGER NOT NULL CHECK (position >= 0),
                FOREIGN KEY (session_id) REFERENCES core_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (scene_id) REFERENCES core_scenes(id) ON DELETE RESTRICT,
                UNIQUE (session_id, scene_id),
                UNIQUE (session_id, position)
            );
            CREATE INDEX IF NOT EXISTS core_sessions_campaign_id_idx ON core_sessions(campaign_id);
            CREATE INDEX IF NOT EXISTS core_scene_levels_scene_id_idx ON core_scene_levels(scene_id);
            CREATE INDEX IF NOT EXISTS core_session_scenes_scene_id_idx ON core_session_scenes(scene_id);
        "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
            DROP TABLE IF EXISTS core_session_scenes;
            DROP TABLE IF EXISTS core_scene_levels;
            DROP TABLE IF EXISTS core_sessions;
            DROP TABLE IF EXISTS core_scenes;
            DROP TABLE IF EXISTS core_campaigns;
        "#,
            )
            .await?;
        Ok(())
    }
}
