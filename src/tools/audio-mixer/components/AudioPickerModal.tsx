import { For, Show, createMemo, createSignal } from "solid-js";
import type { AvailableAudioFile } from "../audio/types";
import styles from "./AudioPickerModal.module.scss";

export type AudioPickerTarget =
  | { kind: "add-object" }
  | { kind: "replace-object"; objectId: string };

type AudioPickerModalProps = {
  files: AvailableAudioFile[];
  target: AudioPickerTarget;
  isLoading: boolean;
  error?: string;
  onRefresh: () => void;
  onClose: () => void;
  onSelect: (file: AvailableAudioFile) => void;
};

function getTitle(target: AudioPickerTarget): string {
  switch (target.kind) {
    case "add-object":
      return "Criar objeto de audio";
    case "replace-object":
      return "Trocar arquivo do objeto";
  }
}

export function AudioPickerModal(props: AudioPickerModalProps) {
  const [query, setQuery] = createSignal("");
  const [category, setCategory] = createSignal("all");

  const categories = createMemo(() => {
    const values = [...new Set(props.files.map((file) => file.category))].sort();

    return ["all", ...values];
  });
  const filteredFiles = createMemo(() => {
    const normalizedQuery = query().trim().toLowerCase();

    return props.files.filter((file) => {
      const matchesCategory = category() === "all" || file.category === category();
      const matchesQuery =
        !normalizedQuery ||
        file.name.toLowerCase().includes(normalizedQuery) ||
        file.path.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  });

  const selectFile = (file: AvailableAudioFile) => {
    props.onSelect(file);
  };

  return (
    <div class={styles.root} role="dialog" aria-modal="true">
      <div class={styles.backdrop} onClick={() => props.onClose()} />

      <section class={styles.dialog}>
        <header class={styles.header}>
          <div>
            <h2>{getTitle(props.target)}</h2>
            <span>{props.files.length} audios encontrados</span>
          </div>

          <div class={styles.headerActions}>
            <button type="button" onClick={() => props.onRefresh()}>
              Atualizar
            </button>
            <button type="button" onClick={() => props.onClose()}>
              Fechar
            </button>
          </div>
        </header>

        <div class={styles.filters}>
          <input
            value={query()}
            placeholder="Buscar por nome ou caminho"
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
          <select value={category()} onChange={(event) => setCategory(event.currentTarget.value)}>
            <For each={categories()}>
              {(item) => <option value={item}>{item === "all" ? "Todos" : item}</option>}
            </For>
          </select>
        </div>

        <Show when={props.error}>{(error) => <p class={styles.status}>{error()}</p>}</Show>

        <Show when={props.isLoading}>
          <p class={styles.status}>Carregando audios...</p>
        </Show>

        <div class={styles.list}>
          <For each={filteredFiles()}>
            {(file) => (
              <button type="button" class={styles.item} onClick={() => selectFile(file)}>
                <span>{file.name}</span>
                <small>
                  {file.category} / {file.extension} / {file.path}
                </small>
              </button>
            )}
          </For>

          <Show when={!props.isLoading && filteredFiles().length === 0}>
            <p class={styles.status}>Nenhum audio encontrado.</p>
          </Show>
        </div>
      </section>
    </div>
  );
}
