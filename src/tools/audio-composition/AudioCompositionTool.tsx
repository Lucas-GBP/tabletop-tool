import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { EntityWorkspace } from "../../components/entity-workspace/EntityWorkspace";
import {
  AUDIO_COMPOSITION_STORE_SCHEMA_VERSION,
  createEntityId,
  emptyAudioCompositionStore,
  loadAudioCompositionStore,
  saveAudioCompositionStore,
} from "../../domain/domainStores";
import type {
  AudioCompositionConfig,
  AudioCompositionPlaybackMode,
  AudioCompositionTrackConfig,
  AudioCompositionTrackSourceKind,
} from "../../domain";
import { AudioManager } from "../audio-mixer/audio/AudioManager";
import { loadAudioMixerStore } from "../audio-mixer/audio/audioMixerStore";
import type { AudioObjectConfig, AudioObjectListConfig } from "../audio-mixer/audio/types";
import styles from "../shared/DomainTool.module.scss";

const playbackModes = [
  { id: "loop", label: "Loop" },
  { id: "oneShot", label: "Uma vez" },
  { id: "randomInterval", label: "Aleatorio" },
  { id: "trigger", label: "Trigger" },
] as const satisfies Array<{ id: AudioCompositionPlaybackMode; label: string }>;

type SourceOption = {
  value: string;
  kind: AudioCompositionTrackSourceKind;
  id: string;
  label: string;
};

function createAudioComposition(): AudioCompositionConfig {
  return {
    id: createEntityId("audio-composition"),
    name: "Nova composicao",
    description: "",
    tracks: [],
  };
}

function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

function sourceValue(kind: AudioCompositionTrackSourceKind, id: string): string {
  return `${kind}:${id}`;
}

function parseSourceValue(
  value: string
): Pick<AudioCompositionTrackConfig, "sourceKind" | "sourceId"> {
  const [kind, ...idParts] = value.split(":");

  return {
    sourceKind: kind === "audioObjectList" ? "audioObjectList" : "audioObject",
    sourceId: idParts.join(":"),
  };
}

