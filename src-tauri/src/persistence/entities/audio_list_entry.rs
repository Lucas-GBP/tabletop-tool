use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "tool_audio_list_entries")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub audio_list_id: Uuid,
    #[sea_orm(primary_key, auto_increment = false)]
    pub audio_object_id: Uuid,
    pub position: i32,
    pub weight: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
