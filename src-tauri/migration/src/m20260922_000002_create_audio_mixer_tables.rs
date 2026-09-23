use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        create_app_settings(manager).await?;
        create_settings(manager).await?;
        create_audio_objects(manager).await?;
        create_audio_lists(manager).await?;
        create_audio_list_entries(manager).await?;
        create_audio_compositions(manager).await?;
        create_audio_composition_layers(manager).await?;
        create_scene_associations(manager).await?;
        create_indexes(manager).await?;
        seed_app_settings(manager).await?;
        seed_settings(manager).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(SceneLevelDisabledLayer::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(Table::drop().table(SceneAudioComposition::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(SceneAudioList::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(SceneAudioObject::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AudioCompositionLayer::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AudioComposition::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AudioListEntry::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AudioList::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AudioObject::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AudioMixerSettings::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AppSettings::Table).to_owned())
            .await?;
        Ok(())
    }
}

async fn create_app_settings(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(AppSettings::Table)
                .col(
                    ColumnDef::new(AppSettings::Id)
                        .integer()
                        .not_null()
                        .primary_key()
                        .check(Expr::col(AppSettings::Id).eq(1)),
                )
                .col(ColumnDef::new(AppSettings::AssetDirectory).string())
                .to_owned(),
        )
        .await
}

async fn seed_app_settings(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .execute(
            Query::insert()
                .into_table(AppSettings::Table)
                .columns([AppSettings::Id, AppSettings::AssetDirectory])
                .values_panic([1.into(), Option::<String>::None.into()])
                .to_owned(),
        )
        .await?;
    Ok(())
}

async fn create_settings(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(AudioMixerSettings::Table)
                .col(
                    ColumnDef::new(AudioMixerSettings::Id)
                        .integer()
                        .not_null()
                        .primary_key()
                        .check(Expr::col(AudioMixerSettings::Id).eq(1)),
                )
                .col(
                    ColumnDef::new(AudioMixerSettings::MasterVolumeDb)
                        .double()
                        .not_null(),
                )
                .to_owned(),
        )
        .await
}

async fn create_audio_objects(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(AudioObject::Table)
                .col(
                    ColumnDef::new(AudioObject::Id)
                        .uuid()
                        .not_null()
                        .primary_key(),
                )
                .col(
                    ColumnDef::new(AudioObject::Name)
                        .string()
                        .not_null()
                        .check(non_empty(AudioObject::Name)),
                )
                .col(
                    ColumnDef::new(AudioObject::AssetPath)
                        .string()
                        .not_null()
                        .check(non_empty(AudioObject::AssetPath)),
                )
                .col(ColumnDef::new(AudioObject::VolumeDb).double().not_null())
                .col(
                    ColumnDef::new(AudioObject::StartTimeUs)
                        .big_integer()
                        .not_null()
                        .check(Expr::col(AudioObject::StartTimeUs).gte(0)),
                )
                .col(
                    ColumnDef::new(AudioObject::EndTimeUs)
                        .big_integer()
                        .not_null(),
                )
                .col(ColumnDef::new(AudioObject::StartLoopTimeUs).big_integer())
                .col(ColumnDef::new(AudioObject::EndLoopTimeUs).big_integer())
                .col(
                    ColumnDef::new(AudioObject::FadeInDurationUs)
                        .big_integer()
                        .not_null()
                        .check(Expr::col(AudioObject::FadeInDurationUs).gte(0)),
                )
                .col(
                    ColumnDef::new(AudioObject::FadeOutDurationUs)
                        .big_integer()
                        .not_null()
                        .check(Expr::col(AudioObject::FadeOutDurationUs).gte(0)),
                )
                .col(ColumnDef::new(AudioObject::LoopCrossfadeDurationUs).big_integer())
                .check(Expr::col(AudioObject::EndTimeUs).gt(Expr::col(AudioObject::StartTimeUs)))
                .check(valid_loop_region())
                .check(valid_crossfade())
                .to_owned(),
        )
        .await
}

