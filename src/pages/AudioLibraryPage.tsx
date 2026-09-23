import { useState } from "react";
import type { AudioAssetDto, AudioObjectInputDto } from "@/api";
import {
  AssetWarning,
  AudioAssetPicker,
  AudioCompositionEditor,
  AudioListEditor,
  Button,
  EmptyState,
  Input,
  Panel,
  SectionHeading,
  WorkspaceFeedback,
} from "@/components";
import { useAudioWorkspace } from "@/hooks";
import {
  audioCompositionMissing,
  audioListMissing,
  audioObjectMissing,
} from "@/lib";
import styles from "./AudioLibraryPage.module.scss";

interface AudioLibraryPageProps {
  onBack: () => void;
  onOpenSettings: () => void;
  onEditObject: (audioObjectId: string) => void;
}

export function AudioLibraryPage({
  onBack,
  onOpenSettings,
  onEditObject,
}: AudioLibraryPageProps) {
  const audio = useAudioWorkspace();
  const { library } = audio;
  const [selectingAsset, setSelectingAsset] = useState(false);

  if (audio.loading) {
    return (
      <main className={styles.loading}>Abrindo a biblioteca de áudio…</main>
    );
  }

  async function createObject(asset: AudioAssetDto) {
    const id = await audio.createAudioObject(defaultAudioObject(asset));
    if (!id) return;
    setSelectingAsset(false);
    onEditObject(id);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Button onClick={onBack}>← Início</Button>
        <div>
          <p>Ferramenta global</p>
          <h1>Audio Mixer</h1>
          <span>Prepare objetos, listas e composições reutilizáveis.</span>
        </div>
      </header>
      <WorkspaceFeedback error={audio.error} notice={audio.notice} />

      <div className={styles.grid}>
        <Panel as="section" className={styles.panel}>
          <SectionHeading eyebrow="Assets" title="Arquivos de áudio" />
          <div className={styles["source-controls"]}>
            <Button onClick={onOpenSettings}>Configurar pasta</Button>
            <Button
              disabled={audio.busy || !library.assetDirectory}
              onClick={() => void audio.rescanFiles()}
            >
              Atualizar
            </Button>
          </div>
          {library.assetDirectory ? (
            <small className={styles.directory}>{library.assetDirectory}</small>
          ) : null}
          {!library.assetDirectory ? (
            <EmptyState title="Pasta de assets não configurada">
              Escolha a raiz dos arquivos nas configurações gerais.
            </EmptyState>
          ) : library.files.length === 0 ? (
            <EmptyState title="Nenhum áudio encontrado">
              Formatos aceitos: WAV, MP3, OGG, FLAC, M4A, AAC e WebM.
            </EmptyState>
          ) : (
            <p className={styles.summary}>
              {library.files.length} arquivos de áudio disponíveis
            </p>
          )}
        </Panel>

        <Panel as="section" className={styles.panel}>
          <SectionHeading eyebrow="Cues" title="Objetos de áudio" />
          <Button
            disabled={audio.busy || !library.assetDirectory}
            onClick={() => setSelectingAsset(true)}
          >
            Criar objeto
          </Button>
          {library.objects.length === 0 ? (
            <EmptyState title="Nenhum objeto configurado">
              Um objeto define região, loop, fades e volume de uma fonte.
            </EmptyState>
          ) : (
            <ul className={styles.resources}>
              {library.objects.map((object) => (
                <li key={object.id}>
                  <div className={styles["definition-with-warning"]}>
                    <strong>{object.name}</strong>
                    <small>
                      {audioAssetLabel(library.files, object.assetPath)}
                    </small>
                    {audioObjectMissing(library, object) ? (
                      <AssetWarning>Arquivo não encontrado</AssetWarning>
                    ) : null}
                  </div>
                  <div className={styles.actions}>
                    <Button onClick={() => onEditObject(object.id)}>
                      Editar
                    </Button>
                    <Button
                      tone="danger"
                      disabled={audio.busy}
                      onClick={() => {
                        if (!window.confirm(`Excluir ${object.name}?`)) return;
                        void audio.deleteAudioObject(object.id);
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel as="section" className={styles.panel}>
        <SectionHeading eyebrow="Variação" title="Listas de áudio" />
        <div className={styles.editors}>
          {library.lists.map((list) => (
            <div key={list.id} className={styles["definition-with-warning"]}>
              {audioListMissing(library, list) ? (
                <AssetWarning>Contém arquivo não encontrado</AssetWarning>
              ) : null}
              <AudioListEditor
                list={list}
                objects={library.objects}
                disabled={audio.busy}
                onSave={(input) => audio.updateAudioList(list.id, input)}
                onDelete={() => audio.deleteAudioList(list.id)}
              />
            </div>
          ))}
          <AudioListEditor
            objects={library.objects}
            disabled={audio.busy}
            onSave={audio.createAudioList}
          />
        </div>
      </Panel>

      <Panel as="section" className={styles.panel}>
        <SectionHeading eyebrow="Ambiência" title="Composições" />
        <div className={styles.editors}>
          {library.compositions.map((composition) => (
            <div
              key={composition.id}
              className={styles["definition-with-warning"]}
            >
              {audioCompositionMissing(library, composition) ? (
                <AssetWarning>Contém arquivo não encontrado</AssetWarning>
              ) : null}
              <AudioCompositionEditor
                composition={composition}
                objects={library.objects}
                lists={library.lists}
                disabled={audio.busy}
                onSave={(input) =>
                  audio.updateAudioComposition(composition.id, input)
                }
                onDelete={() => audio.deleteAudioComposition(composition.id)}
              />
            </div>
          ))}
          <AudioCompositionEditor
            objects={library.objects}
            lists={library.lists}
            disabled={audio.busy}
            onSave={audio.createAudioComposition}
          />
        </div>
      </Panel>

      <Panel as="section" className={styles.panel}>
        <SectionHeading eyebrow="Saída" title="Volume geral" />
        <form
          className={styles.volume}
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "masterVolume",
            ) as HTMLInputElement;
            void audio.updateMasterVolume(input.valueAsNumber);
          }}
        >
          <label>
            Master (dB)
            <Input
              name="masterVolume"
              type="number"
              step={0.5}
              defaultValue={library.settings.masterVolumeDb}
              disabled={audio.busy}
            />
          </label>
          <Button type="submit" disabled={audio.busy}>
            Salvar volume
          </Button>
        </form>
      </Panel>

      {selectingAsset ? (
        <AudioAssetPicker
          assets={library.files}
          title="Escolher arquivo para o novo objeto"
          busy={audio.busy}
          onRefresh={() => void audio.rescanFiles()}
          onClose={() => setSelectingAsset(false)}
          onSelect={(asset) => void createObject(asset)}
        />
      ) : null}
    </main>
  );
}

function audioAssetLabel(files: readonly AudioAssetDto[], path: string) {
  return files.find((asset) => asset.relativePath === path)?.name ?? path;
}

function defaultAudioObject(asset: AudioAssetDto): AudioObjectInputDto {
  return {
    name: asset.name,
    assetPath: asset.relativePath,
    volumeDb: 0,
    startTimeUs: 0,
    endTimeUs: asset.durationUs,
    startLoopTimeUs: null,
    endLoopTimeUs: null,
    fadeInDurationUs: 0,
    fadeOutDurationUs: 0,
    loopCrossfadeDurationUs: null,
  };
}
