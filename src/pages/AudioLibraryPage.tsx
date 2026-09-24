import { useState } from "react";
import type {
  AudioAssetDto,
  AudioLibraryDto,
  AudioObjectInputDto,
} from "@/api";
import {
  ActionMenu,
  AssetWarning,
  AudioAssetPicker,
  AudioCompositionEditor,
  AudioListEditor,
  AudioObjectEditor,
  Button,
  EmptyState,
  Input,
  LoadFailure,
  Panel,
  SectionHeading,
  WorkspaceFeedback,
} from "@/components";
import { useAudioWorkspace } from "@/hooks";
import {
  audioCompositionMissing,
  audioListMissing,
  audioObjectMissing,
  classNames,
} from "@/lib";
import styles from "./AudioLibraryPage.module.scss";

interface AudioLibraryPageProps {
  onOpenSettings: () => void;
}

type ResourceSection = "objects" | "lists" | "compositions";

const sections: readonly { id: ResourceSection; label: string }[] = [
  { id: "objects", label: "Objetos" },
  { id: "lists", label: "Listas" },
  { id: "compositions", label: "Composições" },
];

const sectionCopy = {
  objects: {
    eyebrow: "Sons",
    title: "Objetos de áudio",
    create: "Criar objeto",
    emptyTitle: "Nenhum objeto configurado",
    emptyDescription:
      "Escolha um arquivo e defina região, loop, fades e volume.",
  },
  lists: {
    eyebrow: "Variação",
    title: "Listas de áudio",
    create: "Criar lista",
    emptyTitle: "Nenhuma lista configurada",
    emptyDescription:
      "Agrupe objetos para reproduzi-los em sequência ou aleatoriamente.",
  },
  compositions: {
    eyebrow: "Ambiência",
    title: "Composições",
    create: "Criar composição",
    emptyTitle: "Nenhuma composição configurada",
    emptyDescription: "Combine objetos e listas em camadas de ambiência.",
  },
} as const;

