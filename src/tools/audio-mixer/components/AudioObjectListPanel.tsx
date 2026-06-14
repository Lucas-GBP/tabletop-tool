import { For, Index, Show } from "solid-js";
import type { AudioObjectConfig, AudioObjectListConfig } from "../audio/types";
import styles from "./AudioObjectListPanel.module.scss";

type AudioObjectListPanelProps = {
  lists: AudioObjectListConfig[];
  objects: AudioObjectConfig[];
  onAdd: () => void;
  onChange: (list: AudioObjectListConfig) => void;
  onRemove: (listId: string) => void;
};

function getObjectName(objects: AudioObjectConfig[], objectId: string): string {
  return objects.find((object) => object.id === objectId)?.name ?? "Objeto nao encontrado";
}

export function AudioObjectListPanel(props: AudioObjectListPanelProps) {
  return (
    <section class={styles.root} aria-label="Listas de objetos de audio">
      <div class={styles.header}>
        <div>
          <h2>Listas de objetos</h2>
          <span>{props.lists.length} listas</span>
        </div>
        <button type="button" class={styles.action} onClick={() => props.onAdd()}>
          + Lista
        </button>
      </div>

      <Show
        when={props.lists.length > 0}
        fallback={
          <p class={styles.empty}>Crie listas para sortear um objeto de audio a cada reproducao.</p>
        }
      >
        <div class={styles.grid}>
          <Index each={props.lists}>
            {(audioList) => {
              const updateList = <K extends keyof AudioObjectListConfig>(
                key: K,
                value: AudioObjectListConfig[K]
              ) => {
                props.onChange({ ...audioList(), [key]: value });
              };
              const addObject = (objectId: string) => {
                if (!objectId || audioList().audioObjectIds.includes(objectId)) {
                  return;
                }

                updateList("audioObjectIds", [...audioList().audioObjectIds, objectId]);
              };
              const removeObject = (objectId: string) => {
                updateList(
                  "audioObjectIds",
                  audioList().audioObjectIds.filter((item) => item !== objectId)
                );
              };
              const availableObjects = () =>
                props.objects.filter(
                  (audioObject) => !audioList().audioObjectIds.includes(audioObject.id)
                );

              return (
                <article class={styles.card}>
                  <div class={styles.heading}>
                    <div>
                      <h3>{audioList().name}</h3>
                      <span>{audioList().audioObjectIds.length} objetos</span>
                    </div>
                    <button type="button" onClick={() => props.onRemove(audioList().id)}>
                      Remover
                    </button>
                  </div>

                  <div class={styles.fields}>
                    <label>
                      <span>Nome</span>
                      <input
                        value={audioList().name}
                        onInput={(event) => updateList("name", event.currentTarget.value)}
                      />
                    </label>

                    <label>
                      <span>Descricao</span>
                      <input
                        value={audioList().description}
                        onInput={(event) => updateList("description", event.currentTarget.value)}
                      />
                    </label>

                    <label>
                      <span>Adicionar objeto</span>
                      <select
                        value=""
                        onChange={(event) => {
                          addObject(event.currentTarget.value);
                          event.currentTarget.value = "";
                        }}
                      >
                        <option value="">Selecionar</option>
                        <For each={availableObjects()}>
                          {(audioObject) => (
                            <option value={audioObject.id}>{audioObject.name}</option>
                          )}
                        </For>
                      </select>
                    </label>
                  </div>

                  <div class={styles.members}>
                    <For each={audioList().audioObjectIds}>
                      {(objectId) => (
                        <button type="button" onClick={() => removeObject(objectId)}>
                          {getObjectName(props.objects, objectId)}
                        </button>
                      )}
                    </For>
                    <Show when={audioList().audioObjectIds.length === 0}>
                      <span>Nenhum objeto na lista.</span>
                    </Show>
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
