use sea_orm::entity::prelude::*;

#[derive(Clone, Copy, Debug, Eq, PartialEq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum SelectionMode {
    #[sea_orm(string_value = "sequential")]
    Sequential,
    #[sea_orm(string_value = "random")]
    Random,
    #[sea_orm(string_value = "weighted_random")]
    WeightedRandom,
}

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "tool_audio_lists")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub selection_mode: SelectionMode,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
