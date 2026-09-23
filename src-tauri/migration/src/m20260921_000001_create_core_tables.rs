use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        create_campaigns(manager).await?;
        create_scenes(manager).await?;
        create_sessions(manager).await?;
        create_scene_levels(manager).await?;
        create_session_scenes(manager).await?;
        create_indexes(manager).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(SessionScene::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table(SceneLevel::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(Table::drop().table(Session::Table).if_exists().to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Scene::Table).if_exists().to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Campaign::Table).if_exists().to_owned())
            .await?;
        Ok(())
    }
}

async fn create_campaigns(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(Campaign::Table)
                .if_not_exists()
                .col(ColumnDef::new(Campaign::Id).uuid().not_null().primary_key())
                .col(
                    ColumnDef::new(Campaign::Name)
                        .string()
                        .not_null()
                        .check(non_empty(Campaign::Name)),
                )
                .to_owned(),
        )
        .await
}

async fn create_scenes(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(Scene::Table)
                .if_not_exists()
                .col(ColumnDef::new(Scene::Id).uuid().not_null().primary_key())
                .col(
                    ColumnDef::new(Scene::Name)
                        .string()
                        .not_null()
                        .check(non_empty(Scene::Name)),
                )
                .to_owned(),
        )
        .await
}

async fn create_sessions(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(Session::Table)
                .if_not_exists()
                .col(ColumnDef::new(Session::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Session::CampaignId).uuid().not_null())
                .col(
                    ColumnDef::new(Session::Name)
                        .string()
                        .not_null()
                        .check(non_empty(Session::Name)),
                )
                .col(
                    ColumnDef::new(Session::Position)
                        .integer()
                        .not_null()
                        .check(Expr::col(Session::Position).gte(0)),
                )
                .index(
                    Index::create()
                        .unique()
                        .col(Session::CampaignId)
                        .col(Session::Position),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(Session::Table, Session::CampaignId)
                        .to(Campaign::Table, Campaign::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .to_owned(),
        )
        .await
}

async fn create_scene_levels(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(SceneLevel::Table)
                .if_not_exists()
                .col(
                    ColumnDef::new(SceneLevel::Id)
                        .uuid()
                        .not_null()
                        .primary_key(),
                )
                .col(ColumnDef::new(SceneLevel::SceneId).uuid().not_null())
                .col(
                    ColumnDef::new(SceneLevel::Name)
                        .string()
                        .not_null()
                        .check(non_empty(SceneLevel::Name)),
                )
                .col(
                    ColumnDef::new(SceneLevel::Position)
                        .integer()
                        .not_null()
                        .check(Expr::col(SceneLevel::Position).gte(0)),
                )
                .index(
                    Index::create()
                        .unique()
                        .col(SceneLevel::SceneId)
                        .col(SceneLevel::Position),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(SceneLevel::Table, SceneLevel::SceneId)
                        .to(Scene::Table, Scene::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .to_owned(),
        )
        .await
}

async fn create_session_scenes(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(SessionScene::Table)
                .if_not_exists()
                .col(
                    ColumnDef::new(SessionScene::Id)
                        .uuid()
                        .not_null()
                        .primary_key(),
                )
                .col(ColumnDef::new(SessionScene::SessionId).uuid().not_null())
                .col(ColumnDef::new(SessionScene::SceneId).uuid().not_null())
                .col(
                    ColumnDef::new(SessionScene::Position)
                        .integer()
                        .not_null()
                        .check(Expr::col(SessionScene::Position).gte(0)),
                )
                .index(
                    Index::create()
                        .unique()
                        .col(SessionScene::SessionId)
                        .col(SessionScene::SceneId),
                )
                .index(
                    Index::create()
                        .unique()
                        .col(SessionScene::SessionId)
                        .col(SessionScene::Position),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(SessionScene::Table, SessionScene::SessionId)
                        .to(Session::Table, Session::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(SessionScene::Table, SessionScene::SceneId)
                        .to(Scene::Table, Scene::Id)
                        .on_delete(ForeignKeyAction::Restrict),
                )
                .to_owned(),
        )
        .await
}

async fn create_indexes(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_index(
            Index::create()
                .name("core_sessions_campaign_id_idx")
                .table(Session::Table)
                .col(Session::CampaignId)
                .if_not_exists()
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("core_scene_levels_scene_id_idx")
                .table(SceneLevel::Table)
                .col(SceneLevel::SceneId)
                .if_not_exists()
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("core_session_scenes_scene_id_idx")
                .table(SessionScene::Table)
                .col(SessionScene::SceneId)
                .if_not_exists()
                .to_owned(),
        )
        .await
}

fn non_empty(column: impl IntoColumnRef) -> SimpleExpr {
    Func::char_length(Func::cust(SqliteFunction::Trim).arg(Expr::col(column))).gt(0)
}

#[derive(DeriveIden)]
enum SqliteFunction {
    #[sea_orm(iden = "TRIM")]
    Trim,
}

#[derive(DeriveIden)]
enum Campaign {
    #[sea_orm(iden = "core_campaigns")]
    Table,
    Id,
    Name,
}

#[derive(DeriveIden)]
enum Scene {
    #[sea_orm(iden = "core_scenes")]
    Table,
    Id,
    Name,
}

#[derive(DeriveIden)]
enum Session {
    #[sea_orm(iden = "core_sessions")]
    Table,
    Id,
    CampaignId,
    Name,
    Position,
}

#[derive(DeriveIden)]
enum SceneLevel {
    #[sea_orm(iden = "core_scene_levels")]
    Table,
    Id,
    SceneId,
    Name,
    Position,
}

#[derive(DeriveIden)]
enum SessionScene {
    #[sea_orm(iden = "core_session_scenes")]
    Table,
    Id,
    SessionId,
    SceneId,
    Position,
}
