import { useId, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { classNames } from "../lib/classNames";
import { Button } from "./Button";
import { Input } from "./Input";
import styles from "./EditableText.module.scss";

type TextElement = "h1" | "h2" | "h3" | "h4" | "span";

interface EditableTextProps {
  value: string;
  label: string;
  onSave: (value: string) => Promise<boolean>;
  as?: TextElement;
  className?: string;
  disabled?: boolean;
}

export function EditableText({
  value,
  label,
  onSave,
  as: Text = "span",
  className,
  disabled = false,
}: EditableTextProps) {
  const instructionsId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  function beginEditing() {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  }

  function handleDisplayKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      beginEditing();
    }
  }

  function cancelEditing() {
    setDraft(value);
    setEditing(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim() === value) {
      cancelEditing();
      return;
    }

    setSaving(true);
    const saved = await onSave(draft);
    setSaving(false);
    if (saved) setEditing(false);
  }

  if (!editing) {
    return (
      <div className={classNames(styles.root, className)}>
        <Text
          className={classNames(styles.value, !disabled && styles.editable)}
          onDoubleClick={beginEditing}
          onKeyDown={handleDisplayKeyDown}
          tabIndex={disabled ? -1 : 0}
          aria-describedby={instructionsId}
          title="Clique duas vezes para editar"
        >
          {value}
        </Text>
        <span id={instructionsId} className={styles["visually-hidden"]}>
          Clique duas vezes para editar. Pressione Enter ou F2 para editar pelo
          teclado.
        </span>
      </div>
    );
  }

  return (
    <form
      className={classNames(styles.root, styles.form, className)}
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (event.key === "Escape") cancelEditing();
      }}
    >
      <Input
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        aria-label={`Novo ${label}`}
        required
        autoFocus
        disabled={disabled || saving}
      />
      <Button
        type="submit"
        className={styles.action}
        disabled={disabled || saving}
      >
        Salvar
      </Button>
      <Button
        type="button"
        className={styles.action}
        disabled={saving}
        onClick={cancelEditing}
      >
        Cancelar
      </Button>
    </form>
  );
}
