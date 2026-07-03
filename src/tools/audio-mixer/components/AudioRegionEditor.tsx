import {
  REGION_STEP_SECONDS,
  clampSeconds,
  getAudioRegionBounds,
  normalizeAudioObjectConfig,
  normalizeAudioRegions,
  roundSeconds,
} from "../audio/audioRegions";
import { formatOptionalSeconds } from "../audio/audioTime";
import type { AudioObjectConfig } from "../audio/types";
import styles from "./AudioObjectPanel.module.scss";
import { NumberDraftInput, type NumberInputMode } from "./NumberDraftInput";

type AudioRegionEditorProps = {
  audioObject: AudioObjectConfig;
  duration?: number;
  onChange: (audioObject: AudioObjectConfig) => void;
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
        <output>{formatOptionalSeconds(props.value)}</output>
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

export function AudioRegionEditor(props: AudioRegionEditorProps) {
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
