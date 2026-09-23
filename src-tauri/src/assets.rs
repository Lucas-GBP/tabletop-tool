//! Transient descriptions of files discovered below the configured asset root.

use std::{
    ffi::OsStr,
    fs, io,
    path::{Path, PathBuf},
};
use symphonia::core::{
    codecs::CODEC_TYPE_NULL, formats::FormatOptions, io::MediaSourceStream, meta::MetadataOptions,
    probe::Hint,
};

const SUPPORTED_EXTENSIONS: &[&str] = &["wav", "mp3", "ogg", "flac", "m4a", "aac", "webm"];

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AudioAsset {
    pub name: String,
    pub original_file_name: String,
    pub relative_path: String,
    pub media_type: String,
    pub duration_us: i64,
    pub size_bytes: i64,
}

pub fn scan_audio_directory(root: &Path) -> Result<Vec<AudioAsset>, io::Error> {
    let mut paths = Vec::new();
    collect_audio_paths(root, &mut paths)?;
    paths.sort();

    let mut files = Vec::new();
    for path in paths {
        let Some(extension) = path
            .extension()
            .and_then(OsStr::to_str)
            .map(str::to_ascii_lowercase)
            .filter(|value| SUPPORTED_EXTENSIONS.contains(&value.as_str()))
        else {
            continue;
        };
        let Some((duration_us, media_type)) = probe_audio(&path, &extension) else {
            continue;
        };
        let metadata = fs::metadata(&path).map_err(|error| with_path(&path, error))?;
        let Ok(size_bytes) = i64::try_from(metadata.len()) else {
            continue;
        };
        let Some(original_file_name) = path.file_name().and_then(OsStr::to_str).map(str::to_owned)
        else {
            continue;
        };
        let name = path
            .file_stem()
            .and_then(OsStr::to_str)
            .unwrap_or(&original_file_name)
            .to_owned();
        let Ok(relative) = path.strip_prefix(root) else {
            continue;
        };
        files.push(AudioAsset {
            name,
            original_file_name,
            relative_path: relative.to_string_lossy().replace('\\', "/"),
            media_type: media_type.to_owned(),
            duration_us,
            size_bytes,
        });
    }
    Ok(files)
}

fn collect_audio_paths(directory: &Path, paths: &mut Vec<PathBuf>) -> Result<(), io::Error> {
    let entries = fs::read_dir(directory).map_err(|error| with_path(directory, error))?;
    for entry in entries {
        let entry = entry.map_err(|error| with_path(directory, error))?;
        let path = entry.path();
        let file_type = entry.file_type().map_err(|error| with_path(&path, error))?;
        if file_type.is_dir() {
            collect_audio_paths(&path, paths)?;
        } else if file_type.is_file() {
            paths.push(path);
        }
    }
    Ok(())
}

fn probe_audio(source_path: &Path, extension: &str) -> Option<(i64, &'static str)> {
    let source = fs::File::open(source_path).ok()?;
    let stream = MediaSourceStream::new(Box::new(source), Default::default());
    let mut hint = Hint::new();
    hint.with_extension(extension);
    let probed = symphonia::default::get_probe()
        .format(
            &hint,
            stream,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .ok()?;
    let track = probed
        .format
        .default_track()
        .filter(|track| track.codec_params.codec != CODEC_TYPE_NULL)?;
    let time = track
        .codec_params
        .time_base?
        .calc_time(track.codec_params.n_frames?);
    let duration_us = u128::from(time.seconds)
        .checked_mul(1_000_000)?
        .checked_add((time.frac * 1_000_000.0).round() as u128)
        .and_then(|value| i64::try_from(value).ok())
        .filter(|value| *value > 0)?;
    let media_type = match extension {
        "wav" => "audio/wav",
        "mp3" => "audio/mpeg",
        "ogg" => "audio/ogg",
        "flac" => "audio/flac",
        "m4a" => "audio/mp4",
        "aac" => "audio/aac",
        "webm" => "audio/webm",
        _ => return None,
    };
    Some((duration_us, media_type))
}

fn with_path(path: &Path, error: io::Error) -> io::Error {
    io::Error::new(error.kind(), format!("{}: {error}", path.display()))
}
