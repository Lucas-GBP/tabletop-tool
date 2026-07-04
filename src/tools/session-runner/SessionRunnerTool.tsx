import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { EntityWorkspace } from "../../components/entity-workspace/EntityWorkspace";
import {
  emptyAudioCompositionStore,
  emptyInitiativeStore,
  emptySceneStore,
  emptySessionStore,
  loadAudioCompositionStore,
  loadInitiativeStore,
  loadSceneStore,
  loadSessionStore,
} from "../../domain/domainStores";
import type {
  AudioCompositionConfig,
  AudioCompositionTrackConfig,
  InitiativeEncounterConfig,
  SceneConfig,
  SessionConfig,
} from "../../domain";
import { AudioManager } from "../audio-mixer/audio/AudioManager";
import { loadAudioMixerStore } from "../audio-mixer/audio/audioMixerStore";
import type { AudioObjectConfig, AudioObjectListConfig } from "../audio-mixer/audio/types";
import styles from "../shared/DomainTool.module.scss";

function getById<TItem extends { id: string }>(
  items: TItem[],
  itemId?: string | null
): TItem | undefined {
  return itemId ? items.find((item) => item.id === itemId) : undefined;
}

export function SessionRunnerTool() {
  const audioManager = new AudioManager();
  const [sessions, setSessions] = createSignal<SessionConfig[]>(emptySessionStore().sessions);
  const [scenes, setScenes] = createSignal<SceneConfig[]>(emptySceneStore().scenes);
  const [compositions, setCompositions] = createSignal<AudioCompositionConfig[]>(
    emptyAudioCompositionStore().audioCompositions
  );
  const [encounters, setEncounters] = createSignal<InitiativeEncounterConfig[]>(
    emptyInitiativeStore().encounters
  );
  const [audioObjects, setAudioObjects] = createSignal<AudioObjectConfig[]>([]);
  const [audioLists, setAudioLists] = createSignal<AudioObjectListConfig[]>([]);
  const [selectedSessionId, setSelectedSessionId] = createSignal<string>();
  const [selectedSceneId, setSelectedSceneId] = createSignal<string>();
  const [loadError, setLoadError] = createSignal<string>();
  const [audioError, setAudioError] = createSignal<string>();
  const [previewedTrackId, setPreviewedTrackId] = createSignal<string>();

  const selectedSession = createMemo(() => getById(sessions(), selectedSessionId()));
  const sessionScenes = createMemo(() => {
    const session = selectedSession();

    return (
      session?.sceneIds
        .map((sceneId) => scenes().find((scene) => scene.id === sceneId))
        .filter((scene): scene is SceneConfig => Boolean(scene)) ?? []
    );
  });
  const selectedScene = createMemo(() => getById(scenes(), selectedSceneId()));
  const selectedComposition = createMemo(() =>
    getById(compositions(), selectedScene()?.audioCompositionId)
  );
  const selectedEncounter = createMemo(() =>
    getById(encounters(), selectedScene()?.initiativeEncounterId)
  );

  const loadRunnerData = () => {
    void Promise.all([
      loadSessionStore(),
      loadSceneStore(),
      loadAudioCompositionStore(),
      loadInitiativeStore(),
      loadAudioMixerStore(),
    ])
      .then(([sessionStore, sceneStore, compositionStore, initiativeStore, mixerStore]) => {
        const firstSession = sessionStore.sessions[0];
        const firstSceneId = firstSession?.activeSceneId ?? firstSession?.sceneIds[0];

        setSessions(sessionStore.sessions);
        setScenes(sceneStore.scenes);
        setCompositions(compositionStore.audioCompositions);
        setEncounters(initiativeStore.encounters);
        setAudioObjects(mixerStore.audioObjects);
        setAudioLists(mixerStore.audioObjectLists);
        setSelectedSessionId(firstSession?.id);
        setSelectedSceneId(firstSceneId);
        setLoadError(undefined);
      })
      .catch((error: unknown) =>
        setLoadError(error instanceof Error ? error.message : "Nao foi possivel carregar a mesa.")
      );
  };

  onMount(() => {
    loadRunnerData();
  });

  onCleanup(() => {
    audioManager.stopPreview();
  });

  const selectSession = (sessionId: string) => {
    const session = sessions().find((item) => item.id === sessionId);

    setSelectedSessionId(sessionId);
    setSelectedSceneId(session?.activeSceneId ?? session?.sceneIds[0]);
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
        volume: audioObject.defaultVolume * track.volume,
        onEnded: () => setPreviewedTrackId(undefined),
      });
      setPreviewedTrackId(track.id);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "Nao foi possivel tocar a faixa.");
      setPreviewedTrackId(undefined);
    }
  };

  return (
    <EntityWorkspace
      title="Mesa"
      eyebrow="Execucao"
      addLabel="Atualizar"
      items={sessions()}
      selectedId={selectedSessionId()}
      emptyMessage="Crie uma sessao no planejador para usar o modo de mesa."
      detailFallback="Selecione uma sessao."
      getMeta={(session) => `${session.sceneIds.length} cenas`}
      onAdd={loadRunnerData}
      onSelect={selectSession}
    >
      <div class={styles.panel}>
        <Show when={loadError()}>{(error) => <p class={styles.error}>{error()}</p>}</Show>
        <Show when={audioError()}>{(error) => <p class={styles.error}>{error()}</p>}</Show>

        <Show when={selectedSession()}>
          {(session) => (
            <>
              <section class={styles.section}>
                <div class={styles.sectionHeader}>
                  <div>
                    <h2>{session().name}</h2>
                    <p>{session().description || "Sessao pronta para conduzir."}</p>
                  </div>
                </div>

                <label class={styles.field}>
                  <span>Cena atual</span>
                  <select
                    value={selectedSceneId() ?? ""}
                    onChange={(event) => setSelectedSceneId(event.currentTarget.value)}
                  >
                    <For each={sessionScenes()}>
                      {(scene) => <option value={scene.id}>{scene.name}</option>}
                    </For>
                  </select>
                </label>
              </section>

              <Show
                when={selectedScene()}
                fallback={<p class={styles.status}>A sessao nao tem cenas validas.</p>}
              >
                {(scene) => (
                  <>
                    <section class={styles.section}>
                      <div class={styles.sectionHeader}>
                        <div>
                          <h3>{scene().name}</h3>
                          <p>{scene().description || "Sem descricao."}</p>
                        </div>
                      </div>
                      <p class={styles.status}>{scene().notes || "Sem notas de preparacao."}</p>
                    </section>

                    <section class={styles.section}>
                      <div class={styles.sectionHeader}>
                        <div>
                          <h3>Audio</h3>
                          <p>{selectedComposition()?.name ?? "Nenhuma composicao vinculada."}</p>
                        </div>
                      </div>

                      <Show
                        when={selectedComposition()?.tracks.length}
                        fallback={<p class={styles.status}>Sem faixas de audio nesta cena.</p>}
                      >
                        <div class={styles.rowList}>
                          <For
                            each={
                              selectedComposition()?.tracks.filter((track) => track.enabled) ?? []
                            }
                          >
                            {(track) => (
                              <div class={styles.row}>
                                <div class={styles.rowHeader}>
                                  <div>
                                    <strong>{track.triggerLabel || getTrackLabel(track)}</strong>
                                    <small>{track.playbackMode}</small>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void toggleTrackPreview(track)}
                                  >
                                    {previewedTrackId() === track.id ? "Parar" : "Tocar"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </section>

                    <section class={styles.section}>
                      <div class={styles.sectionHeader}>
                        <div>
                          <h3>Iniciativa</h3>
                          <p>{selectedEncounter()?.name ?? "Nenhum encontro vinculado."}</p>
                        </div>
                      </div>

                      <Show
                        when={selectedEncounter()?.participants.length}
                        fallback={<p class={styles.status}>Sem participantes nesta cena.</p>}
                      >
                        <div class={styles.rowList}>
                          <For each={selectedEncounter()?.participants ?? []}>
                            {(participant) => (
                              <div class={styles.row}>
                                <div class={styles.rowHeader}>
                                  <div>
                                    <strong>{participant.name}</strong>
                                    <small>
                                      {participant.role} / init {participant.initiativeModifier}
                                    </small>
                                  </div>
                                  <small>
                                    CA {participant.armorClass ?? "-"} / PV{" "}
                                    {participant.hitPoints ?? "-"}
                                  </small>
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </section>
                  </>
                )}
              </Show>
            </>
          )}
        </Show>
      </div>
    </EntityWorkspace>
  );
}
