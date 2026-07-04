import { For, Show, createEffect, createMemo, createSignal, onMount } from "solid-js";
import { EntityWorkspace } from "../../components/entity-workspace/EntityWorkspace";
import {
  SESSION_STORE_SCHEMA_VERSION,
  createEntityId,
  emptySceneStore,
  emptySessionStore,
  loadSceneStore,
  loadSessionStore,
  saveSessionStore,
} from "../../domain/domainStores";
import type { SceneConfig, SessionConfig } from "../../domain";
import styles from "../shared/DomainTool.module.scss";

function createSession(): SessionConfig {
  return {
    id: createEntityId("session"),
    name: "Nova sessao",
    description: "",
    notes: "",
    sceneIds: [],
    activeSceneId: null,
  };
}

function getSceneName(scenes: SceneConfig[], sceneId: string): string {
  return scenes.find((scene) => scene.id === sceneId)?.name ?? "Cena ausente";
}

function moveItem(values: string[], index: number, direction: -1 | 1): string[] {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= values.length) {
    return values;
  }

  const nextValues = [...values];
  const [item] = nextValues.splice(index, 1);
  nextValues.splice(nextIndex, 0, item);

  return nextValues;
}

export function SessionPlannerTool() {
  const [sessions, setSessions] = createSignal<SessionConfig[]>(emptySessionStore().sessions);
  const [scenes, setScenes] = createSignal<SceneConfig[]>(emptySceneStore().scenes);
  const [selectedId, setSelectedId] = createSignal<string>();
  const [sceneToAdd, setSceneToAdd] = createSignal("");
  const [isStoreLoaded, setIsStoreLoaded] = createSignal(false);
  const [storeError, setStoreError] = createSignal<string>();

  const selectedSession = createMemo(() =>
    sessions().find((session) => session.id === selectedId())
  );
  const availableScenes = createMemo(() => {
    const session = selectedSession();

    if (!session) {
      return scenes();
    }

    return scenes().filter((scene) => !session.sceneIds.includes(scene.id));
  });

  createEffect(() => {
    const currentId = selectedId();
    const currentSessions = sessions();

    if (currentId && currentSessions.some((session) => session.id === currentId)) {
      return;
    }

    setSelectedId(currentSessions[0]?.id);
  });

  createEffect(() => {
    if (!isStoreLoaded()) {
      return;
    }

    void saveSessionStore({
      schemaVersion: SESSION_STORE_SCHEMA_VERSION,
      sessions: sessions(),
    }).catch((error: unknown) =>
      setStoreError(error instanceof Error ? error.message : "Nao foi possivel salvar sessoes.")
    );
  });

  onMount(() => {
    void Promise.all([loadSessionStore(), loadSceneStore()])
      .then(([sessionStore, sceneStore]) => {
        setSessions(sessionStore.sessions);
        setScenes(sceneStore.scenes);
        setStoreError(undefined);
        setIsStoreLoaded(true);
      })
      .catch((error: unknown) =>
        setStoreError(error instanceof Error ? error.message : "Nao foi possivel carregar sessoes.")
      );
  });

  const addSession = () => {
    const session = createSession();

    setSessions((current) => [...current, session]);
    setSelectedId(session.id);
  };

  const updateSession = (updatedSession: SessionConfig) => {
    setSessions((current) =>
      current.map((session) => (session.id === updatedSession.id ? updatedSession : session))
    );
  };

  const removeSession = (sessionId: string) => {
    setSessions((current) => current.filter((session) => session.id !== sessionId));
  };

  const addSceneToSession = (session: SessionConfig) => {
    const sceneId = sceneToAdd();

    if (!sceneId || session.sceneIds.includes(sceneId)) {
      return;
    }

    updateSession({
      ...session,
      sceneIds: [...session.sceneIds, sceneId],
      activeSceneId: session.activeSceneId ?? sceneId,
    });
    setSceneToAdd("");
  };

  return (
    <EntityWorkspace
      title="Sessoes"
      eyebrow="Planejamento"
      addLabel="+ Sessao"
      items={sessions()}
      selectedId={selectedId()}
      emptyMessage="Crie uma sessao para organizar cenas em ordem de uso."
      detailFallback="Selecione ou crie uma sessao."
      getMeta={(session) => `${session.sceneIds.length} cenas`}
      onAdd={addSession}
      onSelect={setSelectedId}
    >
      <Show when={selectedSession()}>
        {(session) => (
          <div class={styles.panel}>
            <Show when={storeError()}>{(error) => <p class={styles.error}>{error()}</p>}</Show>

            <section class={styles.section}>
              <div class={styles.sectionHeader}>
                <div>
                  <h2>{session().name}</h2>
                  <p>Sessoes organizam cenas preparadas; a cena continua sendo editada separada.</p>
                </div>
                <button type="button" onClick={() => removeSession(session().id)}>
                  Remover
                </button>
              </div>

              <div class={styles.fields}>
                <label class={styles.field}>
                  <span>Nome</span>
                  <input
                    value={session().name}
                    onInput={(event) =>
                      updateSession({ ...session(), name: event.currentTarget.value })
                    }
                  />
                </label>
                <label class={styles.field}>
                  <span>Descricao</span>
                  <input
                    value={session().description}
                    onInput={(event) =>
                      updateSession({ ...session(), description: event.currentTarget.value })
                    }
                  />
                </label>
                <label class={`${styles.field} ${styles.full}`}>
                  <span>Notas</span>
                  <textarea
                    value={session().notes}
                    onInput={(event) =>
                      updateSession({ ...session(), notes: event.currentTarget.value })
                    }
                  />
                </label>
              </div>
            </section>

            <section class={styles.section}>
              <div class={styles.sectionHeader}>
                <div>
                  <h3>Cenas da sessao</h3>
                  <p>Adicione cenas preparadas e escolha qual esta ativa.</p>
                </div>
              </div>

              <div class={styles.inline}>
                <label class={`${styles.field} ${styles.inlineField}`}>
                  <span>Adicionar cena</span>
                  <select
                    value={sceneToAdd()}
                    onChange={(event) => setSceneToAdd(event.currentTarget.value)}
                  >
                    <option value="">Selecionar</option>
                    <For each={availableScenes()}>
                      {(scene) => <option value={scene.id}>{scene.name}</option>}
                    </For>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!sceneToAdd()}
                  onClick={() => addSceneToSession(session())}
                >
                  Adicionar
                </button>
              </div>

              <Show
                when={session().sceneIds.length > 0}
                fallback={<p class={styles.status}>Nenhuma cena nesta sessao.</p>}
              >
                <div class={styles.rowList}>
                  <For each={session().sceneIds}>
                    {(sceneId, index) => (
                      <div class={styles.row}>
                        <div class={styles.rowHeader}>
                          <div>
                            <strong>{getSceneName(scenes(), sceneId)}</strong>
                            <small>
                              {session().activeSceneId === sceneId ? "Cena ativa" : "Preparada"}
                            </small>
                          </div>
                          <div class={styles.actions}>
                            <button
                              type="button"
                              onClick={() =>
                                updateSession({ ...session(), activeSceneId: sceneId })
                              }
                            >
                              Ativar
                            </button>
                            <button
                              type="button"
                              disabled={index() === 0}
                              onClick={() =>
                                updateSession({
                                  ...session(),
                                  sceneIds: moveItem(session().sceneIds, index(), -1),
                                })
                              }
                            >
                              Subir
                            </button>
                            <button
                              type="button"
                              disabled={index() === session().sceneIds.length - 1}
                              onClick={() =>
                                updateSession({
                                  ...session(),
                                  sceneIds: moveItem(session().sceneIds, index(), 1),
                                })
                              }
                            >
                              Descer
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSession({
                                  ...session(),
                                  sceneIds: session().sceneIds.filter((item) => item !== sceneId),
                                  activeSceneId:
                                    session().activeSceneId === sceneId
                                      ? null
                                      : session().activeSceneId,
                                })
                              }
                            >
                              Remover
                            </button>
                          </div>
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
