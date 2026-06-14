use serde::Serialize;
use std::{
    env, fs, io,
    path::{Path, PathBuf},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AudioFile {
    id: String,
    name: String,
    path: String,
    category: String,
    extension: String,
}

#[tauri::command]
pub(crate) fn list_audio_files() -> Result<Vec<AudioFile>, String> {
    let audio_root = find_audio_root().ok_or_else(|| "Audio folder not found".to_string())?;
    let mut audio_files = Vec::new();

    collect_audio_files(&audio_root, &audio_root, &mut audio_files)
        .map_err(|error| format!("Could not read audio folder: {error}"))?;

    audio_files.sort_by(|left, right| {
        left.category
            .cmp(&right.category)
            .then(left.name.cmp(&right.name))
    });

    Ok(audio_files)
}

fn find_audio_root() -> Option<PathBuf> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let current_dir = env::current_dir().ok();
    let candidates = [
        manifest_dir.join("../public/audio"),
        manifest_dir.join("../dist/audio"),
        current_dir
            .as_ref()
            .map(|dir| dir.join("public/audio"))
            .unwrap_or_default(),
        current_dir
            .as_ref()
            .map(|dir| dir.join("audio"))
            .unwrap_or_default(),
    ];

    candidates
        .into_iter()
        .map(|path| path.components().collect::<PathBuf>())
        .find(|path| path.is_dir())
}

fn collect_audio_files(
    root: &Path,
    directory: &Path,
    audio_files: &mut Vec<AudioFile>,
) -> io::Result<()> {
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            collect_audio_files(root, &path, audio_files)?;
            continue;
        }

        if !is_audio_file(&path) {
            continue;
        }

        if let Some(audio_file) = create_audio_file(root, &path) {
            audio_files.push(audio_file);
        }
    }

    Ok(())
}

fn create_audio_file(root: &Path, path: &Path) -> Option<AudioFile> {
    let relative_path = path.strip_prefix(root).ok()?;
    let file_name = path.file_stem()?.to_string_lossy().to_string();
    let extension = path.extension()?.to_string_lossy().to_lowercase();
    let category = relative_path
        .components()
        .next()
        .map(|component| component.as_os_str().to_string_lossy().to_string())
        .unwrap_or_else(|| "audio".to_string());
    let web_path = format!(
        "audio/{}",
        relative_path.to_string_lossy().replace('\\', "/")
    );

    Some(AudioFile {
        id: web_path.clone(),
        name: file_name,
        path: web_path,
        category,
        extension,
    })
}

fn is_audio_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_lowercase())
            .as_deref(),
        Some("mp3" | "ogg" | "wav" | "flac" | "m4a" | "aac" | "webm")
    )
}
