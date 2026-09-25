import { useState } from "react";
import type { SceneDto, SessionDto } from "@/api";
import type { SceneId } from "@/types";
import { formValue } from "@/lib";
import {
  Button,
  EditableText,
  EmptyState,
  Panel,
  SectionHeading,
} from "./primitives";
import { ActionMenu } from "./ActionMenu";
import { ReorderControls } from "./ReorderControls";
import { SceneSelect } from "./SceneSelect";
import styles from "./SessionEditor.module.scss";

interface SessionEditorProps {
  session: SessionDto;
  scenes: SceneDto[];
  sceneNames: ReadonlyMap<SceneId, string>;
  disabled: boolean;
  canDelete: boolean;
  onManageScenes: () => void;
  onOpenScene: (sceneId: SceneId) => void;
  onStart: () => void;
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onAssociate: (sceneId: SceneId) => Promise<boolean>;
  onMoveScene: (sceneId: SceneId, position: number) => Promise<boolean>;
  onRemoveScene: (sceneId: SceneId) => Promise<boolean>;
}

export function SessionEditor({
  session,
  scenes,
  sceneNames,
  disabled,
  canDelete,
  onManageScenes,
  onOpenScene,
  onStart,
  onRename,
  onDelete,
  onAssociate,
  onMoveScene,
  onRemoveScene,
}: SessionEditorProps) {
  const [draggedSceneId, setDraggedSceneId] = useState<SceneId | null>(null);
  const availableScenes = scenes.filter(
    (scene) => !session.scenes.some((link) => link.sceneId === scene.id),
  );

  return (
    <Panel as="section" className={styles.panel}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Sessão {session.position + 1}</span>
          <EditableText
            as="h2"
            value={session.name}
            label={`nome da sessão ${session.name}`}
            disabled={disabled}
            onSave={onRename}
          />
        </div>
        <div className={styles.actions}>
          <Button
            tone="primary"
            aria-label={`Iniciar sessão ${session.name}`}
            disabled={disabled}
            onClick={onStart}
          >
            Iniciar sessão
          </Button>
          <ActionMenu label={`Mais ações para ${session.name}`}>
            <Button
              tone="danger"
              disabled={disabled || !canDelete}
              title={
                canDelete
                  ? undefined
                  : "A campanha precisa manter ao menos uma sessão."
              }
              aria-label={`Excluir sessão ${session.name}`}
              onClick={() => {
                if (
                  !window.confirm(
                    `Excluir a sessão ${session.name}? As cenas reutilizáveis serão mantidas.`,
                  )
                ) {
                  return;
                }
                void onDelete();
              }}
            >
              Excluir sessão
            </Button>
          </ActionMenu>
        </div>
      </header>

      <section className={styles.sequence}>
        <SectionHeading
          eyebrow="Ordem de execução"
          title="Sequência de cenas"
        />
        <ol className={styles.list} aria-label="Sequência de cenas">
          {session.scenes.map((link, index) => {
            const sceneName = sceneNames.get(link.sceneId);
            return (
              <li
                key={link.id}
                draggable={!disabled && Boolean(sceneName)}
                onDragStart={() => setDraggedSceneId(link.sceneId)}
                onDragEnd={() => setDraggedSceneId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedSceneId && draggedSceneId !== link.sceneId) {
                    void onMoveScene(draggedSceneId, link.position);
                  }
                  setDraggedSceneId(null);
                }}
              >
                <span className={styles.position}>{link.position + 1}</span>
                <button
                  type="button"
                  className={styles.scene}
                  disabled={!sceneName}
                  onClick={() => sceneName && onOpenScene(link.sceneId)}
                >
                  {sceneName ?? "Cena indisponível"}
                </button>
                {sceneName ? (
                  <>
                    <ReorderControls
                      label={`cena ${sceneName}`}
                      canMoveUp={index > 0}
                      canMoveDown={index < session.scenes.length - 1}
                      disabled={disabled}
                      onMoveUp={() =>
                        void onMoveScene(link.sceneId, link.position - 1)
                      }
                      onMoveDown={() =>
                        void onMoveScene(link.sceneId, link.position + 1)
                      }
                    />
                    <ActionMenu label={`Mais ações para ${sceneName}`}>
                      <Button onClick={() => onOpenScene(link.sceneId)}>
                        Editar cena
                      </Button>
                      <Button
                        tone="danger"
                        disabled={disabled || session.scenes.length === 1}
                        aria-label={`Remover cena ${sceneName} da sessão ${session.name}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remover ${sceneName} desta sessão? A cena reutilizável será mantida.`,
                            )
                          ) {
                            void onRemoveScene(link.sceneId);
                          }
                        }}
                      >
                        Remover da sessão
                      </Button>
                    </ActionMenu>
                  </>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.add}>
        {availableScenes.length > 0 ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const sceneId = formValue(new FormData(form), "associatedScene");
              const scene = availableScenes.find(
                (candidate) => candidate.id === sceneId,
              );
              if (!scene) return;
              void onAssociate(scene.id).then(
                (associated) => associated && form.reset(),
              );
            }}
          >
            <SceneSelect
              name="associatedScene"
              label={`Cena para adicionar à sessão ${session.name}`}
              scenes={availableScenes}
              placeholder="Escolha uma cena"
            />
            <Button type="submit" disabled={disabled}>
              Adicionar cena
            </Button>
          </form>
        ) : (
          <EmptyState title="Todas as cenas já estão nesta sessão">
            <Button onClick={onManageScenes}>Abrir biblioteca de cenas</Button>
          </EmptyState>
        )}
      </section>
    </Panel>
  );
}
