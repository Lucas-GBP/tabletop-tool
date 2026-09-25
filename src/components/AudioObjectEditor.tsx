import { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { AudioAssetDto, AudioObjectDto, AudioObjectInputDto } from "@/api";
import { api } from "@/api";
import { asAudioObjectId } from "@/types";
import type { PlaybackId } from "@/types";
import { AssetWarning } from "./AssetWarning";
import { AudioAssetPicker } from "./AudioAssetPicker";
import { Button, EmptyState, Input, Panel, SectionHeading } from "./primitives";
import { WaveformEditor } from "./WaveformEditor";
import type { TimeRegion } from "./WaveformEditor";
import { WorkspaceFeedback } from "./WorkspaceFeedback";
import { applicationErrorMessage } from "@/lib";
import {
  AudioMixer,
  audioBufferDurationUs,
  clamp,
  fitAudioObjectToDuration,
} from "@/tools/audio-mixer";
import styles from "./AudioObjectEditor.module.scss";

export interface AudioObjectEditorProps {
  object: AudioObjectDto;
  files: readonly AudioAssetDto[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (input: AudioObjectInputDto) => Promise<void>;
  onRefresh: () => void;
}

export function AudioObjectEditor({
  object,
  files,
  busy,
  error,
  onClose,
  onSave,
  onRefresh,
}: AudioObjectEditorProps) {
  const initialDraftRef = useRef(inputFromObject(object));
  const [draft, setDraft] = useState<AudioObjectInputDto>(
    initialDraftRef.current,
  );
  const [activeRegion, setActiveRegion] = useState<"playback" | "loop">(
    "playback",
  );
  const [peaks, setPeaks] = useState<number[]>([]);
  const [decodedAudio, setDecodedAudio] = useState<{
    assetPath: string;
    durationUs: number;
  } | null>(null);
  const [waveformError, setWaveformError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [playheadUs, setPlayheadUs] = useState(draft.startTimeUs);
  const [previewState, setPreviewState] = useState("Parado");
  const [selectingAsset, setSelectingAsset] = useState(false);
  const mixerRef = useRef<AudioMixer | null>(null);
  const playbackIdRef = useRef<PlaybackId | null>(null);
  const selectedFile = files.find(
    (file) => file.relativePath === draft.assetPath,
  );
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initialDraftRef.current);

  function leaveEditor() {
    if (dirty && !window.confirm("Descartar as alterações deste objeto?")) {
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (!selectedFile) return;
    let cancelled = false;
    void loadPeaks(selectedFile.relativePath)
      .then((value) => {
        if (!cancelled) {
          const durationUs = Math.min(
            selectedFile.durationUs,
            value.durationUs,
          );
          setPeaks(value.peaks);
          setDecodedAudio({
            assetPath: selectedFile.relativePath,
            durationUs,
          });
          setDraft((current) =>
            current.assetPath === selectedFile.relativePath
              ? fitAudioObjectToDuration(current, durationUs)
              : current,
          );
          if (initialDraftRef.current.assetPath === selectedFile.relativePath) {
            initialDraftRef.current = fitAudioObjectToDuration(
              initialDraftRef.current,
              durationUs,
            );
          }
          setPlayheadUs((current) => clamp(current, 0, durationUs));
          setWaveformError("");
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setWaveformError(applicationErrorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const playbackId = playbackIdRef.current;
      const mixer = mixerRef.current;
      if (!playbackId || !mixer) return;
      const playback = mixer.activePlaybacks.find(
        (item) => item.id === playbackId,
      );
      if (!playback) {
        playbackIdRef.current = null;
        setPreviewState("Parado");
        setPlayheadUs(draft.startTimeUs);
        return;
      }
      setPreviewState(
        playback.state === "paused"
          ? "Pausado"
          : playback.state === "pausing" || playback.state === "stopping"
            ? "Encerrando"
            : "Tocando",
      );
      setPlayheadUs(playback.positionUs);
    }, 80);
    return () => window.clearInterval(timer);
  }, [draft.startTimeUs]);

  useEffect(
    () => () => {
      mixerRef.current?.dispose();
    },
    [],
  );

  const playback = { startUs: draft.startTimeUs, endUs: draft.endTimeUs };
  const editorDurationUs = Math.min(
    selectedFile?.durationUs ?? 1,
    decodedAudio && decodedAudio.assetPath === selectedFile?.relativePath
      ? decodedAudio.durationUs
      : (selectedFile?.durationUs ?? 1),
  );
  const loop =
    draft.startLoopTimeUs !== null && draft.endLoopTimeUs !== null
      ? { startUs: draft.startLoopTimeUs, endUs: draft.endLoopTimeUs }
      : null;

  function update(patch: Partial<AudioObjectInputDto>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updatePlayback(patch: Partial<AudioObjectInputDto>) {
    disposePreview(false);
    update(patch);
  }

  function changeAsset(asset: AudioAssetDto) {
    disposePreview(false);
    setPlayheadUs(0);
    setPeaks([]);
    setDecodedAudio(null);
    setWaveformError("");
    setDraft((current) => ({
      ...current,
      assetPath: asset.relativePath,
      startTimeUs: 0,
      endTimeUs: asset.durationUs,
      startLoopTimeUs: null,
      endLoopTimeUs: null,
      loopCrossfadeDurationUs: null,
    }));
    setSelectingAsset(false);
  }

  function updateRegion(region: "playback" | "loop", value: TimeRegion) {
    disposePreview(false);
    if (region === "playback") {
      const nextLoop = loop ? fitRegion(loop, value) : null;
      setPlayheadUs((current) => clamp(current, value.startUs, value.endUs));
      update({
        startTimeUs: value.startUs,
        endTimeUs: value.endUs,
        ...(nextLoop
          ? {
              startLoopTimeUs: nextLoop.startUs,
              endLoopTimeUs: nextLoop.endUs,
            }
          : {}),
      });
    } else {
      setPlayheadUs((current) => clamp(current, playback.startUs, value.endUs));
      update({ startLoopTimeUs: value.startUs, endLoopTimeUs: value.endUs });
    }
  }

  function disposePreview(resetPlayhead = true) {
    mixerRef.current?.dispose();
    mixerRef.current = null;
    playbackIdRef.current = null;
    setPreviewState("Parado");
    if (resetPlayhead) setPlayheadUs(draft.startTimeUs);
  }

  function seekPreview(positionUs: number) {
    const seekEndUs = loop?.endUs ?? playback.endUs;
    const position = clamp(
      positionUs,
      playback.startUs,
      Math.max(playback.startUs, seekEndUs - 1),
    );
    setPlayheadUs(position);
    const mixer = mixerRef.current;
    const playbackId = playbackIdRef.current;
    if (mixer && playbackId && mixer.hasPlayback(playbackId)) {
      mixer.seek(playbackId, position);
    }
  }

  async function playPreview() {
    setPreviewError("");
    const previewStartUs = clamp(
      playheadUs,
      draft.startTimeUs,
      Math.max(draft.startTimeUs, (draft.endLoopTimeUs ?? draft.endTimeUs) - 1),
    );
    disposePreview(false);
    const previewObject: AudioObjectDto = {
      id: asAudioObjectId("audio-object-preview"),
      ...draft,
    };
    const mixer = new AudioMixer({
      definitions: {
        files,
        objects: [previewObject],
        lists: [],
        compositions: [],
      },
      masterVolumeDb: 0,
      resolveFilePath: api.resolveAssetPath,
    });
    mixerRef.current = mixer;
    try {
      const playbackId = await mixer.play({
        kind: "audioObject",
        id: previewObject.id,
      });
      playbackIdRef.current = playbackId;
      if (previewStartUs !== draft.startTimeUs) {
        mixer.seek(playbackId, previewStartUs);
      }
      setPlayheadUs(previewStartUs);
      setPreviewState("Tocando");
    } catch (cause) {
      setPreviewError(applicationErrorMessage(cause));
      mixer.dispose();
    }
  }

  function control(action: "pause" | "resume" | "stop") {
    const mixer = mixerRef.current;
    const id = playbackIdRef.current;
    if (!mixer || !id || !mixer.hasPlayback(id)) return;
    if (action === "pause") mixer.pause(id);
    else if (action === "resume") mixer.resume(id);
    else mixer.stop(id);
  }

  return (
    <section className={styles.editor}>
      <header className={styles.header}>
        <Button tone="subtle" onClick={leaveEditor}>
          Fechar editor
        </Button>
        <div>
          <p>Objeto de áudio</p>
          <h1>{object.name}</h1>
        </div>
        <Button
          className={styles["header-save"]}
          tone="primary"
          type="submit"
          form="audio-object-form"
          disabled={busy || !dirty}
        >
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </header>
      <WorkspaceFeedback error={error || waveformError || previewError} />

      <form
        id="audio-object-form"
        className={styles.workspace}
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(draft);
        }}
      >
        <Panel as="section" className={styles["waveform-panel"]}>
          <SectionHeading eyebrow="Regiões" title="Forma de onda" />
          <div className={styles["region-buttons"]}>
            <Button
              aria-pressed={activeRegion === "playback"}
              onClick={() => setActiveRegion("playback")}
            >
              Reprodução
            </Button>
            <Button
              aria-pressed={activeRegion === "loop"}
              disabled={!loop}
              onClick={() => setActiveRegion("loop")}
            >
              Loop
            </Button>
          </div>
          {selectedFile ? (
            peaks.length > 0 ? (
              <WaveformEditor
                peaks={peaks}
                durationUs={editorDurationUs}
                playback={playback}
                loop={loop}
                activeRegion={activeRegion}
                playheadUs={playheadUs}
                onChange={updateRegion}
                onSeek={seekPreview}
              />
            ) : (
              <p className={styles["waveform-loading"]}>
                Carregando forma de onda…
              </p>
            )
          ) : (
            <EmptyState title="Arquivo não encontrado">
              Escolha outro arquivo para continuar editando este objeto.
            </EmptyState>
          )}
          <div className={styles.preview}>
            <Button
              tone="primary"
              disabled={!selectedFile || previewState === "Tocando"}
              onClick={() => void playPreview()}
            >
              ▶ Tocar
            </Button>
            <Button
              size="compact"
              disabled={previewState !== "Tocando"}
              onClick={() => control("pause")}
            >
              Pausar
            </Button>
            <Button
              size="compact"
              disabled={previewState !== "Pausado"}
              onClick={() => control("resume")}
            >
              Continuar
            </Button>
            <Button
              size="compact"
              disabled={previewState === "Parado"}
              onClick={() => control("stop")}
            >
              Parar
            </Button>
            <span>{previewState}</span>
          </div>
        </Panel>

        <Panel as="section" className={styles.settings}>
          <SectionHeading eyebrow="Definição" title="Ajustes" />
          <label>
            Nome
            <Input
              value={draft.name}
              required
              onChange={(event) => update({ name: event.currentTarget.value })}
            />
          </label>
          <label>
            Arquivo
            <span className={styles["asset-control"]}>
              <span>{selectedFile?.name ?? draft.assetPath}</span>
              <Button onClick={() => setSelectingAsset(true)}>
                Trocar arquivo
              </Button>
            </span>
          </label>
          {!selectedFile ? (
            <AssetWarning>
              O arquivo deste objeto não foi encontrado
            </AssetWarning>
          ) : null}
          <NumberField
            label="Volume (dB)"
            value={draft.volumeDb}
            step={0.5}
            onChange={(volumeDb) => updatePlayback({ volumeDb })}
          />
          <NumberField
            label="Início (s)"
            value={toSeconds(draft.startTimeUs)}
            step={0.01}
            min={0}
            max={toSeconds(editorDurationUs)}
            onChange={(value) => {
              const startTimeUs = toMicroseconds(value);
              setPlayheadUs((current) =>
                clamp(current, startTimeUs, draft.endTimeUs),
              );
              updatePlayback({ startTimeUs });
            }}
          />
          <NumberField
            label="Fim (s)"
            value={toSeconds(draft.endTimeUs)}
            step={0.01}
            min={0}
            max={toSeconds(editorDurationUs)}
            onChange={(value) => {
              const endTimeUs = toMicroseconds(value);
              setPlayheadUs((current) =>
                clamp(current, draft.startTimeUs, endTimeUs),
              );
              updatePlayback({ endTimeUs });
            }}
          />
          <NumberField
            label="Fade in (s)"
            value={toSeconds(draft.fadeInDurationUs)}
            step={0.05}
            min={0}
            max={toSeconds(draft.endTimeUs - draft.startTimeUs)}
            onChange={(value) =>
              updatePlayback({ fadeInDurationUs: toMicroseconds(value) })
            }
          />
          <NumberField
            label="Fade out (s)"
            value={toSeconds(draft.fadeOutDurationUs)}
            step={0.05}
            min={0}
            max={toSeconds(draft.endTimeUs - draft.startTimeUs)}
            onChange={(value) =>
              updatePlayback({ fadeOutDurationUs: toMicroseconds(value) })
            }
          />
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={loop !== null}
              onChange={(event) => {
                if (event.currentTarget.checked) {
                  const length = draft.endTimeUs - draft.startTimeUs;
                  updatePlayback({
                    startLoopTimeUs:
                      draft.startTimeUs + Math.round(length * 0.25),
                    endLoopTimeUs:
                      draft.startTimeUs + Math.round(length * 0.75),
                  });
                  setActiveRegion("loop");
                } else {
                  updatePlayback({
                    startLoopTimeUs: null,
                    endLoopTimeUs: null,
                    loopCrossfadeDurationUs: null,
                  });
                  setActiveRegion("playback");
                }
              }}
            />
            Repetir uma região
          </label>
          {loop && (
            <>
              <NumberField
                label="Início do loop (s)"
                value={toSeconds(loop.startUs)}
                step={0.01}
                min={0}
                max={toSeconds(draft.endTimeUs)}
                onChange={(value) =>
                  updatePlayback({ startLoopTimeUs: toMicroseconds(value) })
                }
              />
              <NumberField
                label="Fim do loop (s)"
                value={toSeconds(loop.endUs)}
                step={0.01}
                min={0}
                max={toSeconds(draft.endTimeUs)}
                onChange={(value) =>
                  updatePlayback({ endLoopTimeUs: toMicroseconds(value) })
                }
              />
              <NumberField
                label="Crossfade do loop (s)"
                value={toSeconds(draft.loopCrossfadeDurationUs ?? 0)}
                step={0.01}
                min={0}
                onChange={(value) =>
                  updatePlayback({
                    loopCrossfadeDurationUs:
                      value > 0 ? toMicroseconds(value) : null,
                  })
                }
              />
            </>
          )}
        </Panel>
      </form>
      {selectingAsset ? (
        <AudioAssetPicker
          assets={files}
          title="Trocar arquivo do objeto"
          currentAssetPath={draft.assetPath}
          busy={busy}
          onRefresh={onRefresh}
          onClose={() => setSelectingAsset(false)}
          onSelect={changeAsset}
        />
      ) : null}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label>
      {label}
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber || 0)}
        {...props}
      />
    </label>
  );
}

function inputFromObject(object: AudioObjectDto): AudioObjectInputDto {
  return {
    name: object.name,
    assetPath: object.assetPath,
    volumeDb: object.volumeDb,
    startTimeUs: object.startTimeUs,
    endTimeUs: object.endTimeUs,
    startLoopTimeUs: object.startLoopTimeUs,
    endLoopTimeUs: object.endLoopTimeUs,
    fadeInDurationUs: object.fadeInDurationUs,
    fadeOutDurationUs: object.fadeOutDurationUs,
    loopCrossfadeDurationUs: object.loopCrossfadeDurationUs,
  };
}

async function loadPeaks(relativePath: string) {
  const path = await api.resolveAssetPath(relativePath);
  const response = await fetch(convertFileSrc(path));
  if (!response.ok)
    throw new Error("Não foi possível carregar a forma de onda.");
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const count = Math.min(600, Math.max(80, Math.floor(channel.length / 256)));
    const size = Math.max(1, Math.floor(channel.length / count));
    const peaks = Array.from({ length: count }, (_, index) => {
      let peak = 0;
      const end = Math.min(channel.length, (index + 1) * size);
      for (let cursor = index * size; cursor < end; cursor += 1) {
        peak = Math.max(peak, Math.abs(channel[cursor] ?? 0));
      }
      return peak;
    });
    return { peaks, durationUs: audioBufferDurationUs(buffer) };
  } finally {
    await context.close();
  }
}

const toSeconds = (value: number) =>
  Math.round((value / 1_000_000) * 100) / 100;
const toMicroseconds = (value: number) => Math.round(value * 1_000_000);

function fitRegion(region: TimeRegion, bounds: TimeRegion): TimeRegion {
  const available = Math.max(1, bounds.endUs - bounds.startUs);
  const duration = Math.min(available, region.endUs - region.startUs);
  const startUs = clamp(
    region.startUs,
    bounds.startUs,
    bounds.endUs - duration,
  );
  return { startUs, endUs: startUs + duration };
}
