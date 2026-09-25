import { useState } from "react";
import type {
  SceneAudioConfigurationDto,
  SceneDto,
  SceneLevelAudioConfigurationDto,
} from "@/api";
import type { SceneLevelId } from "@/types";
import { useSceneAudioConfiguration } from "@/hooks/useSceneAudioConfiguration";
import { sceneAudioMissing } from "@/lib";
import { AssetWarning } from "./AssetWarning";
import { LoadFailure } from "./LoadFailure";
import { Button, EmptyState, Panel, SectionHeading } from "./primitives";
import { WorkspaceFeedback } from "./WorkspaceFeedback";
import styles from "./SceneAudioPreparationPanel.module.scss";

interface SceneAudioPreparationPanelProps {
  scene: SceneDto;
  activeLevelId: SceneLevelId;
}

export function SceneAudioPreparationPanel({
  scene,
  activeLevelId,
}: SceneAudioPreparationPanelProps) {
  const audio = useSceneAudioConfiguration(scene);
  const [sceneDraft, setSceneDraft] =
    useState<SceneAudioConfigurationDto | null>(null);
  const [levelDrafts, setLevelDrafts] = useState<
    SceneLevelAudioConfigurationDto[]
  >([]);

  if (audio.loading) {
    return (
      <Panel as="section" className={styles.panel}>
        <SectionHeading eyebrow="Audio Mixer" title="Carregando…" />
      </Panel>
    );
  }

  if (!audio.library || !audio.scene) {
    return (
      <Panel as="section" className={styles.panel}>
        <SectionHeading eyebrow="Audio Mixer" title="Áudio da cena" />
        <LoadFailure
          message={audio.loadError}
          onRetry={() => void audio.reload()}
        />
      </Panel>
    );
  }

  const effectiveSceneDraft = sceneDraft ?? audio.scene;
  const sceneDirty = !sameSceneConfiguration(effectiveSceneDraft, audio.scene);
  const savedCompositions = audio.library.compositions.filter((composition) =>
    audio.scene?.audioCompositionIds.includes(composition.id),
  );
  const layers = savedCompositions.flatMap((composition) =>
    composition.layers.map((layer) => ({
      ...layer,
      compositionName: composition.name,
    })),
  );
  const hasResources =
    audio.library.objects.length > 0 ||
    audio.library.lists.length > 0 ||
    audio.library.compositions.length > 0;
  const activeLevel = scene.levels.find((level) => level.id === activeLevelId);
  const savedLevel = audio.levels.find(
    (configuration) => configuration.sceneLevelId === activeLevelId,
  ) ?? { sceneLevelId: activeLevelId, disabledLayerIds: [] };
  const levelDraft =
    levelDrafts.find(
      (configuration) => configuration.sceneLevelId === activeLevelId,
    ) ?? savedLevel;
  const levelDirty = !sameIds(
    levelDraft.disabledLayerIds,
    savedLevel.disabledLayerIds,
  );

  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading eyebrow="Audio Mixer" title="Áudio da cena" />
      <WorkspaceFeedback error={audio.error} />
      {sceneAudioMissing(audio.library, effectiveSceneDraft) ? (
        <AssetWarning>
          Esta cena usa um arquivo que não foi encontrado
        </AssetWarning>
      ) : null}
      {!hasResources ? (
        <EmptyState title="Biblioteca vazia">
          Crie objetos, listas ou composições no Audio Mixer antes de configurar
          esta cena.
        </EmptyState>
      ) : (
        <>
          <div className={styles.resources}>
            <ResourceGroup
              title="Objetos"
              items={audio.library.objects}
              selected={effectiveSceneDraft.audioObjectIds}
              disabled={audio.busy}
              onChange={(audioObjectIds) =>
                setSceneDraft((current) => ({
                  ...(current ?? effectiveSceneDraft),
                  audioObjectIds,
                }))
              }
            />
            <ResourceGroup
              title="Listas"
              items={audio.library.lists}
              selected={effectiveSceneDraft.audioListIds}
              disabled={audio.busy}
              onChange={(audioListIds) =>
                setSceneDraft((current) => ({
                  ...(current ?? effectiveSceneDraft),
                  audioListIds,
                }))
              }
            />
            <ResourceGroup
              title="Composições"
              items={audio.library.compositions}
              selected={effectiveSceneDraft.audioCompositionIds}
              disabled={audio.busy}
              onChange={(audioCompositionIds) =>
                setSceneDraft((current) => ({
                  ...(current ?? effectiveSceneDraft),
                  audioCompositionIds,
                }))
              }
            />
          </div>
          <Button
            tone="primary"
            disabled={audio.busy || !sceneDirty}
            onClick={() =>
              void audio.saveScene(effectiveSceneDraft).then((saved) => {
                if (saved) setSceneDraft(null);
              })
            }
          >
            {audio.busy ? "Salvando…" : "Salvar recursos da cena"}
          </Button>
          {sceneDirty ? (
            <span className={styles.dirty}>Alterações não salvas</span>
          ) : null}

          {sceneDraft !== null &&
          !sameIds(
            sceneDraft.audioCompositionIds,
            audio.scene.audioCompositionIds,
          ) ? (
            <p className={styles.hint}>
              Salve os recursos para configurar as camadas por nível.
            </p>
          ) : null}

          {layers.length > 0 && activeLevel ? (
            <div className={styles.levels}>
              <h3>Camadas em {activeLevel.name}</h3>
              <p>Desative somente o que não deve tocar neste nível.</p>
              <section className={styles.level}>
                {layers.map((layer) => (
                  <label key={layer.id}>
                    <input
                      type="checkbox"
                      checked={!levelDraft.disabledLayerIds.includes(layer.id)}
                      disabled={audio.busy}
                      onChange={(event) => {
                        const disabledLayerIds = event.currentTarget.checked
                          ? levelDraft.disabledLayerIds.filter(
                              (id) => id !== layer.id,
                            )
                          : [...levelDraft.disabledLayerIds, layer.id];
                        setLevelDrafts((current) => [
                          ...current.filter(
                            (configuration) =>
                              configuration.sceneLevelId !== activeLevel.id,
                          ),
                          {
                            sceneLevelId: activeLevel.id,
                            disabledLayerIds,
                          },
                        ]);
                      }}
                    />
                    <span>
                      {layer.name}
                      <small>{layer.compositionName}</small>
                    </span>
                  </label>
                ))}
                <Button
                  tone="primary"
                  disabled={audio.busy || !levelDirty}
                  onClick={() =>
                    void audio.saveLevel(levelDraft).then((saved) => {
                      if (!saved) return;
                      setLevelDrafts((current) =>
                        current.filter(
                          (configuration) =>
                            configuration.sceneLevelId !== activeLevel.id,
                        ),
                      );
                    })
                  }
                >
                  {audio.busy ? "Salvando…" : "Salvar nível"}
                </Button>
                {levelDirty ? (
                  <span className={styles.dirty}>Alterações não salvas</span>
                ) : null}
              </section>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}

function sameIds<TId extends string>(
  left: readonly TId[],
  right: readonly TId[],
) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function sameSceneConfiguration(
  left: SceneAudioConfigurationDto,
  right: SceneAudioConfigurationDto,
) {
  return (
    sameIds(left.audioObjectIds, right.audioObjectIds) &&
    sameIds(left.audioListIds, right.audioListIds) &&
    sameIds(left.audioCompositionIds, right.audioCompositionIds)
  );
}

function ResourceGroup<TId extends string>({
  title,
  items,
  selected,
  disabled,
  onChange,
}: {
  title: string;
  items: readonly { id: TId; name: string }[];
  selected: readonly TId[];
  disabled: boolean;
  onChange: (ids: TId[]) => void;
}) {
  if (items.length === 0) return null;
  return (
    <fieldset>
      <legend>{title}</legend>
      {items.map((item) => (
        <label key={item.id}>
          <input
            type="checkbox"
            checked={selected.includes(item.id)}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                event.currentTarget.checked
                  ? [...selected, item.id]
                  : selected.filter((id) => id !== item.id),
              )
            }
          />
          {item.name}
        </label>
      ))}
    </fieldset>
  );
}