export function AudioLibraryPage({ onOpenSettings }: AudioLibraryPageProps) {
  const audio = useAudioWorkspace();
  const { library } = audio;
  const [section, setSection] = useState<ResourceSection>("objects");
  const [query, setQuery] = useState("");
  const [selectingAsset, setSelectingAsset] = useState(false);
  const [editingObject, setEditingObject] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editingComposition, setEditingComposition] = useState<string | null>(
    null,
  );

  if (audio.loading) {
    return (
      <main className={styles.loading}>Abrindo a biblioteca de áudio…</main>
    );
  }

  if (!audio.loaded) {
    return (
      <main className={styles.shell}>
        <LoadFailure
          message={audio.loadError}
          onRetry={() => void audio.reload()}
        />
      </main>
    );
  }

  const copy = sectionCopy[section];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const allSummaries = resourceSummaries(section, library);
  const summaries = allSummaries.filter(
    (item) =>
      !normalizedQuery ||
      item.name.toLocaleLowerCase().includes(normalizedQuery),
  );
  const activeObject = editingObject
    ? library.objects.find((item) => item.id === editingObject)
    : undefined;
  const activeList =
    editingList && editingList !== "new"
      ? library.lists.find((item) => item.id === editingList)
      : undefined;
  const activeComposition =
    editingComposition && editingComposition !== "new"
      ? library.compositions.find((item) => item.id === editingComposition)
      : undefined;

  function selectSection(next: ResourceSection) {
    setSection(next);
    setQuery("");
    setEditingObject(null);
    setEditingList(null);
    setEditingComposition(null);
  }

  async function createObject(asset: AudioAssetDto) {
    const id = await audio.createAudioObject(defaultAudioObject(asset));
    if (!id) return;
    setSelectingAsset(false);
    setEditingObject(id);
  }

  async function closeEditorWhen(operation: Promise<boolean>) {
    const succeeded = await operation;
    if (succeeded) {
      setEditingList(null);
      setEditingComposition(null);
    }
    return succeeded;
  }

  function createDefinition() {
    if (section === "objects") setSelectingAsset(true);
    else if (section === "lists") setEditingList("new");
    else setEditingComposition("new");
  }

  function editDefinition(id: string) {
    if (section === "objects") setEditingObject(id);
    else if (section === "lists") setEditingList(id);
    else setEditingComposition(id);
  }

  const editor = activeObject ? (
    <AudioObjectEditor
      key={activeObject.id}
      object={activeObject}
      files={library.files}
      busy={audio.busy}
      error={audio.error}
      onClose={() => setEditingObject(null)}
      onSave={async (input) => {
        if (await audio.updateAudioObject(activeObject.id, input)) {
          setEditingObject(null);
        }
      }}
      onRefresh={() => void audio.rescanFiles()}
    />
  ) : section === "lists" && editingList ? (
    <AudioListEditor
      key={editingList}
      list={activeList}
      objects={library.objects}
      disabled={audio.busy}
      onCancel={() => setEditingList(null)}
      onSave={(input) =>
        closeEditorWhen(
          activeList
            ? audio.updateAudioList(activeList.id, input)
            : audio.createAudioList(input),
        )
      }
      onDelete={
        activeList
          ? () => closeEditorWhen(audio.deleteAudioList(activeList.id))
          : undefined
      }
    />
  ) : section === "compositions" && editingComposition ? (
    <AudioCompositionEditor
      key={editingComposition}
      composition={activeComposition}
      objects={library.objects}
      lists={library.lists}
      disabled={audio.busy}
      onCancel={() => setEditingComposition(null)}
      onSave={(input) =>
        closeEditorWhen(
          activeComposition
            ? audio.updateAudioComposition(activeComposition.id, input)
            : audio.createAudioComposition(input),
        )
      }
      onDelete={
        activeComposition
          ? () =>
              closeEditorWhen(
                audio.deleteAudioComposition(activeComposition.id),
              )
          : undefined
      }
    />
  ) : null;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p>Ferramenta global</p>
          <h1>Audio Mixer</h1>
          <span>Prepare o áudio reutilizável das suas cenas.</span>
        </div>
        <AudioOperations audio={audio} onOpenSettings={onOpenSettings} />
      </header>

      <WorkspaceFeedback error={audio.error} />

      <div className={styles.workspace}>
        <nav className={styles.types} aria-label="Tipos de recurso de áudio">
          <SectionHeading eyebrow="Biblioteca" title="Recursos" />
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={classNames(
                styles.type,
                section === item.id && styles.active,
              )}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => selectSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <Panel as="section" className={styles.library}>
          <div className={styles["section-header"]}>
            <SectionHeading eyebrow={copy.eyebrow} title={copy.title} />
            <Button
              tone="primary"
              disabled={
                section === "objects" && (audio.busy || !library.assetDirectory)
              }
              onClick={createDefinition}
            >
              {copy.create}
            </Button>
          </div>
          <Input
            type="search"
            aria-label={`Buscar em ${copy.title}`}
            placeholder="Buscar por nome"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          {allSummaries.length === 0 ? (
            <EmptyState title={copy.emptyTitle}>
              {copy.emptyDescription}
            </EmptyState>
          ) : summaries.length === 0 ? (
            <EmptyState title="Nenhum resultado">
              Tente buscar por outro nome.
            </EmptyState>
          ) : (
            <ul className={styles.resources}>
              {summaries.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.resource}
                    aria-current={
                      item.id === editingObject ||
                      item.id === editingList ||
                      item.id === editingComposition
                        ? "true"
                        : undefined
                    }
                    onClick={() => editDefinition(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                    {item.missing ? (
                      <AssetWarning>
                        {section === "objects"
                          ? "Arquivo não encontrado"
                          : "Contém arquivo não encontrado"}
                      </AssetWarning>
                    ) : null}
                  </button>
                  {section === "objects" ? (
                    <ActionMenu label={`Mais ações para ${item.name}`}>
                      <Button
                        tone="danger"
                        disabled={audio.busy}
                        onClick={() => {
                          if (window.confirm(`Excluir ${item.name}?`)) {
                            void audio
                              .deleteAudioObject(item.id)
                              .then((deleted) => {
                                if (deleted && editingObject === item.id) {
                                  setEditingObject(null);
                                }
                              });
                          }
                        }}
                      >
                        Excluir objeto
                      </Button>
                    </ActionMenu>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <section className={styles.editor} aria-label="Editor do recurso">
          {editor ?? (
            <Panel className={styles.placeholder}>
              <EmptyState title="Selecione um recurso">
                Escolha um item da biblioteca ou crie um novo para editar.
              </EmptyState>
            </Panel>
          )}
        </section>
      </div>

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

function AudioOperations({
  audio,
  onOpenSettings,
}: {
  audio: ReturnType<typeof useAudioWorkspace>;
  onOpenSettings: () => void;
}) {
  return (
    <aside className={styles.operations} aria-label="Operações do Audio Mixer">
      <div>
        <strong>{audio.library.files.length}</strong>
        <span> arquivos disponíveis</span>
      </div>
      <Button
        size="compact"
        disabled={audio.busy || !audio.library.assetDirectory}
        onClick={() => void audio.rescanFiles()}
      >
        Atualizar
      </Button>
      <Button size="compact" tone="subtle" onClick={onOpenSettings}>
        Pasta de assets
      </Button>
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
          Volume padrão
          <Input
            name="masterVolume"
            type="number"
            min={-60}
            max={6}
            step={0.5}
            defaultValue={audio.library.settings.masterVolumeDb}
            disabled={audio.busy}
          />
        </label>
        <Button size="compact" type="submit" disabled={audio.busy}>
          Salvar
        </Button>
      </form>
    </aside>
  );
}

function resourceSummaries(section: ResourceSection, library: AudioLibraryDto) {
  if (section === "objects") {
    return library.objects.map((item) => ({
      id: item.id,
      name: item.name,
      detail:
        library.files.find((file) => file.relativePath === item.assetPath)
          ?.name ?? item.assetPath,
      missing: audioObjectMissing(library, item),
    }));
  }
  if (section === "lists") {
    return library.lists.map((item) => ({
      id: item.id,
      name: item.name,
      detail: `${item.entries.length} objetos`,
      missing: audioListMissing(library, item),
    }));
  }
  return library.compositions.map((item) => ({
    id: item.id,
    name: item.name,
    detail: `${item.layers.length} camadas`,
    missing: audioCompositionMissing(library, item),
  }));
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
