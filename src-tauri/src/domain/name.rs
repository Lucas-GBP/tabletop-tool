use super::DomainError;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisplayName(String);

impl DisplayName {
    pub fn new(value: &str) -> Result<Self, DomainError> {
        let value = value.trim();
        if value.is_empty() {
            Err(DomainError::InvalidName)
        } else {
            Ok(Self(value.to_owned()))
        }
    }

    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
