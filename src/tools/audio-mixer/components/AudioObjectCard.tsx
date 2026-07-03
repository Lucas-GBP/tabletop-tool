import { createSignal } from "solid-js";
import { normalizeAudioObjectConfig } from "../audio/audioRegions";
import type { AudioObjectConfig, AvailableAudioFile } from "../audio/types";
import { AudioRegionEditor } from "./AudioRegionEditor";
import { AudioWaveform } from "./AudioWaveform";
import { NumberDraftInput } from "./NumberDraftInput";
import styles from "./AudioObjectPanel.module.scss";

type AudioObjectCardProps = {
  audioObject: AudioObjectConfig;
  availableAudioFiles: AvailableAudioFile[];
  isPreviewing: boolean;
  previewTime?: number;
  onPickFile: (objectId: string) => void;
  onChange: (object: AudioObjectConfig) => void;
  onPreview: (object: AudioObjectConfig) => void;
  onSeekPreview: (seconds: number) => void;
  onRemove: (objectId: string) => void;
};

function getFileName(files: AvailableAudioFile[], filePath: string): string {
  return files.find((file) => file.path === filePath)?.name ?? filePath;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function AudioObjectCard(props: AudioObjectCardProps) {
  const [duration, setDuration] = createSignal<number>();
  const fileName = () => getFileName(props.availableAudioFiles, props.audioObject.filePath);
  const updateObject = <K extends keyof AudioObjectConfig>(key: K, value: AudioObjectConfig[K]) => {
    props.onChange(normalizeAudioObjectConfig({ ...props.audioObject, [key]: value }));
  };

  return (
    <article class={styles.card}>
      <div class={styles.heading}>
        <div>
          <h3>{props.audioObject.name}</h3>
          <span>{fileName()}</span>
        </div>
        <div class={styles.actions}>
          <button
            type="button"
            classList={{ [styles.previewActive]: props.isPreviewing }}
            aria-pressed={props.isPreviewing}
            onClick={() => props.onPreview(props.audioObject)}
          >
            {props.isPreviewing ? "Parar" : "Ouvir"}
          </button>
          <button type="button" onClick={() => props.onRemove(props.audioObject.id)}>
            Remover
          </button>
        </div>
      </div>

      <div class={styles.grid}>
        <label>
          <span>Nome</span>
          <input
            value={props.audioObject.name}
            onInput={(event) => updateObject("name", event.currentTarget.value)}
          />
        </label>

        <div class={styles.filePicker}>
          <span>Arquivo</span>
          <button type="button" onClick={() => props.onPickFile(props.audioObject.id)}>
            {fileName()}
          </button>
        </div>

        <label class={styles.volume}>
          <span>Volume base</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={props.audioObject.defaultVolume}
            onInput={(event) => updateObject("defaultVolume", Number(event.currentTarget.value))}
          />
          <strong>{Math.round(props.audioObject.defaultVolume * 100)}%</strong>
        </label>

        <label>
          <span>Tags</span>
          <input
            value={props.audioObject.tags.join(", ")}
            placeholder="chuva, casa, tensao"
            onInput={(event) => updateObject("tags", parseTags(event.currentTarget.value))}
          />
        </label>

        <label class={styles.description}>
          <span>Descricao</span>
          <textarea
            rows="2"
            value={props.audioObject.description}
            onInput={(event) => updateObject("description", event.currentTarget.value)}
          />
        </label>
      </div>

      <AudioWaveform
        filePath={props.audioObject.filePath}
        playableRegion={props.audioObject.playableRegion}
        loopRegion={props.audioObject.loopRegion}
        playheadSeconds={props.isPreviewing ? props.previewTime : undefined}
        onDurationChange={setDuration}
        onSeek={props.isPreviewing ? props.onSeekPreview : undefined}
        onRegionsChange={({ playableRegion, loopRegion }) =>
          props.onChange(
            normalizeAudioObjectConfig({
              ...props.audioObject,
              playableRegion,
              loopRegion,
            })
          )
        }
      />

      <div class={styles.regions}>
        <AudioRegionEditor
          audioObject={props.audioObject}
          duration={duration()}
          onChange={props.onChange}
        />

        <fieldset>
          <legend>Fade do objeto</legend>
          <label>
            <span>Fade in</span>
            <NumberDraftInput
              mode="milliseconds"
              value={props.audioObject.fadeInMs}
              onCommit={(value) => updateObject("fadeInMs", value ?? 0)}
            />
          </label>
          <label>
            <span>Fade out</span>
            <NumberDraftInput
              mode="milliseconds"
              value={props.audioObject.fadeOutMs}
              onCommit={(value) => updateObject("fadeOutMs", value ?? 0)}
            />
          </label>
        </fieldset>
      </div>
    </article>
  );
}
