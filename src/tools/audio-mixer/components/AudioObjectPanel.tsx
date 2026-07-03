import { Index, Show, createEffect, createSignal } from "solid-js";
import {
  REGION_STEP_SECONDS,
  clampSeconds,
  getAudioRegionBounds,
  normalizeAudioObjectConfig,
  normalizeAudioRegions,
  parseOptionalSecondsInput,
  parseSecondsInput,
  roundSeconds,
} from "../audio/audioRegions";
import type { AudioObjectConfig, AvailableAudioFile } from "../audio/types";
import { AudioWaveform } from "./AudioWaveform";
import styles from "./AudioObjectPanel.module.scss";

type AudioObjectPanelProps = {
  objects: AudioObjectConfig[];
  availableAudioFiles: AvailableAudioFile[];
  onAdd: () => void;
  onPickFile: (objectId: string) => void;
  onChange: (object: AudioObjectConfig) => void;
  previewingObjectId?: string;
  previewTime?: number;
  onPreview: (object: AudioObjectConfig) => void;
  onSeekPreview: (seconds: number) => void;
  onRemove: (objectId: string) => void;
};

type NumberInputMode = "seconds" | "optionalSeconds" | "milliseconds";

type NumberDraftInputProps = {
  value: number | null;
  mode: NumberInputMode;
  ariaLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  onCommit: (value: number | null) => void;
};

type RegionPointControlProps = {
  label: string;
  rangeLabel: string;
  value: number | null;
  rangeValue: number;
  min: number;
  max: number;
  mode: NumberInputMode;
  disabled?: boolean;
  rangeDisabled?: boolean;
  placeholder?: string;
  clearToEnd?: boolean;
  onRangeChange: (value: number) => void;
  onCommit: (value: number | null) => void;
  onClearToEnd?: () => void;
};

