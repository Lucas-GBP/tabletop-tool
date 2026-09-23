import { useState } from "react";
import type {
  AudioAssetDto,
  AudioLibraryDto,
  AudioObjectInputDto,
} from "@/api";
import {
  AssetWarning,
  AudioAssetPicker,
  AudioCompositionEditor,
  AudioListEditor,
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
} from "@/lib";
import styles from "./AudioLibraryPage.module.scss";

interface AudioLibraryPageProps {
  onBack: () => void;
  onOpenSettings: () => void;
  onEditObject: (audioObjectId: string) => void;
}

type LibrarySection = "objects" | "lists" | "compositions" | "settings";
type DefinitionSection = Exclude<LibrarySection, "settings">;

const sections: readonly { id: LibrarySection; label: string }[] = [
  { id: "objects", label: "Objetos" },
  { id: "lists", label: "Listas" },
  { id: "compositions", label: "Composições" },
  { id: "settings", label: "Arquivos e volume" },
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

export function AudioLibraryPage({
  onBack,
  onOpenSettings,
  onEditObject,
}: AudioLibraryPageProps) {
  const audio = useAudioWorkspace();
  const { library } = audio;
  const [section, setSection] = useState<LibrarySection>("objects");
  const [query, setQuery] = useState("");
  const [selectingAsset, setSelectingAsset] = useState(false);
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

  const definitionSection = section === "settings" ? null : section;
  const copy = definitionSection ? sectionCopy[definitionSection] : null;
  const activeList =
    editingList && editingList !== "new"
      ? library.lists.find((item) => item.id === editingList)
      : undefined;
  const activeComposition =
    editingComposition && editingComposition !== "new"
      ? library.compositions.find((item) => item.id === editingComposition)
      : undefined;
  const editingCurrentSection =
    (section === "lists" && editingList !== null) ||
    (section === "compositions" && editingComposition !== null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const allSummaries = definitionSection
    ? resourceSummaries(definitionSection, library)
    : [];
  const summaries = allSummaries.filter(
    (item) =>
      !normalizedQuery ||
      item.name.toLocaleLowerCase().includes(normalizedQuery),
  );

  async function createObject(asset: AudioAssetDto) {
    const id = await audio.createAudioObject(defaultAudioObject(asset));
    if (!id) return;
    setSelectingAsset(false);
    onEditObject(id);
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
    else if (section === "compositions") setEditingComposition("new");
  }

  function editDefinition(id: string) {
    if (section === "objects") onEditObject(id);
    else if (section === "lists") setEditingList(id);
    else if (section === "compositions") setEditingComposition(id);
  }

  const editor =
    section === "lists" && editingList ? (
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
        <Button tone="subtle" onClick={onBack}>
          ← Início
        </Button>
        <div>
          <p>Ferramenta global</p>
          <h1>Audio Mixer</h1>
          <span>Prepare o áudio reutilizável das suas cenas.</span>
        </div>
      </header>

      <WorkspaceFeedback error={audio.error} />

      <nav className={styles.tabs} aria-label="Seções da biblioteca de áudio">
        {sections.map((item) => (
          <Button
            key={item.id}
            size="compact"
            tone={section === item.id ? "primary" : "subtle"}
            aria-current={section === item.id ? "page" : undefined}
            onClick={() => {
              setSection(item.id);
              setQuery("");
            }}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {definitionSection && copy ? (
        <>
          <Input
            className={styles.search}
            type="search"
            aria-label={`Buscar em ${copy.title}`}
            placeholder="Buscar por nome"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <Panel as="section" className={styles.panel}>
            <div className={styles["section-header"]}>
              <SectionHeading eyebrow={copy.eyebrow} title={copy.title} />
              {!editingCurrentSection ? (
                <Button
                  tone="primary"
                  disabled={
                    section === "objects" &&
                    (audio.busy || !library.assetDirectory)
                  }
                  onClick={createDefinition}
                >
                  {copy.create}
                </Button>
              ) : null}
            </div>

            {editor ??
              (allSummaries.length === 0 ? (
                <EmptyState title={copy.emptyTitle}>
                  {copy.emptyDescription}
                </EmptyState>
              ) : (
                <ul className={styles.resources}>
                  {summaries.map((item) => (
                    <li key={item.id}>
                      <div className={styles["definition-with-warning"]}>
                        <strong>{item.name}</strong>
                        <small>{item.detail}</small>
                        {item.missing ? (
                          <AssetWarning>
                            {section === "objects"
                              ? "Arquivo não encontrado"
                              : "Contém arquivo não encontrado"}
                          </AssetWarning>
                        ) : null}
                      </div>
                      <div className={styles.actions}>
                        <Button
                          size="compact"
                          onClick={() => editDefinition(item.id)}
                        >
                          Editar
                        </Button>
                        {section === "objects" ? (
                          <Button
                            size="compact"
                            tone="danger"
                            disabled={audio.busy}
                            onClick={() => {
                              if (!window.confirm(`Excluir ${item.name}?`))
                                return;
                              void audio.deleteAudioObject(item.id);
                            }}
                          >
                            Excluir
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ))}
          </Panel>
        </>
      ) : (
        <div className={styles.settings}>
          <Panel as="section" className={styles.panel}>
            <SectionHeading eyebrow="Arquivos" title="Pasta de assets" />
            <div className={styles["source-controls"]}>
              <Button tone="primary" onClick={onOpenSettings}>
                Configurar pasta
              </Button>
              <Button
                disabled={audio.busy || !library.assetDirectory}
                onClick={() => void audio.rescanFiles()}
              >
                Atualizar arquivos
              </Button>
            </div>
            {library.assetDirectory ? (
              <>
                <small className={styles.directory}>
                  {library.assetDirectory}
                </small>
                <p className={styles.summary}>
                  {library.files.length} arquivos de áudio disponíveis
                </p>
              </>
            ) : (
              <EmptyState title="Pasta de assets não configurada">
                Escolha a raiz dos arquivos nas configurações gerais.
              </EmptyState>
            )}
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
                Volume (dB)
                <Input
                  name="masterVolume"
                  type="number"
                  min={-60}
                  max={6}
                  step={0.5}
                  defaultValue={library.settings.masterVolumeDb}
                  disabled={audio.busy}
                />
              </label>
              <Button tone="primary" type="submit" disabled={audio.busy}>
                Salvar volume
              </Button>
            </form>
          </Panel>
        </div>
      )}

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

function resourceSummaries(
  section: DefinitionSection,
  library: AudioLibraryDto,
) {
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