fn valid_loop_region() -> SimpleExpr {
    Expr::col(AudioObject::StartLoopTimeUs)
        .is_null()
        .and(Expr::col(AudioObject::EndLoopTimeUs).is_null())
        .or(Expr::col(AudioObject::StartLoopTimeUs)
            .is_not_null()
            .and(Expr::col(AudioObject::EndLoopTimeUs).is_not_null())
            .and(Expr::col(AudioObject::StartLoopTimeUs).gte(Expr::col(AudioObject::StartTimeUs)))
            .and(Expr::col(AudioObject::EndLoopTimeUs).gt(Expr::col(AudioObject::StartLoopTimeUs)))
            .and(Expr::col(AudioObject::EndLoopTimeUs).lte(Expr::col(AudioObject::EndTimeUs))))
}

fn valid_crossfade() -> SimpleExpr {
    Expr::col(AudioObject::LoopCrossfadeDurationUs)
        .is_null()
        .or(Expr::col(AudioObject::StartLoopTimeUs)
            .is_not_null()
            .and(Expr::col(AudioObject::LoopCrossfadeDurationUs).gt(0))
            .and(Expr::col(AudioObject::LoopCrossfadeDurationUs).lt(
                Expr::col(AudioObject::EndLoopTimeUs).sub(Expr::col(AudioObject::StartLoopTimeUs)),
            )))
}

async fn create_audio_lists(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(AudioList::Table)
                .col(
                    ColumnDef::new(AudioList::Id)
                        .uuid()
                        .not_null()
                        .primary_key(),
                )
                .col(
                    ColumnDef::new(AudioList::Name)
                        .string()
                        .not_null()
                        .check(non_empty(AudioList::Name)),
                )
                .col(
                    ColumnDef::new(AudioList::SelectionMode)
                        .string()
                        .not_null()
                        .check(Expr::col(AudioList::SelectionMode).is_in([
                            "sequential",
                            "random",
                            "weighted_random",
                        ])),
                )
                .to_owned(),
        )
        .await
}

async fn create_audio_list_entries(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(AudioListEntry::Table)
                .col(
                    ColumnDef::new(AudioListEntry::AudioListId)
                        .uuid()
                        .not_null(),
                )
                .col(
                    ColumnDef::new(AudioListEntry::AudioObjectId)
                        .uuid()
                        .not_null(),
                )
                .col(
                    ColumnDef::new(AudioListEntry::Position)
                        .integer()
                        .not_null()
                        .check(Expr::col(AudioListEntry::Position).gte(0)),
                )
                .col(
                    ColumnDef::new(AudioListEntry::Weight)
                        .integer()
                        .not_null()
                        .check(Expr::col(AudioListEntry::Weight).gte(1)),
                )
                .primary_key(
                    Index::create()
                        .col(AudioListEntry::AudioListId)
                        .col(AudioListEntry::AudioObjectId),
                )
                .index(
                    Index::create()
                        .unique()
                        .col(AudioListEntry::AudioListId)
                        .col(AudioListEntry::Position),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(AudioListEntry::Table, AudioListEntry::AudioListId)
                        .to(AudioList::Table, AudioList::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(AudioListEntry::Table, AudioListEntry::AudioObjectId)
                        .to(AudioObject::Table, AudioObject::Id)
                        .on_delete(ForeignKeyAction::Restrict),
                )
                .to_owned(),
        )
        .await
}

async fn create_audio_compositions(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(AudioComposition::Table)
                .col(
                    ColumnDef::new(AudioComposition::Id)
                        .uuid()
                        .not_null()
                        .primary_key(),
                )
                .col(
                    ColumnDef::new(AudioComposition::Name)
                        .string()
                        .not_null()
                        .check(non_empty(AudioComposition::Name)),
                )
                .to_owned(),
        )
        .await
}

