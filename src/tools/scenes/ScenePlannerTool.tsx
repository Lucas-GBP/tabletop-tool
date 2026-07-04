import { For, Show, createEffect, createMemo, createSignal, onMount } from "solid-js";
import { EntityWorkspace } from "../../components/entity-workspace/EntityWorkspace";
import {
  SCENE_STORE_SCHEMA_VERSION,
  createEntityId,
  emptyAudioCompositionStore,
  emptyInitiativeStore,
  emptySceneStore,
  loadAudioCompositionStore,
  loadInitiativeStore,
  loadSceneStore,
  saveSceneStore,
} from "../../domain/domainStores";
import type { AudioCompositionConfig, InitiativeEncounterConfig, SceneConfig } from "../../domain";
import styles from "../shared/DomainTool.module.scss";

function createScene(): SceneConfig {
  return {
    id: createEntityId("scene"),
    name: "Nova cena",
    description: "",
    notes: "",
    audioCompositionId: null,
    initiativeEncounterId: null,
  };
}

function getReferenceName<TItem extends { id: string; name: string }>(
  items: TItem[],
  itemId: string | null
): string {
  if (!itemId) {
    return "Sem vinculo";
  }

  return items.find((item) => item.id === itemId)?.name ?? "Referencia ausente";
}

export function ScenePlannerTool() {
  const [scenes, setScenes] = createSignal<SceneConfig[]>(emptySceneStore().scenes);
  const [compositions, setCompositions] = createSignal<AudioCompositionConfig[]>(
    emptyAudioCompositionStore().audioCompositions
  );
  const [encounters, setEncounters] = createSignal<InitiativeEncounterConfig[]>(
    emptyInitiativeStore().encounters
  );
  const [selectedId, setSelectedId] = createSignal<string>();
  const [isStoreLoaded, setIsStoreLoaded] = createSignal(false);
  const [storeError, setStoreError] = createSignal<string>();

  const selectedScene = createMemo(() => scenes().find((scene) => scene.id === selectedId()));

  createEffect(() => {
    const currentId = selectedId();
    const currentScenes = scenes();

    if (currentId && currentScenes.some((scene) => scene.id === currentId)) {
      return;
    }

    setSelectedId(currentScenes[0]?.id);
  });

  createEffect(() => {
    if (!isStoreLoaded()) {
      return;
    }

    void saveSceneStore({
      schemaVersion: SCENE_STORE_SCHEMA_VERSION,
      scenes: scenes(),
    }).catch((error: unknown) =>
      setStoreError(error instanceof Error ? error.message : "Nao foi possivel salvar cenas.")
    );
  });

  onMount(() => {
    void Promise.all([loadSceneStore(), loadAudioCompositionStore(), loadInitiativeStore()])
      .then(([sceneStore, compositionStore, initiativeStore]) => {
        setScenes(sceneStore.scenes);
        setCompositions(compositionStore.audioCompositions);
        setEncounters(initiativeStore.encounters);
        setStoreError(undefined);
        setIsStoreLoaded(true);
      })
      .catch((error: unknown) =>
        setStoreError(error instanceof Error ? error.message : "Nao foi possivel carregar cenas.")
      );
  });

  const addScene = () => {
    const scene = createScene();

    setScenes((current) => [...current, scene]);
    setSelectedId(scene.id);
  };

  const updateScene = (updatedScene: SceneConfig) => {
    setScenes((current) =>
      current.map((scene) => (scene.id === updatedScene.id ? updatedScene : scene))
    );
  };

  const removeScene = (sceneId: string) => {
    setScenes((current) => current.filter((scene) => scene.id !== sceneId));
  };

  return (
    <EntityWorkspace
      title="Cenas"
      eyebrow="Preparacao"
      addLabel="+ Cena"
      items={scenes()}
      selectedId={selectedId()}
      emptyMessage="Crie cenas para juntar preparacao, audio e iniciativa."
      detailFallback="Selecione ou crie uma cena."
      getMeta={(scene) =>
        `${getReferenceName(compositions(), scene.audioCompositionId)} / ${getReferenceName(
          encounters(),
          scene.initiativeEncounterId
        )}`
      }
      onAdd={addScene}
      onSelect={setSelectedId}
    >
      <Show when={selectedScene()}>
        {(scene) => (
          <div class={styles.panel}>
            <Show when={storeError()}>{(error) => <p class={styles.error}>{error()}</p>}</Show>

            <section class={styles.section}>
              <div class={styles.sectionHeader}>
                <div>
                  <h2>{scene().name}</h2>
                  <p>Cenas agregam referencias de tools sem copiar dados internos delas.</p>
                </div>
                <button type="button" onClick={() => removeScene(scene().id)}>
                  Remover
                </button>
              </div>

              <div class={styles.fields}>
                <label class={styles.field}>
                  <span>Nome</span>
                  <input
                    value={scene().name}
                    onInput={(event) =>
                      updateScene({ ...scene(), name: event.currentTarget.value })
                    }
                  />
                </label>
                <label class={styles.field}>
                  <span>Descricao</span>
                  <input
                    value={scene().description}
                    onInput={(event) =>
                      updateScene({ ...scene(), description: event.currentTarget.value })
                    }
                  />
                </label>
                <label class={`${styles.field} ${styles.full}`}>
                  <span>Notas de preparacao</span>
                  <textarea
                    value={scene().notes}
                    onInput={(event) =>
                      updateScene({ ...scene(), notes: event.currentTarget.value })
                    }
                  />
                </label>
              </div>
            </section>

            <section class={styles.section}>
              <div class={styles.sectionHeader}>
                <div>
                  <h3>Vinculos</h3>
                  <p>Escolha composicoes e encontros criados em outras tools.</p>
                </div>
              </div>

              <div class={styles.fields}>
                <label class={styles.field}>
                  <span>Composicao de audio</span>
                  <select
                    value={scene().audioCompositionId ?? ""}
                    onChange={(event) =>
                      updateScene({
                        ...scene(),
                        audioCompositionId: event.currentTarget.value || null,
                      })
                    }
                  >
                    <option value="">Sem composicao</option>
                    <For each={compositions()}>
                      {(composition) => <option value={composition.id}>{composition.name}</option>}
                    </For>
                  </select>
                </label>

                <label class={styles.field}>
                  <span>Encontro de iniciativa</span>
                  <select
                    value={scene().initiativeEncounterId ?? ""}
                    onChange={(event) =>
                      updateScene({
                        ...scene(),
                        initiativeEncounterId: event.currentTarget.value || null,
                      })
                    }
                  >
                    <option value="">Sem encontro</option>
                    <For each={encounters()}>
                      {(encounter) => <option value={encounter.id}>{encounter.name}</option>}
                    </For>
                  </select>
                </label>
              </div>
            </section>
          </div>
        )}
      </Show>
    </EntityWorkspace>
  );
}
