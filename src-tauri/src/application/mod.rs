pub mod core;

use sea_orm::DatabaseConnection;

#[derive(Clone)]
pub struct AppState {
    connection: DatabaseConnection,
}

impl AppState {
    #[must_use]
    pub fn new(connection: DatabaseConnection) -> Self {
        Self { connection }
    }

    #[must_use]
    pub fn connection(&self) -> &DatabaseConnection {
        &self.connection
    }
}
