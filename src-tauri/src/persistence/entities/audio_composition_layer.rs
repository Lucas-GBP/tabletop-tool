use sea_orm::entity::prelude::*;

#[derive(Clone, Copy, Debug, Eq, PartialEq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
pub enum ExecutionMode {
    #[sea_orm(string_value = "continuous")]
    Continuous,
    #[sea_orm(string_value = "random_interval")]
    RandomInterval,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(16))")]
pub enum StoredDisableBehavior {
    #[sea_orm(string_value = "stop")]
    Stop,
    #[sea_orm(string_value = "finish")]
    Finish,
}

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "tool_audio_composition_layers")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub audio_composition_id: Uuid,
    pub name: String,
    pub position: i32,
    pub audio_object_id: Option<Uuid>,
    pub audio_list_id: Option<Uuid>,
    pub execution_mode: ExecutionMode,
    pub min_interval_us: Option<i64>,
    pub max_interval_us: Option<i64>,
    pub disable_behavior: StoredDisableBehavior,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
