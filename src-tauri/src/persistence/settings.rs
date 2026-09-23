use super::entities::app_settings;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, DatabaseConnection, DbErr, EntityTrait};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AppSettings {
    pub asset_directory: Option<String>,
}

pub async fn load(connection: &DatabaseConnection) -> Result<AppSettings, DbErr> {
    let model = app_settings::Entity::find_by_id(1)
        .one(connection)
        .await?
        .ok_or_else(|| DbErr::RecordNotFound("application settings".to_owned()))?;
    Ok(AppSettings {
        asset_directory: model.asset_directory,
    })
}

pub async fn update_asset_directory(
    connection: &DatabaseConnection,
    directory: &str,
) -> Result<AppSettings, DbErr> {
    let mut active: app_settings::ActiveModel = app_settings::Entity::find_by_id(1)
        .one(connection)
        .await?
        .ok_or_else(|| DbErr::RecordNotFound("application settings".to_owned()))?
        .into();
    active.asset_directory = Set(Some(directory.to_owned()));
    active.update(connection).await?;
    load(connection).await
}
