import { Index, Show } from "solid-js";
import type { AudioObjectConfig, AvailableAudioFile } from "../audio/types";
import { AudioObjectCard } from "./AudioObjectCard";
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
  onSeekPreview: (seconds: number) => void;
  onRemove: (objectId: string) => void;
};

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
              const isPreviewing = () => props.previewingObjectId === audioObject().id;

              return (
                <AudioObjectCard
                  audioObject={audioObject()}
                  availableAudioFiles={props.availableAudioFiles}
                  isPreviewing={isPreviewing()}
                  previewTime={props.previewTime}
                  onPickFile={props.onPickFile}
                  onChange={props.onChange}
                  onPreview={props.onPreview}
                  onSeekPreview={props.onSeekPreview}
                  onRemove={props.onRemove}
                />
              );
            }}
          </Index>
        </div>
      </Show>
    </section>
  );
}