export function AudioCompositionTool() {
  const audioManager = new AudioManager();
  const initialStore = emptyAudioCompositionStore();
  const [compositions, setCompositions] = createSignal<AudioCompositionConfig[]>(
    initialStore.audioCompositions
  );
  const [audioObjects, setAudioObjects] = createSignal<AudioObjectConfig[]>([]);
  const [audioLists, setAudioLists] = createSignal<AudioObjectListConfig[]>([]);
  const [selectedId, setSelectedId] = createSignal<string>();
  const [isStoreLoaded, setIsStoreLoaded] = createSignal(false);
  const [storeError, setStoreError] = createSignal<string>();
  const [audioError, setAudioError] = createSignal<string>();
  const [previewedTrackId, setPreviewedTrackId] = createSignal<string>();

  const selectedComposition = createMemo(() =>
    compositions().find((composition) => composition.id === selectedId())
  );
  const sourceOptions = createMemo<SourceOption[]>(() => [
    ...audioObjects().map((audioObject) => ({
      value: sourceValue("audioObject", audioObject.id),
      kind: "audioObject" as const,
      id: audioObject.id,
      label: `Objeto: ${audioObject.name}`,
    })),
    ...audioLists().map((audioList) => ({
      value: sourceValue("audioObjectList", audioList.id),
      kind: "audioObjectList" as const,
      id: audioList.id,
      label: `Lista: ${audioList.name}`,
    })),
  ]);

  createEffect(() => {
    const currentId = selectedId();
    const currentCompositions = compositions();

    if (currentId && currentCompositions.some((composition) => composition.id === currentId)) {
      return;
    }

    setSelectedId(currentCompositions[0]?.id);
  });

  createEffect(() => {
    if (!isStoreLoaded()) {
      return;
    }

    void saveAudioCompositionStore({
      schemaVersion: AUDIO_COMPOSITION_STORE_SCHEMA_VERSION,
      audioCompositions: compositions(),
    }).catch((error: unknown) =>
      setStoreError(
        error instanceof Error ? error.message : "Nao foi possivel salvar composicoes de audio."
      )
    );
  });

  onMount(() => {
    void Promise.all([loadAudioCompositionStore(), loadAudioMixerStore()])
      .then(([compositionStore, mixerStore]) => {
        setCompositions(compositionStore.audioCompositions);
        setAudioObjects(mixerStore.audioObjects);
        setAudioLists(mixerStore.audioObjectLists);
        setStoreError(undefined);
        setIsStoreLoaded(true);
      })
      .catch((error: unknown) =>
        setStoreError(
          error instanceof Error ? error.message : "Nao foi possivel carregar composicoes."
        )
      );
  });

  onCleanup(() => {
    audioManager.stopPreview();
  });

  const addComposition = () => {
    const composition = createAudioComposition();

    setCompositions((current) => [...current, composition]);
    setSelectedId(composition.id);
  };

  const updateComposition = (updatedComposition: AudioCompositionConfig) => {
    setCompositions((current) =>
      current.map((composition) =>
        composition.id === updatedComposition.id ? updatedComposition : composition
      )
    );
  };

  const removeComposition = (compositionId: string) => {
    setCompositions((current) => current.filter((composition) => composition.id !== compositionId));
  };

  const addTrack = (composition: AudioCompositionConfig) => {
    const source = sourceOptions()[0];

    if (!source) {
      return;
    }

    updateComposition({
      ...composition,
      tracks: [
        ...composition.tracks,
        {
          id: createEntityId("audio-composition-track"),
          sourceKind: source.kind,
          sourceId: source.id,
          volume: 1,
          playbackMode: "loop",
          fadeInMs: null,
          fadeOutMs: null,
          randomMinSeconds: null,
          randomMaxSeconds: null,
          triggerLabel: null,
          enabled: true,
        },
      ],
    });
  };

  const updateTrack = (
    composition: AudioCompositionConfig,
    updatedTrack: AudioCompositionTrackConfig
  ) => {
    updateComposition({
      ...composition,
      tracks: composition.tracks.map((track) =>
        track.id === updatedTrack.id ? updatedTrack : track
      ),
    });
  };

  const removeTrack = (composition: AudioCompositionConfig, trackId: string) => {
    if (previewedTrackId() === trackId) {
      audioManager.stopPreview();
      setPreviewedTrackId(undefined);
    }

    updateComposition({
      ...composition,
      tracks: composition.tracks.filter((track) => track.id !== trackId),
    });
  };

  const resolveTrackAudioObject = (track: AudioCompositionTrackConfig) => {
    if (track.sourceKind === "audioObject") {
      return audioObjects().find((audioObject) => audioObject.id === track.sourceId);
    }

    const audioList = audioLists().find((item) => item.id === track.sourceId);
    const candidates =
      audioList?.audioObjectIds
        .map((audioObjectId) =>
          audioObjects().find((audioObject) => audioObject.id === audioObjectId)
        )
        .filter((audioObject): audioObject is AudioObjectConfig => Boolean(audioObject)) ?? [];

    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const getTrackLabel = (track: AudioCompositionTrackConfig): string => {
    if (track.sourceKind === "audioObject") {
      return (
        audioObjects().find((audioObject) => audioObject.id === track.sourceId)?.name ??
        "Objeto ausente"
      );
    }

    return (
      audioLists().find((audioList) => audioList.id === track.sourceId)?.name ?? "Lista ausente"
    );
  };

  const toggleTrackPreview = async (track: AudioCompositionTrackConfig) => {
    setAudioError(undefined);

    if (previewedTrackId() === track.id) {
      audioManager.stopPreview();
      setPreviewedTrackId(undefined);
      return;
    }

    const audioObject = resolveTrackAudioObject(track);

    if (!audioObject) {
      setAudioError("A faixa aponta para uma referencia de audio ausente.");
      return;
    }

    try {
      await audioManager.init();
      await audioManager.previewAudioObject(audioObject, {
        volume: audioObject.defaultVolume * clampVolume(track.volume),
        onEnded: () => setPreviewedTrackId(undefined),
      });
      setPreviewedTrackId(track.id);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "Nao foi possivel testar a faixa.");
      setPreviewedTrackId(undefined);
    }
  };

  return (
    <EntityWorkspace
      title="Composicoes"
      eyebrow="Audio de cena"
      addLabel="+ Composicao"
      items={compositions()}
      selectedId={selectedId()}
      emptyMessage="Crie composicoes para transformar objetos e listas de audio em comportamento de cena."
      detailFallback="Selecione ou crie uma composicao."
      getMeta={(composition) => `${composition.tracks.length} faixas`}
      onAdd={addComposition}
      onSelect={setSelectedId}
    >
      <Show when={selectedComposition()}>
        {(composition) => (
          <div class={styles.panel}>
            <Show when={storeError()}>{(error) => <p class={styles.error}>{error()}</p>}</Show>
            <Show when={audioError()}>{(error) => <p class={styles.error}>{error()}</p>}</Show>

            <section class={styles.section}>
              <div class={styles.sectionHeader}>
                <div>
                  <h2>{composition().name}</h2>
                  <p>Referencia objetos/listas do mixer sem copiar configuracoes de arquivo.</p>
                </div>
                <button type="button" onClick={() => removeComposition(composition().id)}>
                  Remover
                </button>
              </div>

              <div class={styles.fields}>
                <label class={styles.field}>
                  <span>Nome</span>
                  <input
                    value={composition().name}
                    onInput={(event) =>
                      updateComposition({ ...composition(), name: event.currentTarget.value })
                    }
                  />
                </label>
                <label class={styles.field}>
                  <span>Descricao</span>
                  <input
                    value={composition().description}
                    onInput={(event) =>
                      updateComposition({
                        ...composition(),
                        description: event.currentTarget.value,
                      })
                    }
                  />
                </label>
              </div>
            </section>

            <section class={styles.section}>
              <div class={styles.sectionHeader}>
                <div>
                  <h3>Faixas</h3>
                  <p>Use listas para sorteio e objetos quando a faixa deve ser fixa.</p>
                </div>
                <button
                  type="button"
                  disabled={sourceOptions().length === 0}
                  onClick={() => addTrack(composition())}
                >
                  + Faixa
                </button>
              </div>

              <Show
                when={composition().tracks.length > 0}
                fallback={<p class={styles.status}>Nenhuma faixa nesta composicao.</p>}
              >
                <div class={styles.rowList}>
                  <For each={composition().tracks}>
                    {(track) => (
                      <div class={styles.row}>
                        <div class={styles.rowHeader}>
                          <div>
                            <strong>{track.triggerLabel || getTrackLabel(track)}</strong>
                            <small>{track.sourceKind === "audioObject" ? "Objeto" : "Lista"}</small>
                          </div>
                          <div class={styles.actions}>
                            <button type="button" onClick={() => void toggleTrackPreview(track)}>
                              {previewedTrackId() === track.id ? "Parar" : "Testar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeTrack(composition(), track.id)}
                            >
                              Remover
                            </button>
                          </div>
                        </div>

                        <div class={styles.fields}>
                          <label class={styles.field}>
                            <span>Fonte</span>
                            <select
                              value={sourceValue(track.sourceKind, track.sourceId)}
                              onChange={(event) =>
                                updateTrack(composition(), {
                                  ...track,
                                  ...parseSourceValue(event.currentTarget.value),
                                })
                              }
                            >
                              <For each={sourceOptions()}>
                                {(source) => <option value={source.value}>{source.label}</option>}
                              </For>
                            </select>
                          </label>

                          <label class={styles.field}>
                            <span>Modo</span>
                            <select
                              value={track.playbackMode}
                              onChange={(event) =>
                                updateTrack(composition(), {
                                  ...track,
                                  playbackMode: event.currentTarget
                                    .value as AudioCompositionPlaybackMode,
                                })
                              }
                            >
                              <For each={playbackModes}>
                                {(mode) => <option value={mode.id}>{mode.label}</option>}
                              </For>
                            </select>
                          </label>

                          <label class={styles.field}>
                            <span>Volume relativo</span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={track.volume}
                              onInput={(event) =>
                                updateTrack(composition(), {
                                  ...track,
                                  volume: clampVolume(Number(event.currentTarget.value)),
                                })
                              }
                            />
                          </label>

                          <label class={styles.field}>
                            <span>Rotulo do trigger</span>
                            <input
                              value={track.triggerLabel ?? ""}
                              placeholder="Porta abre"
                              onInput={(event) =>
                                updateTrack(composition(), {
                                  ...track,
                                  triggerLabel: event.currentTarget.value || null,
                                })
                              }
                            />
                          </label>

                          <label class={styles.field}>
                            <span>Ativa</span>
                            <select
                              value={track.enabled ? "yes" : "no"}
                              onChange={(event) =>
                                updateTrack(composition(), {
                                  ...track,
                                  enabled: event.currentTarget.value === "yes",
                                })
                              }
                            >
                              <option value="yes">Sim</option>
                              <option value="no">Nao</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </section>
          </div>
        )}
      </Show>
    </EntityWorkspace>
  );
}
