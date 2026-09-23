import { useState } from "react";
import type { AudioListDto, AudioListInputDto, AudioObjectDto } from "@/api";
import { Button, Input, Select } from "./primitives";
import styles from "./AudioListEditor.module.scss";

interface AudioListEditorProps {
  list?: AudioListDto;
  objects: readonly AudioObjectDto[];
  disabled: boolean;
  onSave: (input: AudioListInputDto) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
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
        <Input
          aria-label={
            list ? `Nome da lista ${list.name}` : "Nome da nova lista"
          }
          value={name}
          placeholder="Nome da lista"
          disabled={disabled}
          required
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <Select
          aria-label={`Seleção de ${list?.name ?? "nova lista"}`}
          value={selectionMode}
          disabled={disabled}
          onChange={(event) =>
            setSelectionMode(event.currentTarget.value as typeof selectionMode)
          }
        >
          <option value="sequential">Sequencial</option>
          <option value="random">Aleatória</option>
          <option value="weightedRandom">Aleatória por peso</option>
        </Select>
      </div>

      <ol className={styles.entries}>
        {entries.map((entry, index) => {
          const object = objects.find(
            (candidate) => candidate.id === entry.audioObjectId,
          );
          return (
            <li key={entry.audioObjectId}>
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
              <Button
                aria-label={`Mover ${object?.name ?? "objeto"} para cima`}
                disabled={disabled || index === 0}
                onClick={() =>
                  setEntries((current) => move(current, index, index - 1))
                }
              >
                ↑
              </Button>
              <Button
                aria-label={`Mover ${object?.name ?? "objeto"} para baixo`}
                disabled={disabled || index === entries.length - 1}
                onClick={() =>
                  setEntries((current) => move(current, index, index + 1))
                }
              >
                ↓
              </Button>
              <Button
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
        <Button
          disabled={disabled}
          onClick={() =>
            setEntries((current) => [
              ...current,
              { audioObjectId: available[0]!.id, weight: 1 },
            ])
          }
        >
          Adicionar {available[0]!.name}
        </Button>
      )}

      <footer className={styles.actions}>
        <Button type="submit" disabled={disabled || entries.length === 0}>
          {list ? "Salvar lista" : "Criar lista"}
        </Button>
        {list && onDelete && (
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
        )}
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
