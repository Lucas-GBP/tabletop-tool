import { useState } from "react";
import type { SceneDto, SessionDto } from "@/api";
import { classNames, formValue } from "@/lib";
import { Button, Input, Panel, SectionHeading } from "./primitives";
import { ReorderControls } from "./ReorderControls";
import { SceneSelect } from "./SceneSelect";
import styles from "./SessionList.module.scss";

interface SessionListProps {
  campaignName: string;
  sessions: SessionDto[];
  scenes: SceneDto[];
  selectedSessionId: string;
  disabled: boolean;
  onSelect: (sessionId: string) => void;
  onCreate: (name: string, sceneId: string) => Promise<boolean>;
  onMove: (sessionId: string, position: number) => Promise<boolean>;
}

export function SessionList({
  campaignName,
  sessions,
  scenes,
  selectedSessionId,
  disabled,
  onSelect,
  onCreate,
  onMove,
}: SessionListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  return (
    <Panel as="aside" className={styles.panel}>
      <SectionHeading eyebrow="Planejamento" title="Sessões" />
      <ol className={styles.list} aria-label={`Sessões de ${campaignName}`}>
        {sessions.map((session, index) => (
          <li
            key={session.id}
            className={classNames(
              styles.item,
              session.id === selectedSessionId && styles.selected,
            )}
            draggable={!disabled}
            onDragStart={() => setDraggedId(session.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedId && draggedId !== session.id) {
                void onMove(draggedId, session.position);
              }
              setDraggedId(null);
            }}
          >
            <button
              type="button"
              className={styles.select}
              aria-current={
                session.id === selectedSessionId ? "true" : undefined
              }
              onClick={() => onSelect(session.id)}
            >
              <span>{session.position + 1}</span>
              <span>
                <strong>{session.name}</strong>
                <small>
                  {session.scenes.length === 1
                    ? "1 cena"
                    : `${session.scenes.length} cenas`}
                </small>
              </span>
            </button>
            <ReorderControls
              label={`sessão ${session.name}`}
              canMoveUp={index > 0}
              canMoveDown={index < sessions.length - 1}
              disabled={disabled}
              onMoveUp={() => void onMove(session.id, session.position - 1)}
              onMoveDown={() => void onMove(session.id, session.position + 1)}
            />
          </li>
        ))}
      </ol>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          void onCreate(
            formValue(data, "sessionName"),
            formValue(data, "sessionScene"),
          ).then((created) => created && form.reset());
        }}
      >
        <Input
          name="sessionName"
          aria-label={`Nome da nova sessão de ${campaignName}`}
          placeholder="Nova sessão"
          required
        />
        <SceneSelect
          name="sessionScene"
          label={`Cena inicial da nova sessão de ${campaignName}`}
          scenes={scenes}
          placeholder="Cena inicial"
        />
        <Button tone="primary" type="submit" disabled={disabled}>
          Adicionar sessão
        </Button>
      </form>
    </Panel>
  );
}
