import type { AudioLibraryDto } from "@/api";
import type { SessionAudioRuntimeController } from "@/hooks/useSessionAudioRuntime";
import {
  audioCompositionMissing,
  audioListMissing,
  audioObjectMissing,
} from "@/lib";
import { AssetWarning } from "./AssetWarning";
import { Button, EmptyState } from "./primitives";
import styles from "./SceneAudioRuntimePanel.module.scss";

interface SceneAudioRuntimePanelProps {
  audio: SessionAudioRuntimeController;
}

export function SceneAudioRuntimePanel({ audio }: SceneAudioRuntimePanelProps) {
  if (audio.loading) return <p className={styles.status}>Carregando áudio…</p>;
  if (!audio.snapshot || !audio.library) {
    return (
      <EmptyState title="Áudio indisponível">
        A sessão continua funcionando sem o Audio Mixer.
      </EmptyState>
    );
  }
  const library = audio.library;
  const snapshot = audio.snapshot;

  const cueName = (kind: "audioObject" | "audioList", id: string) =>
    kind === "audioObject"
      ? library.objects.find((item) => item.id === id)?.name
      : library.lists.find((item) => item.id === id)?.name;
  const hasConfiguration =
    snapshot.cues.length > 0 || snapshot.compositions.length > 0;

  if (!hasConfiguration) {
    return (
      <EmptyState title="Sem áudio nesta cena">
        Configure o Audio Mixer durante a preparação da cena.
      </EmptyState>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.master}>
        {!snapshot.started && (
          <Button onClick={() => void audio.activate()}>Ativar áudio</Button>
        )}
        <Button onClick={audio.pauseAll}>Pausar tudo</Button>
        <Button onClick={audio.resumeAll}>Continuar tudo</Button>
        <Button onClick={audio.stopAll}>Parar tudo</Button>
      </div>

      {snapshot.cues.length > 0 && (
        <section>
          <h4>Cues</h4>
          <div className={styles.cues}>
            {snapshot.cues.map((cue) => (
              <div key={`${cue.kind}:${cue.id}`} className={styles.cue}>
                <Button onClick={() => void audio.playCue(cue)}>
                  ▶ {cueName(cue.kind, cue.id) ?? "Áudio indisponível"}
                </Button>
                {cueMissing(library, cue.kind, cue.id) ? (
                  <AssetWarning>Arquivo não encontrado</AssetWarning>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {snapshot.compositions.map((composition) => (
        <section key={composition.id} className={styles.composition}>
          <h4>{composition.name}</h4>
          {compositionMissing(library, composition.id) ? (
            <AssetWarning>Contém arquivo não encontrado</AssetWarning>
          ) : null}
          {composition.layers.map((layer) => (
            <div key={layer.id} className={styles.layer}>
              <div>
                <strong>{layer.name}</strong>
                <small>
                  {layer.enabled ? "Tocando" : "Desligada"}
                  {layer.runtimeOverride !== null
                    ? " · ajuste temporário"
                    : " · padrão do nível"}
                </small>
              </div>
              <div className={styles.actions}>
                <Button
                  aria-pressed={layer.runtimeOverride === null}
                  onClick={() => audio.setLayerOverride(layer.id, null)}
                >
                  Padrão
                </Button>
                <Button
                  aria-pressed={layer.runtimeOverride === true}
                  onClick={() => audio.setLayerOverride(layer.id, true)}
                >
                  Ligar
                </Button>
                <Button
                  aria-pressed={layer.runtimeOverride === false}
                  onClick={() => audio.setLayerOverride(layer.id, false)}
                >
                  Desligar
                </Button>
              </div>
            </div>
          ))}
        </section>
      ))}

      {audio.playbacks.length > 0 && (
        <section>
          <h4>Reproduções</h4>
          <ul className={styles.playbacks}>
            {audio.playbacks.map((playback) => (
              <li key={playback.id}>
                <div>
                  <strong>{playback.name}</strong>
                  <small>
                    {(playback.positionUs / 1_000_000).toFixed(1)} s ·{" "}
                    {playback.state}
                  </small>
                </div>
                <div className={styles.actions}>
                  {playback.state === "paused" ? (
                    <Button onClick={() => audio.resume(playback.id)}>
                      Continuar
                    </Button>
                  ) : (
                    <Button onClick={() => audio.pause(playback.id)}>
                      Pausar
                    </Button>
                  )}
                  <Button onClick={() => audio.finish(playback.id)}>
                    Finalizar
                  </Button>
                  <Button onClick={() => audio.stop(playback.id)}>Parar</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function cueMissing(
  library: AudioLibraryDto,
  kind: "audioObject" | "audioList",
  id: string,
) {
  if (kind === "audioObject") {
    const object = library.objects.find((candidate) => candidate.id === id);
    return !object || audioObjectMissing(library, object);
  }
  const list = library.lists.find((candidate) => candidate.id === id);
  return !list || audioListMissing(library, list);
}

function compositionMissing(library: AudioLibraryDto, id: string) {
  const composition = library.compositions.find(
    (candidate) => candidate.id === id,
  );
  return !composition || audioCompositionMissing(library, composition);
}
