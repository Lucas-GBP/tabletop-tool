import type { SceneDto, SessionDto } from "../../../shared/api";
import { Button, Card } from "../../../ui";
import { formValue } from "../lib/forms";
import { SceneSelect } from "./SceneSelect";
import styles from "./SessionCard.module.scss";

interface SessionCardProps {
  session: SessionDto;
  scenes: SceneDto[];
  sceneNames: Map<string, string>;
  disabled: boolean;
  onStart: () => void;
  onAssociate: (sceneId: string) => Promise<boolean>;
}

export function SessionCard({
  session,
  scenes,
  sceneNames,
  disabled,
  onStart,
  onAssociate,
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
          <h4>{session.name}</h4>
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
          {session.scenes.map((link) => (
            <li key={link.id}>
              <span className={styles.position}>{link.position + 1}</span>
              <span>{sceneNames.get(link.sceneId) ?? "Cena indisponível"}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={styles["add-scene"]}
        aria-labelledby={`add-scene-${session.id}`}
      >
        <div>
          <h5 id={`add-scene-${session.id}`}>Adicionar cena</h5>
          <p>
            Escolha outra cena reutilizável da Biblioteca para continuar a
            sequência desta sessão.
          </p>
        </div>
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
              label={`Cena da biblioteca para adicionar à sessão ${session.name}`}
              scenes={availableScenes}
              placeholder="Escolha uma cena da Biblioteca"
            />
            <Button type="submit" disabled={disabled}>
              Adicionar cena
            </Button>
          </form>
        ) : (
          <p className={styles["all-associated"]}>
            Todas as cenas da Biblioteca já estão nesta sessão.{" "}
            <a href="#scene-library">Crie outra cena na Biblioteca</a> para
            adicioná-la aqui.
          </p>
        )}
      </section>
    </Card>
  );
}
