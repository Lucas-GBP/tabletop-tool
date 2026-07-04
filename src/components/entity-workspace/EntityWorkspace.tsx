import { For, Show, createMemo, createSignal, type JSX } from "solid-js";
import styles from "./EntityWorkspace.module.scss";

type EntityWorkspaceProps<TItem extends { id: string; name: string }> = {
  title: string;
  eyebrow: string;
  addLabel: string;
  items: TItem[];
  selectedId?: string;
  emptyMessage: string;
  detailFallback: string;
  getMeta?: (item: TItem) => string;
  onAdd: () => void;
  onSelect: (itemId: string) => void;
  children: JSX.Element;
};

export function EntityWorkspace<TItem extends { id: string; name: string }>(
  props: EntityWorkspaceProps<TItem>
) {
  const [query, setQuery] = createSignal("");
  const filteredItems = createMemo(() => {
    const normalizedQuery = query().trim().toLowerCase();

    if (!normalizedQuery) {
      return props.items;
    }

    return props.items.filter((item) => {
      const meta = props.getMeta?.(item) ?? "";

      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        meta.toLowerCase().includes(normalizedQuery)
      );
    });
  });

  return (
    <section class={styles.root}>
      <aside class={styles.sidebar}>
        <header class={styles.header}>
          <div>
            <span>{props.eyebrow}</span>
            <h1>{props.title}</h1>
          </div>
          <button type="button" onClick={() => props.onAdd()}>
            {props.addLabel}
          </button>
        </header>

        <input
          class={styles.search}
          value={query()}
          placeholder="Buscar"
          onInput={(event) => setQuery(event.currentTarget.value)}
        />

        <Show
          when={props.items.length > 0}
          fallback={<p class={styles.empty}>{props.emptyMessage}</p>}
        >
          <div class={styles.list}>
            <For each={filteredItems()}>
              {(item) => (
                <button
                  type="button"
                  class={styles.listItem}
                  classList={{ [styles.listItemActive]: props.selectedId === item.id }}
                  onClick={() => props.onSelect(item.id)}
                >
                  <span>{item.name}</span>
                  <small>{props.getMeta?.(item) ?? "Sem detalhes"}</small>
                </button>
              )}
            </For>

            <Show when={filteredItems().length === 0}>
              <p class={styles.empty}>Nenhum resultado.</p>
            </Show>
          </div>
        </Show>
      </aside>

      <div class={styles.detail}>
        <Show
          when={props.selectedId}
          fallback={<p class={styles.detailEmpty}>{props.detailFallback}</p>}
        >
          {props.children}
        </Show>
      </div>
    </section>
  );
}