async fn create_audio_composition_layers(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(AudioCompositionLayer::Table)
                .col(
                    ColumnDef::new(AudioCompositionLayer::Id)
                        .uuid()
                        .not_null()
                        .primary_key(),
                )
                .col(
                    ColumnDef::new(AudioCompositionLayer::AudioCompositionId)
                        .uuid()
                        .not_null(),
                )
                .col(
                    ColumnDef::new(AudioCompositionLayer::Name)
                        .string()
                        .not_null()
                        .check(non_empty(AudioCompositionLayer::Name)),
                )
                .col(
                    ColumnDef::new(AudioCompositionLayer::Position)
                        .integer()
                        .not_null()
                        .check(Expr::col(AudioCompositionLayer::Position).gte(0)),
                )
                .col(ColumnDef::new(AudioCompositionLayer::AudioObjectId).uuid())
                .col(ColumnDef::new(AudioCompositionLayer::AudioListId).uuid())
                .col(
                    ColumnDef::new(AudioCompositionLayer::ExecutionMode)
                        .string()
                        .not_null()
                        .check(
                            Expr::col(AudioCompositionLayer::ExecutionMode)
                                .is_in(["continuous", "random_interval"]),
                        ),
                )
                .col(ColumnDef::new(AudioCompositionLayer::MinIntervalUs).big_integer())
                .col(ColumnDef::new(AudioCompositionLayer::MaxIntervalUs).big_integer())
                .col(
                    ColumnDef::new(AudioCompositionLayer::DisableBehavior)
                        .string()
                        .not_null()
                        .check(
                            Expr::col(AudioCompositionLayer::DisableBehavior)
                                .is_in(["stop", "finish"]),
                        ),
                )
                .index(
                    Index::create()
                        .unique()
                        .col(AudioCompositionLayer::AudioCompositionId)
                        .col(AudioCompositionLayer::Position),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(
                            AudioCompositionLayer::Table,
                            AudioCompositionLayer::AudioCompositionId,
                        )
                        .to(AudioComposition::Table, AudioComposition::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(
                            AudioCompositionLayer::Table,
                            AudioCompositionLayer::AudioObjectId,
                        )
                        .to(AudioObject::Table, AudioObject::Id)
                        .on_delete(ForeignKeyAction::Restrict),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(
                            AudioCompositionLayer::Table,
                            AudioCompositionLayer::AudioListId,
                        )
                        .to(AudioList::Table, AudioList::Id)
                        .on_delete(ForeignKeyAction::Restrict),
                )
                .check(valid_layer_source())
                .check(valid_layer_execution())
                .to_owned(),
        )
        .await
}

fn valid_layer_source() -> SimpleExpr {
    Expr::col(AudioCompositionLayer::AudioObjectId)
        .is_null()
        .and(Expr::col(AudioCompositionLayer::AudioListId).is_not_null())
        .or(Expr::col(AudioCompositionLayer::AudioObjectId)
            .is_not_null()
            .and(Expr::col(AudioCompositionLayer::AudioListId).is_null()))
}

fn valid_layer_execution() -> SimpleExpr {
    Expr::col(AudioCompositionLayer::ExecutionMode)
        .eq("continuous")
        .and(Expr::col(AudioCompositionLayer::MinIntervalUs).is_null())
        .and(Expr::col(AudioCompositionLayer::MaxIntervalUs).is_null())
        .or(Expr::col(AudioCompositionLayer::ExecutionMode)
            .eq("random_interval")
            .and(Expr::col(AudioCompositionLayer::MinIntervalUs).is_not_null())
            .and(Expr::col(AudioCompositionLayer::MaxIntervalUs).is_not_null())
            .and(Expr::col(AudioCompositionLayer::MinIntervalUs).gte(0))
            .and(
                Expr::col(AudioCompositionLayer::MinIntervalUs)
                    .lte(Expr::col(AudioCompositionLayer::MaxIntervalUs)),
            ))
}

