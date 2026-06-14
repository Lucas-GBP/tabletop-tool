import { Index, Show } from "solid-js";
import type { AudioObjectConfig, AvailableAudioFile } from "../audio/types";
import { AudioWaveform } from "./AudioWaveform";
import styles from "./AudioObjectPanel.module.scss";

type AudioObjectPanelProps = {
  objects: AudioObjectConfig[];
  availableAudioFiles: AvailableAudioFile[];
  onAdd: () => void;
  onPickFile: (objectId: string) => void;
  onChange: (object: AudioObjectConfig) => void;
  previewingObjectId?: string;
  previewTime?: number;
  onPreview: (object: AudioObjectConfig) => void;
  onRemove: (objectId: string) => void;
};

function getFileName(files: AvailableAudioFile[], filePath: string): string {
  return files.find((file) => file.path === filePath)?.name ?? filePath;
}

function parseSeconds(value: string): number {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;
}

function parseOptionalSeconds(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : null;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function AudioObjectPanel(props: AudioObjectPanelProps) {
  return (
    <section class={styles.root} aria-label="Objetos de audio">
      <div class={styles.header}>
        <div>
          <h2>Mixer de audio</h2>
          <span>{props.objects.length} reutilizaveis</span>
        </div>
        <button type="button" class={styles.action} onClick={() => props.onAdd()}>
          + Objeto
        </button>
      </div>

      <Show
        when={props.objects.length > 0}
        fallback={
          <p class={styles.empty}>
            Crie objetos a partir dos arquivos para configurar nomes, descricoes, trechos e loops
            reutilizaveis.
          </p>
        }
      >
        <div class={styles.list}>
          <Index each={props.objects}>
            {(audioObject) => {
              const fileName = () => getFileName(props.availableAudioFiles, audioObject().filePath);
              const updateObject = <K extends keyof AudioObjectConfig>(
                key: K,
                value: AudioObjectConfig[K]
              ) => {
                props.onChange({ ...audioObject(), [key]: value });
              };
              const isPreviewing = () => props.previewingObjectId === audioObject().id;

              return (
                <article class={styles.card}>
                  <div class={styles.heading}>
                    <div>
                      <h3>{audioObject().name}</h3>
                      <span>{fileName()}</span>
                    </div>
                    <div class={styles.actions}>
                      <button
                        type="button"
                        classList={{ [styles.previewActive]: isPreviewing() }}
                        aria-pressed={isPreviewing()}
                        onClick={() => props.onPreview(audioObject())}
                      >
                        {isPreviewing() ? "Parar" : "Ouvir"}
                      </button>
                      <button type="button" onClick={() => props.onRemove(audioObject().id)}>
                        Remover
                      </button>
                    </div>
                  </div>

                  <div class={styles.grid}>
                    <label>
                      <span>Nome</span>
                      <input
                        value={audioObject().name}
                        onInput={(event) => updateObject("name", event.currentTarget.value)}
                      />
                    </label>

                    <div class={styles.filePicker}>
                      <span>Arquivo</span>
                      <button type="button" onClick={() => props.onPickFile(audioObject().id)}>
                        {fileName()}
                      </button>
                    </div>

                    <label class={styles.volume}>
                      <span>Volume base</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={audioObject().defaultVolume}
                        onInput={(event) =>
                          updateObject("defaultVolume", Number(event.currentTarget.value))
                        }
                      />
                      <strong>{Math.round(audioObject().defaultVolume * 100)}%</strong>
                    </label>

                    <label>
                      <span>Tags</span>
                      <input
                        value={audioObject().tags.join(", ")}
                        placeholder="chuva, casa, tensao"
                        onInput={(event) =>
                          updateObject("tags", parseTags(event.currentTarget.value))
                        }
                      />
                    </label>

                    <label class={styles.description}>
                      <span>Descricao</span>
                      <textarea
                        rows="2"
                        value={audioObject().description}
                        onInput={(event) => updateObject("description", event.currentTarget.value)}
                      />
                    </label>
                  </div>

                  <AudioWaveform
                    filePath={audioObject().filePath}
                    playableRegion={audioObject().playableRegion}
                    loopRegion={audioObject().loopRegion}
                    playheadSeconds={isPreviewing() ? props.previewTime : undefined}
                  />

                  <div class={styles.regions}>
                    <fieldset>
                      <legend>Trecho tocavel</legend>
                      <label>
                        <span>Inicio</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={audioObject().playableRegion.startSeconds}
                          onInput={(event) =>
                            updateObject("playableRegion", {
                              ...audioObject().playableRegion,
                              startSeconds: parseSeconds(event.currentTarget.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Fim</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={audioObject().playableRegion.endSeconds ?? ""}
                          placeholder="Ate o fim"
                          onInput={(event) =>
                            updateObject("playableRegion", {
                              ...audioObject().playableRegion,
                              endSeconds: parseOptionalSeconds(event.currentTarget.value),
                            })
                          }
                        />
                      </label>
                    </fieldset>

                    <fieldset>
                      <legend>Loop interno</legend>
                      <label class={styles.check}>
                        <input
                          type="checkbox"
                          checked={audioObject().loopRegion.enabled}
                          onChange={(event) =>
                            updateObject("loopRegion", {
                              ...audioObject().loopRegion,
                              enabled: event.currentTarget.checked,
                            })
                          }
                        />
                        <span>Ativo</span>
                      </label>
                      <label>
                        <span>Inicio</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={audioObject().loopRegion.startSeconds}
                          onInput={(event) =>
                            updateObject("loopRegion", {
                              ...audioObject().loopRegion,
                              startSeconds: parseSeconds(event.currentTarget.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Fim</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={audioObject().loopRegion.endSeconds ?? ""}
                          placeholder="Ate o fim"
                          onInput={(event) =>
                            updateObject("loopRegion", {
                              ...audioObject().loopRegion,
                              endSeconds: parseOptionalSeconds(event.currentTarget.value),
                            })
                          }
                        />
                      </label>
                    </fieldset>

                    <fieldset>
                      <legend>Fade do objeto</legend>
                      <label>
                        <span>Fade in</span>
                        <input
                          type="number"
                          min="0"
                          value={audioObject().fadeInMs}
                          onInput={(event) =>
                            updateObject("fadeInMs", Number(event.currentTarget.value))
                          }
                        />
                      </label>
                      <label>
                        <span>Fade out</span>
                        <input
                          type="number"
                          min="0"
                          value={audioObject().fadeOutMs}
                          onInput={(event) =>
                            updateObject("fadeOutMs", Number(event.currentTarget.value))
                          }
                        />
                      </label>
                    </fieldset>
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
