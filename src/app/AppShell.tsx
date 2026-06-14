import { For, createEffect, createSignal } from "solid-js";
import { AudioMixerTool } from "../tools/audio-mixer/AudioMixerTool";
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

        <nav class={styles.toolNav}>
          <button type="button" class={`${styles.toolNavItem} ${styles.toolNavItemActive}`}>
            <span>Mixer de audio</span>
            <small>Ativo</small>
          </button>
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
        <AudioMixerTool />
      </main>
    </div>
  );
}