async fn create_scene_associations(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_table(
            Table::create()
                .table(SceneAudioObject::Table)
                .col(ColumnDef::new(SceneAudioObject::SceneId).uuid().not_null())
                .col(
                    ColumnDef::new(SceneAudioObject::AudioObjectId)
                        .uuid()
                        .not_null(),
                )
                .primary_key(
                    Index::create()
                        .col(SceneAudioObject::SceneId)
                        .col(SceneAudioObject::AudioObjectId),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(SceneAudioObject::Table, SceneAudioObject::SceneId)
                        .to(CoreScene::Table, CoreScene::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(SceneAudioObject::Table, SceneAudioObject::AudioObjectId)
                        .to(AudioObject::Table, AudioObject::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .to_owned(),
        )
        .await?;
    manager
        .create_table(
            Table::create()
                .table(SceneAudioList::Table)
                .col(ColumnDef::new(SceneAudioList::SceneId).uuid().not_null())
                .col(
                    ColumnDef::new(SceneAudioList::AudioListId)
                        .uuid()
                        .not_null(),
                )
                .primary_key(
                    Index::create()
                        .col(SceneAudioList::SceneId)
                        .col(SceneAudioList::AudioListId),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(SceneAudioList::Table, SceneAudioList::SceneId)
                        .to(CoreScene::Table, CoreScene::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(SceneAudioList::Table, SceneAudioList::AudioListId)
                        .to(AudioList::Table, AudioList::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .to_owned(),
        )
        .await?;
    manager
        .create_table(
            Table::create()
                .table(SceneAudioComposition::Table)
                .col(
                    ColumnDef::new(SceneAudioComposition::SceneId)
                        .uuid()
                        .not_null(),
                )
                .col(
                    ColumnDef::new(SceneAudioComposition::AudioCompositionId)
                        .uuid()
                        .not_null(),
                )
                .primary_key(
                    Index::create()
                        .col(SceneAudioComposition::SceneId)
                        .col(SceneAudioComposition::AudioCompositionId),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(SceneAudioComposition::Table, SceneAudioComposition::SceneId)
                        .to(CoreScene::Table, CoreScene::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(
                            SceneAudioComposition::Table,
                            SceneAudioComposition::AudioCompositionId,
                        )
                        .to(AudioComposition::Table, AudioComposition::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .to_owned(),
        )
        .await?;
    manager
        .create_table(
            Table::create()
                .table(SceneLevelDisabledLayer::Table)
                .col(
                    ColumnDef::new(SceneLevelDisabledLayer::SceneLevelId)
                        .uuid()
                        .not_null(),
                )
                .col(
                    ColumnDef::new(SceneLevelDisabledLayer::CompositionLayerId)
                        .uuid()
                        .not_null(),
                )
                .primary_key(
                    Index::create()
                        .col(SceneLevelDisabledLayer::SceneLevelId)
                        .col(SceneLevelDisabledLayer::CompositionLayerId),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(
                            SceneLevelDisabledLayer::Table,
                            SceneLevelDisabledLayer::SceneLevelId,
                        )
                        .to(CoreSceneLevel::Table, CoreSceneLevel::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(
                            SceneLevelDisabledLayer::Table,
                            SceneLevelDisabledLayer::CompositionLayerId,
                        )
                        .to(AudioCompositionLayer::Table, AudioCompositionLayer::Id)
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .to_owned(),
        )
        .await
}

async fn create_indexes(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .create_index(
            Index::create()
                .name("tool_audio_list_entries_object_idx")
                .table(AudioListEntry::Table)
                .col(AudioListEntry::AudioObjectId)
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("tool_audio_layers_composition_idx")
                .table(AudioCompositionLayer::Table)
                .col(AudioCompositionLayer::AudioCompositionId)
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("tool_audio_layers_object_idx")
                .table(AudioCompositionLayer::Table)
                .col(AudioCompositionLayer::AudioObjectId)
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("tool_audio_layers_list_idx")
                .table(AudioCompositionLayer::Table)
                .col(AudioCompositionLayer::AudioListId)
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("tool_audio_scene_objects_object_idx")
                .table(SceneAudioObject::Table)
                .col(SceneAudioObject::AudioObjectId)
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("tool_audio_scene_lists_list_idx")
                .table(SceneAudioList::Table)
                .col(SceneAudioList::AudioListId)
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("tool_audio_scene_compositions_composition_idx")
                .table(SceneAudioComposition::Table)
                .col(SceneAudioComposition::AudioCompositionId)
                .to_owned(),
        )
        .await?;
    manager
        .create_index(
            Index::create()
                .name("tool_audio_scene_level_disabled_layers_layer_idx")
                .table(SceneLevelDisabledLayer::Table)
                .col(SceneLevelDisabledLayer::CompositionLayerId)
                .to_owned(),
        )
        .await
}

async fn seed_settings(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    manager
        .execute(
            Query::insert()
                .into_table(AudioMixerSettings::Table)
                .columns([AudioMixerSettings::Id, AudioMixerSettings::MasterVolumeDb])
                .values_panic([1.into(), 0.0.into()])
                .to_owned(),
        )
        .await?;
    Ok(())
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
enum AppSettings {
    #[sea_orm(iden = "app_settings")]
    Table,
    Id,
    AssetDirectory,
}

#[derive(DeriveIden)]
enum AudioMixerSettings {
    #[sea_orm(iden = "tool_audio_mixer_settings")]
    Table,
    Id,
    MasterVolumeDb,
}

#[derive(DeriveIden)]
enum AudioObject {
    #[sea_orm(iden = "tool_audio_objects")]
    Table,
    Id,
    Name,
    AssetPath,
    VolumeDb,
    StartTimeUs,
    EndTimeUs,
    StartLoopTimeUs,
    EndLoopTimeUs,
    FadeInDurationUs,
    FadeOutDurationUs,
    LoopCrossfadeDurationUs,
}

#[derive(DeriveIden)]
enum AudioList {
    #[sea_orm(iden = "tool_audio_lists")]
    Table,
    Id,
    Name,
    SelectionMode,
}

#[derive(DeriveIden)]
enum AudioListEntry {
    #[sea_orm(iden = "tool_audio_list_entries")]
    Table,
    AudioListId,
    AudioObjectId,
    Position,
    Weight,
}

#[derive(DeriveIden)]
enum AudioComposition {
    #[sea_orm(iden = "tool_audio_compositions")]
    Table,
    Id,
    Name,
}

#[derive(DeriveIden)]
enum AudioCompositionLayer {
    #[sea_orm(iden = "tool_audio_composition_layers")]
    Table,
    Id,
    AudioCompositionId,
    Name,
    Position,
    AudioObjectId,
    AudioListId,
    ExecutionMode,
    MinIntervalUs,
    MaxIntervalUs,
    DisableBehavior,
}

#[derive(DeriveIden)]
enum SceneAudioObject {
    #[sea_orm(iden = "tool_audio_scene_objects")]
    Table,
    SceneId,
    AudioObjectId,
}

#[derive(DeriveIden)]
enum SceneAudioList {
    #[sea_orm(iden = "tool_audio_scene_lists")]
    Table,
    SceneId,
    AudioListId,
}

#[derive(DeriveIden)]
enum SceneAudioComposition {
    #[sea_orm(iden = "tool_audio_scene_compositions")]
    Table,
    SceneId,
    AudioCompositionId,
}

#[derive(DeriveIden)]
enum SceneLevelDisabledLayer {
    #[sea_orm(iden = "tool_audio_scene_level_disabled_layers")]
    Table,
    SceneLevelId,
    CompositionLayerId,
}

#[derive(DeriveIden)]
enum CoreScene {
    #[sea_orm(iden = "core_scenes")]
    Table,
    Id,
}

#[derive(DeriveIden)]
enum CoreSceneLevel {
    #[sea_orm(iden = "core_scene_levels")]
    Table,
    Id,
}
