import { For, createEffect, createSignal } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { ImplementedToolId } from "../domain";
import { DEFAULT_TOOL_ID, getToolById, tools } from "./tools";
import styles from "./AppShell.module.scss";

type AccentTheme = "violet" | "amber" | "teal";

const themes = [
  { id: "violet", name: "Roxo" },
  { id: "amber", name: "Ambar" },
  { id: "teal", name: "Verde" },
] satisfies Array<{ id: AccentTheme; name: string }>;

function getInitialTheme(): AccentTheme {
  const storedTheme = localStorage.getItem("tabletop-tool.theme");

  if (storedTheme === "amber" || storedTheme === "teal") {
    return storedTheme;
  }

  return "violet";
}

export function AppShell() {
  const [theme, setTheme] = createSignal<AccentTheme>(getInitialTheme());
  const [activeToolId, setActiveToolId] = createSignal<ImplementedToolId>(DEFAULT_TOOL_ID);
  const activeTool = () => getToolById(activeToolId());

  createEffect(() => {
    localStorage.setItem("tabletop-tool.theme", theme());
  });

  return (
    <div class={styles.root} data-theme={theme()}>
      <aside class={styles.sidebar} aria-label="Ferramentas">
        <div class={styles.brand}>
          <span class={styles.brandMark}>TT</span>
          <div>
            <strong>Tabletop Tool</strong>
            <span>Kit de mesa</span>
          </div>
        </div>

        <nav class={styles.toolNav} aria-label="Ferramentas disponiveis">
          <For each={tools}>
            {(tool) => {
              const isActive = () => activeToolId() === tool.id;

              return (
                <button
                  type="button"
                  class={styles.toolNavItem}
                  classList={{ [styles.toolNavItemActive]: isActive() }}
                  aria-pressed={isActive()}
                  title={tool.description}
                  onClick={() => setActiveToolId(tool.id)}
                >
                  <span>{tool.label}</span>
                  <small>{isActive() ? tool.statusLabel : "Abrir"}</small>
                </button>
              );
            }}
          </For>
        </nav>

        <label class={styles.themePicker}>
          <span>Tema</span>
          <select
            value={theme()}
            onChange={(event) => setTheme(event.currentTarget.value as AccentTheme)}
          >
            <For each={themes}>{(item) => <option value={item.id}>{item.name}</option>}</For>
          </select>
        </label>
      </aside>

      <main class={styles.content}>
        <Dynamic component={activeTool().Component} />
      </main>
    </div>
  );
}
