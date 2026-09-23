use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "tool_audio_scene_level_disabled_layers")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub scene_level_id: Uuid,
    #[sea_orm(primary_key, auto_increment = false)]
    pub composition_layer_id: Uuid,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
