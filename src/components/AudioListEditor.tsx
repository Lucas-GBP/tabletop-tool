import { useState } from "react";
import type { AudioListDto, AudioListInputDto, AudioObjectDto } from "@/api";
import { ActionMenu } from "./ActionMenu";
import { Button, Input, Select } from "./primitives";
import { ReorderControls } from "./ReorderControls";
import styles from "./AudioListEditor.module.scss";

interface AudioListEditorProps {
  list?: AudioListDto;
  objects: readonly AudioObjectDto[];
  disabled: boolean;
  onSave: (input: AudioListInputDto) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onCancel?: () => void;
}

interface EntryDraft {
  audioObjectId: string;
  weight: number;
}

export function AudioListEditor({
  list,
  objects,
  disabled,
  onSave,
  onDelete,
  onCancel,
}: AudioListEditorProps) {
  const [name, setName] = useState(list?.name ?? "");
  const [selectionMode, setSelectionMode] = useState(
    list?.selectionMode ?? "sequential",
  );
  const [entries, setEntries] = useState<EntryDraft[]>(() =>
    list
      ? [...list.entries]
          .sort((left, right) => left.position - right.position)
          .map(({ audioObjectId, weight }) => ({ audioObjectId, weight }))
      : [],
  );
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const available = objects.filter(
    (object) => !entries.some((entry) => entry.audioObjectId === object.id),
  );

  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({ name, selectionMode, entries }).then((saved) => {
          if (saved && !list) {
            setName("");
            setEntries([]);
          }
        });
      }}
    >
      <div className={styles.header}>
        <label>
          Nome
          <Input
            value={name}
            placeholder="Nome da lista"
            disabled={disabled}
            required
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <label>
          Ordem
          <Select
            value={selectionMode}
            disabled={disabled}
            onChange={(event) =>
              setSelectionMode(
                event.currentTarget.value as typeof selectionMode,
              )
            }
          >
            <option value="sequential">Sequencial</option>
            <option value="random">Aleatória</option>
            <option value="weightedRandom">Aleatória por peso</option>
          </Select>
        </label>
      </div>

      <ol className={styles.entries}>
        {entries.map((entry, index) => {
          const object = objects.find(
            (candidate) => candidate.id === entry.audioObjectId,
          );
          return (
            <li
              key={entry.audioObjectId}
              draggable={!disabled}
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedIndex !== null && draggedIndex !== index) {
                  setEntries((current) => move(current, draggedIndex, index));
                }
                setDraggedIndex(null);
              }}
            >
              <span>{object?.name ?? "Objeto indisponível"}</span>
              <Input
                type="number"
                min={1}
                step={1}
                aria-label={`Peso de ${object?.name ?? "objeto"}`}
                value={entry.weight}
                disabled={disabled}
                onChange={(event) => {
                  const weight = Math.max(
                    1,
                    event.currentTarget.valueAsNumber || 1,
                  );
                  setEntries((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, weight } : item,
                    ),
                  );
                }}
              />
              <ReorderControls
                label={object?.name ?? "objeto"}
                canMoveUp={index > 0}
                canMoveDown={index < entries.length - 1}
                disabled={disabled}
                onMoveUp={() =>
                  setEntries((current) => move(current, index, index - 1))
                }
                onMoveDown={() =>
                  setEntries((current) => move(current, index, index + 1))
                }
              />
              <Button
                size="compact"
                tone="danger"
                disabled={disabled}
                onClick={() =>
                  setEntries((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Remover
              </Button>
            </li>
          );
        })}
      </ol>

      {available.length > 0 && (
        <div className={styles.add}>
          <label>
            Objeto
            <Select
              value={selectedObjectId}
              disabled={disabled}
              onChange={(event) =>
                setSelectedObjectId(event.currentTarget.value)
              }
            >
              <option value="">Selecione um objeto</option>
              {available.map((object) => (
                <option key={object.id} value={object.id}>
                  {object.name}
                </option>
              ))}
            </Select>
          </label>
          <Button
            disabled={disabled || !selectedObjectId}
            onClick={() => {
              setEntries((current) => [
                ...current,
                { audioObjectId: selectedObjectId, weight: 1 },
              ]);
              setSelectedObjectId("");
            }}
          >
            Adicionar
          </Button>
        </div>
      )}

      <footer className={styles.actions}>
        <Button
          tone="primary"
          type="submit"
          disabled={disabled || entries.length === 0}
        >
          {list ? "Salvar lista" : "Criar lista"}
        </Button>
        {list && onDelete && (
          <ActionMenu label={`Mais ações para ${list.name}`}>
            <Button
              tone="danger"
              disabled={disabled}
              onClick={() => {
                if (!window.confirm(`Excluir a lista ${list.name}?`)) return;
                void onDelete();
              }}
            >
              Excluir lista
            </Button>
          </ActionMenu>
        )}
        {onCancel ? (
          <Button tone="subtle" disabled={disabled} onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </footer>
    </form>
  );
}

function move<T>(items: readonly T[], from: number, to: number) {
  const moved = [...items];
  const [item] = moved.splice(from, 1);
  if (item !== undefined) moved.splice(to, 0, item);
  return moved;
}