type RegionEditorProps = {
  audioObject: AudioObjectConfig;
  duration?: number;
  onChange: (audioObject: AudioObjectConfig) => void;
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

function formatNumberDraft(value: number | null): string {
  return value === null ? "" : String(value);
}

function formatSecondsLabel(value: number | null): string {
  if (value === null) {
    return "Ate o fim";
  }

  const seconds = roundSeconds(value);

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function parseNumberDraft(
  value: string,
  fallback: number | null,
  mode: NumberInputMode
): number | null {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) {
    return mode === "optionalSeconds" ? null : 0;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  switch (mode) {
    case "milliseconds":
      return Math.max(0, Math.round(parsedValue));
    case "optionalSeconds":
      return parseOptionalSecondsInput(normalizedValue);
    case "seconds":
      return parseSecondsInput(normalizedValue);
  }
}

function NumberDraftInput(props: NumberDraftInputProps) {
  const [isEditing, setIsEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");

  createEffect(() => {
    if (!isEditing()) {
      setDraft(formatNumberDraft(props.value));
    }
  });

  const commitDraft = () => {
    const nextValue = parseNumberDraft(draft(), props.value, props.mode);

    props.onCommit(nextValue);
    setDraft(formatNumberDraft(nextValue));
    setIsEditing(false);
  };

  const cancelDraft = () => {
    setDraft(formatNumberDraft(props.value));
    setIsEditing(false);
  };

  return (
    <input
      type="text"
      inputmode={props.mode === "milliseconds" ? "numeric" : "decimal"}
      value={draft()}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      placeholder={props.placeholder}
      onFocus={() => {
        setIsEditing(true);
        setDraft(formatNumberDraft(props.value));
      }}
      onInput={(event) => setDraft(event.currentTarget.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
          return;
        }

        if (event.key === "Escape") {
          cancelDraft();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function getLoadedDuration(duration?: number): number | undefined {
  return typeof duration === "number" && Number.isFinite(duration)
    ? Math.max(REGION_STEP_SECONDS, duration)
    : undefined;
}

function getFallbackDuration(audioObject: AudioObjectConfig): number {
  const knownValues = [
    audioObject.playableRegion.startSeconds,
    audioObject.playableRegion.endSeconds,
    audioObject.loopRegion.startSeconds,
    audioObject.loopRegion.endSeconds,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const maxKnownValue = Math.max(0, ...knownValues);

  return Math.max(REGION_STEP_SECONDS * 10, maxKnownValue + REGION_STEP_SECONDS * 10);
}

function getOptionalRangeEnd(value: number, duration: number): number | null {
  const roundedValue = roundSeconds(value);

  return roundedValue >= duration - REGION_STEP_SECONDS ? null : roundedValue;
}

function getRangeValue(value: number, min: number, max: number): number {
  const rangeMin = Math.min(min, max);
  const rangeMax = Math.max(min, max);

  return clampSeconds(value, rangeMin, rangeMax);
}

function RegionPointControl(props: RegionPointControlProps) {
  const rangeMin = () => roundSeconds(Math.min(props.min, props.max));
  const rangeMax = () => roundSeconds(Math.max(props.min, props.max));
  const rangeValue = () => getRangeValue(props.rangeValue, rangeMin(), rangeMax());

  return (
    <div class={styles.regionControl}>
      <div class={styles.regionControlHeader}>
        <span>{props.label}</span>
        <output>{formatSecondsLabel(props.value)}</output>
      </div>

      <div class={styles.regionControlBody}>
        <input
          type="range"
          class={styles.regionRange}
          min={rangeMin()}
          max={rangeMax()}
          step={REGION_STEP_SECONDS}
          value={rangeValue()}
          aria-label={props.rangeLabel}
          disabled={props.disabled || props.rangeDisabled}
          onInput={(event) => props.onRangeChange(Number(event.currentTarget.value))}
        />

        <div class={styles.regionControlInputs}>
          <NumberDraftInput
            mode={props.mode}
            value={props.value}
            ariaLabel={props.rangeLabel}
            disabled={props.disabled}
            placeholder={props.placeholder}
            onCommit={props.onCommit}
          />

          {props.clearToEnd && (
            <button
              type="button"
              title="Usar ate o fim"
              classList={{
                [styles.endActive]: props.value === null,
              }}
              disabled={props.disabled}
              onClick={() => props.onClearToEnd?.()}
            >
              Fim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RegionEditor(props: RegionEditorProps) {
  const loadedDuration = () => getLoadedDuration(props.duration);
  const editorDuration = () => loadedDuration() ?? getFallbackDuration(props.audioObject);
  const bounds = () =>
    getAudioRegionBounds(
      props.audioObject.playableRegion,
      props.audioObject.loopRegion,
      editorDuration()
    );
  const canUseRanges = () => loadedDuration() !== undefined;

  const applyAudioObject = (nextAudioObject: AudioObjectConfig) => {
    props.onChange(normalizeAudioObjectConfig(nextAudioObject, loadedDuration()));
  };

  const applyRegions = (
    playableRegion = props.audioObject.playableRegion,
    loopRegion = props.audioObject.loopRegion
  ) => {
    const normalizedRegions = normalizeAudioRegions(playableRegion, loopRegion, loadedDuration());

    applyAudioObject({
      ...props.audioObject,
      ...normalizedRegions,
    });
  };

  const setPlayableStart = (value: number) => {
    applyRegions({
      ...props.audioObject.playableRegion,
      startSeconds: value,
    });
  };

  const setPlayableEnd = (value: number | null) => {
    applyRegions({
      ...props.audioObject.playableRegion,
      endSeconds: value,
    });
  };

  const setLoopStart = (value: number) => {
    applyRegions(props.audioObject.playableRegion, {
      ...props.audioObject.loopRegion,
      startSeconds: value,
    });
  };

  const setLoopEnd = (value: number | null) => {
    applyRegions(props.audioObject.playableRegion, {
      ...props.audioObject.loopRegion,
      endSeconds: value,
    });
  };

  const setLoopEnabled = (enabled: boolean) => {
    applyAudioObject({
      ...props.audioObject,
      loopRegion: {
        ...props.audioObject.loopRegion,
        enabled,
      },
    });
  };

  const playableStartMax = () => Math.max(0, bounds().playableEnd - REGION_STEP_SECONDS);
  const playableEndMin = () =>
    Math.min(editorDuration(), bounds().playableStart + REGION_STEP_SECONDS);
  const loopStartMax = () =>
    Math.max(bounds().playableStart, bounds().loopEnd - REGION_STEP_SECONDS);
  const loopEndMin = () => Math.min(bounds().playableEnd, bounds().loopStart + REGION_STEP_SECONDS);
  const rangeDisabled = () => !canUseRanges();
  const loopDisabled = () => !props.audioObject.loopRegion.enabled;

  return (
    <>
      <fieldset class={styles.regionGroup}>
        <legend>Trecho tocavel</legend>

        <RegionPointControl
          label="Inicio"
          rangeLabel="Inicio do trecho tocavel"
          value={bounds().playableStart}
          rangeValue={bounds().playableStart}
          min={0}
          max={playableStartMax()}
          mode="seconds"
          rangeDisabled={rangeDisabled()}
          onRangeChange={setPlayableStart}
          onCommit={(value) => setPlayableStart(value ?? 0)}
        />

        <RegionPointControl
          label="Fim"
          rangeLabel="Fim do trecho tocavel"
          value={props.audioObject.playableRegion.endSeconds}
          rangeValue={bounds().playableEnd}
          min={playableEndMin()}
          max={editorDuration()}
          mode="optionalSeconds"
          placeholder="Ate o fim"
          clearToEnd
          rangeDisabled={rangeDisabled()}
          onRangeChange={(value) => {
            const duration = loadedDuration();

            if (duration !== undefined) {
              setPlayableEnd(getOptionalRangeEnd(value, duration));
            }
          }}
          onCommit={setPlayableEnd}
          onClearToEnd={() => setPlayableEnd(null)}
        />
      </fieldset>

      <fieldset class={styles.regionGroup}>
        <legend>Loop interno</legend>

        <label class={styles.loopToggle}>
          <input
            type="checkbox"
            checked={props.audioObject.loopRegion.enabled}
            onChange={(event) => setLoopEnabled(event.currentTarget.checked)}
          />
          <span>Ativo</span>
        </label>

        <RegionPointControl
          label="Inicio"
          rangeLabel="Inicio do loop interno"
          value={bounds().loopStart}
          rangeValue={bounds().loopStart}
          min={bounds().playableStart}
          max={loopStartMax()}
          mode="seconds"
          disabled={loopDisabled()}
          rangeDisabled={rangeDisabled()}
          onRangeChange={setLoopStart}
          onCommit={(value) => setLoopStart(value ?? bounds().playableStart)}
        />

        <RegionPointControl
          label="Fim"
          rangeLabel="Fim do loop interno"
          value={props.audioObject.loopRegion.endSeconds}
          rangeValue={bounds().loopEnd}
          min={loopEndMin()}
          max={bounds().playableEnd}
          mode="optionalSeconds"
          placeholder="Ate o fim"
          clearToEnd
          disabled={loopDisabled()}
          rangeDisabled={rangeDisabled()}
          onRangeChange={(value) => {
            const playableEnd = bounds().playableEnd;

            if (canUseRanges()) {
              setLoopEnd(getOptionalRangeEnd(value, playableEnd));
            }
          }}
          onCommit={setLoopEnd}
          onClearToEnd={() => setLoopEnd(null)}
        />
      </fieldset>
    </>
  );
}

export function AudioObjectPanel(props: AudioObjectPanelProps) {
  return (
    <section class={styles.root} aria-label="Objetos de audio">
      <div class={styles.header}>
        <div>
          <h2>Mixer de audio</h2>
          <span>{props.objects.length} reutilizaveis</span>
        </div>
        <button type="button" class={styles.action} onClick={() => props.onAdd()}>
          + Objeto
        </button>
      </div>

      <Show
        when={props.objects.length > 0}
        fallback={
          <p class={styles.empty}>
            Crie objetos a partir dos arquivos para configurar nomes, descricoes, trechos e loops
            reutilizaveis.
          </p>
        }
      >
        <div class={styles.list}>
          <Index each={props.objects}>
            {(audioObject) => {
              const [duration, setDuration] = createSignal<number>();
              const fileName = () => getFileName(props.availableAudioFiles, audioObject().filePath);
              const updateObject = <K extends keyof AudioObjectConfig>(
                key: K,
                value: AudioObjectConfig[K]
              ) => {
                props.onChange(normalizeAudioObjectConfig({ ...audioObject(), [key]: value }));
              };
              const isPreviewing = () => props.previewingObjectId === audioObject().id;

              return (
                <article class={styles.card}>
                  <div class={styles.heading}>
                    <div>
                      <h3>{audioObject().name}</h3>
                      <span>{fileName()}</span>
                    </div>
                    <div class={styles.actions}>
                      <button
                        type="button"
                        classList={{ [styles.previewActive]: isPreviewing() }}
                        aria-pressed={isPreviewing()}
                        onClick={() => props.onPreview(audioObject())}
                      >
                        {isPreviewing() ? "Parar" : "Ouvir"}
                      </button>
                      <button type="button" onClick={() => props.onRemove(audioObject().id)}>
                        Remover
                      </button>
                    </div>
                  </div>

                  <div class={styles.grid}>
                    <label>
                      <span>Nome</span>
                      <input
                        value={audioObject().name}
                        onInput={(event) => updateObject("name", event.currentTarget.value)}
                      />
                    </label>

                    <div class={styles.filePicker}>
                      <span>Arquivo</span>
                      <button type="button" onClick={() => props.onPickFile(audioObject().id)}>
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
                        value={audioObject().defaultVolume}
                        onInput={(event) =>
                          updateObject("defaultVolume", Number(event.currentTarget.value))
                        }
                      />
                      <strong>{Math.round(audioObject().defaultVolume * 100)}%</strong>
                    </label>

                    <label>
                      <span>Tags</span>
                      <input
                        value={audioObject().tags.join(", ")}
                        placeholder="chuva, casa, tensao"
                        onInput={(event) =>
                          updateObject("tags", parseTags(event.currentTarget.value))
                        }
                      />
                    </label>

                    <label class={styles.description}>
                      <span>Descricao</span>
                      <textarea
                        rows="2"
                        value={audioObject().description}
                        onInput={(event) => updateObject("description", event.currentTarget.value)}
                      />
                    </label>
                  </div>

                  <AudioWaveform
                    filePath={audioObject().filePath}
                    playableRegion={audioObject().playableRegion}
                    loopRegion={audioObject().loopRegion}
                    playheadSeconds={isPreviewing() ? props.previewTime : undefined}
                    onDurationChange={setDuration}
                    onSeek={isPreviewing() ? props.onSeekPreview : undefined}
                    onRegionsChange={({ playableRegion, loopRegion }) =>
                      props.onChange(
                        normalizeAudioObjectConfig({
                          ...audioObject(),
                          playableRegion,
                          loopRegion,
                        })
                      )
                    }
                  />

                  <div class={styles.regions}>
                    <RegionEditor
                      audioObject={audioObject()}
                      duration={duration()}
                      onChange={props.onChange}
                    />

                    <fieldset>
                      <legend>Fade do objeto</legend>
                      <label>
                        <span>Fade in</span>
                        <NumberDraftInput
                          mode="milliseconds"
                          value={audioObject().fadeInMs}
                          onCommit={(value) => updateObject("fadeInMs", value ?? 0)}
                        />
                      </label>
                      <label>
                        <span>Fade out</span>
                        <NumberDraftInput
                          mode="milliseconds"
                          value={audioObject().fadeOutMs}
                          onCommit={(value) => updateObject("fadeOutMs", value ?? 0)}
                        />
                      </label>
                    </fieldset>
                  </div>
                </article>
              );
            }}
          </Index>
        </div>
      </Show>
    </section>
  );
}
