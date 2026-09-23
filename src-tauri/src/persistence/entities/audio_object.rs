use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "tool_audio_objects")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub asset_path: String,
    pub volume_db: f64,
    pub start_time_us: i64,
    pub end_time_us: i64,
    pub start_loop_time_us: Option<i64>,
    pub end_loop_time_us: Option<i64>,
    pub fade_in_duration_us: i64,
    pub fade_out_duration_us: i64,
    pub loop_crossfade_duration_us: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
