//! Transient descriptions of files discovered below the configured asset root.

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AudioAsset {
    pub name: String,
    pub original_file_name: String,
    pub relative_path: String,
    pub media_type: String,
    pub duration_us: i64,
    pub size_bytes: i64,
}
