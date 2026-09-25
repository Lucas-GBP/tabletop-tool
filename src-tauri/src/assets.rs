//! Transient descriptions of files discovered below the configured asset root.

use std::{
    ffi::OsStr,
    fs,
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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AudioAssetScanWarning {
    pub code: &'static str,
    pub path: String,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct AudioAssetScanResult {
    pub assets: Vec<AudioAsset>,
    pub warnings: Vec<AudioAssetScanWarning>,
}

pub fn scan_audio_directory(root: &Path) -> AudioAssetScanResult {
    let mut result = AudioAssetScanResult::default();
    let mut paths = Vec::new();
    collect_audio_paths(root, root, &mut paths, &mut result.warnings);
    paths.sort();

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
            result
                .warnings
                .push(warning(root, &path, "AUDIO_ASSET_PROBE_FAILED"));
            continue;
        };
        let Ok(metadata) = fs::metadata(&path) else {
            result
                .warnings
                .push(warning(root, &path, "AUDIO_ASSET_METADATA_FAILED"));
            continue;
        };
        let Ok(size_bytes) = i64::try_from(metadata.len()) else {
            result
                .warnings
                .push(warning(root, &path, "AUDIO_ASSET_SIZE_INVALID"));
            continue;
        };
        let Some(original_file_name) = path.file_name().and_then(OsStr::to_str).map(str::to_owned)
        else {
            result
                .warnings
                .push(warning(root, &path, "AUDIO_ASSET_NAME_INVALID"));
            continue;
        };
        let name = path
            .file_stem()
            .and_then(OsStr::to_str)
            .unwrap_or(&original_file_name)
            .to_owned();
        let Ok(relative) = path.strip_prefix(root) else {
            result
                .warnings
                .push(warning(root, &path, "AUDIO_ASSET_PATH_INVALID"));
            continue;
        };
        result.assets.push(AudioAsset {
            name,
            original_file_name,
            relative_path: relative.to_string_lossy().replace('\\', "/"),
            media_type: media_type.to_owned(),
            duration_us,
            size_bytes,
        });
    }
    result
}

fn collect_audio_paths(
    root: &Path,
    directory: &Path,
    paths: &mut Vec<PathBuf>,
    warnings: &mut Vec<AudioAssetScanWarning>,
) {
    let Ok(entries) = fs::read_dir(directory) else {
        warnings.push(warning(root, directory, "AUDIO_ASSET_DIRECTORY_UNREADABLE"));
        return;
    };
    for entry in entries {
        let Ok(entry) = entry else {
            warnings.push(warning(root, directory, "AUDIO_ASSET_ENTRY_UNREADABLE"));
            continue;
        };
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            warnings.push(warning(root, &path, "AUDIO_ASSET_METADATA_FAILED"));
            continue;
        };
        if file_type.is_dir() {
            collect_audio_paths(root, &path, paths, warnings);
        } else if file_type.is_file() {
            paths.push(path);
        }
    }
}

fn warning(root: &Path, path: &Path, code: &'static str) -> AudioAssetScanWarning {
    let display_path = path.strip_prefix(root).unwrap_or(path);
    AudioAssetScanWarning {
        code,
        path: if display_path.as_os_str().is_empty() {
            ".".to_owned()
        } else {
            display_path.to_string_lossy().replace('\\', "/")
        },
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn keeps_valid_assets_when_another_supported_file_is_invalid() {
        let directory = tempdir().unwrap();
        fs::write(directory.path().join("valid.wav"), silent_wav()).unwrap();
        fs::write(directory.path().join("broken.mp3"), b"not audio").unwrap();

        let result = scan_audio_directory(directory.path());

        assert_eq!(result.assets.len(), 1);
        assert_eq!(result.assets[0].relative_path, "valid.wav");
        assert_eq!(result.warnings.len(), 1);
        assert_eq!(result.warnings[0].code, "AUDIO_ASSET_PROBE_FAILED");
        assert_eq!(result.warnings[0].path, "broken.mp3");
    }

    #[test]
    fn reports_an_unreadable_root_without_aborting() {
        let directory = tempdir().unwrap();
        let result = scan_audio_directory(&directory.path().join("missing"));

        assert!(result.assets.is_empty());
        assert_eq!(result.warnings.len(), 1);
        assert_eq!(result.warnings[0].code, "AUDIO_ASSET_DIRECTORY_UNREADABLE");
    }

    fn silent_wav() -> Vec<u8> {
        let samples = vec![128_u8; 800];
        let data_size = u32::try_from(samples.len()).unwrap();
        let mut bytes = Vec::with_capacity(44 + samples.len());
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + data_size).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16_u32.to_le_bytes());
        bytes.extend_from_slice(&1_u16.to_le_bytes());
        bytes.extend_from_slice(&1_u16.to_le_bytes());
        bytes.extend_from_slice(&8_000_u32.to_le_bytes());
        bytes.extend_from_slice(&8_000_u32.to_le_bytes());
        bytes.extend_from_slice(&1_u16.to_le_bytes());
        bytes.extend_from_slice(&8_u16.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_size.to_le_bytes());
        bytes.extend_from_slice(&samples);
        bytes
    }
}
