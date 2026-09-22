import type { SceneDto, SessionDto } from "@/api";
import { Button, Card, EditableText } from "./primitives";
import { formValue } from "@/lib";
import { SceneSelect } from "./SceneSelect";
import styles from "./SessionCard.module.scss";

interface SessionCardProps {
  session: SessionDto;
  scenes: SceneDto[];
  sceneNames: Map<string, string>;
  disabled: boolean;
  canDelete: boolean;
  onManageScenes: () => void;
  onOpenScene: (sceneId: string) => void;
  onStart: () => void;
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onAssociate: (sceneId: string) => Promise<boolean>;
  onRemoveScene: (sceneId: string) => Promise<boolean>;
}

export function SessionCard({
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
  onRemoveScene,
}: SessionCardProps) {
  const availableScenes = scenes.filter(
    (scene) => !session.scenes.some((link) => link.sceneId === scene.id),
  );
  const sceneCountLabel =
    session.scenes.length === 1 ? "1 cena" : `${session.scenes.length} cenas`;

  return (
    <Card as="section" className={styles.card}>
      <div className={styles.heading}>
        <div>
          <span>Sessão {session.position + 1}</span>
          <EditableText
            as="h4"
            value={session.name}
            label={`nome da sessão ${session.name}`}
            disabled={disabled}
            onSave={onRename}
          />
        </div>
        <div className={styles.actions}>
          <span>{sceneCountLabel}</span>
          <Button
            className={styles.start}
            aria-label={`Iniciar sessão ${session.name}`}
            disabled={disabled}
            onClick={onStart}
          >
            Iniciar sessão
          </Button>
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
            Excluir
          </Button>
        </div>
      </div>

      <section
        className={styles.scenes}
        aria-labelledby={`session-scenes-${session.id}`}
      >
        <div className={styles["scenes-heading"]}>
          <h5 id={`session-scenes-${session.id}`}>Cenas da sessão</h5>
          <span>Ordem de execução</span>
        </div>
        <ol className={styles["scene-list"]} aria-label="Sequência de cenas">
          {session.scenes.map((link) => {
            const sceneName = sceneNames.get(link.sceneId);
            return (
              <li key={link.id}>
                <span className={styles.position}>{link.position + 1}</span>
                <span className={styles["scene-name"]}>
                  {sceneName ?? "Cena indisponível"}
                </span>
                {sceneName && (
                  <div className={styles["scene-actions"]}>
                    <Button
                      className={styles["edit-scene"]}
                      disabled={disabled}
                      aria-label={`Editar cena ${sceneName}`}
                      onClick={() => onOpenScene(link.sceneId)}
                    >
                      Editar
                    </Button>
                    <Button
                      tone="danger"
                      className={styles["remove-scene"]}
                      disabled={disabled || session.scenes.length === 1}
                      title={
                        session.scenes.length === 1
                          ? "A sessão precisa manter ao menos uma cena."
                          : undefined
                      }
                      aria-label={`Remover cena ${sceneName} da sessão ${session.name}`}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Remover ${sceneName} desta sessão? A cena reutilizável será mantida.`,
                          )
                        ) {
                          return;
                        }
                        void onRemoveScene(link.sceneId);
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section
        className={styles["add-scene"]}
        aria-labelledby={`add-scene-${session.id}`}
      >
        <h5 id={`add-scene-${session.id}`}>Adicionar cena</h5>
        {availableScenes.length > 0 ? (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const sceneId = formValue(new FormData(form), "associatedScene");
              void onAssociate(sceneId).then(
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
          <Button
            className={styles["manage-scenes"]}
            disabled={disabled}
            onClick={onManageScenes}
          >
            Ver cenas
          </Button>
        )}
      </section>
    </Card>
  );
}
