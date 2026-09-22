import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { classNames } from "@/lib";
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
  const savingRef = useRef(false);

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

  async function save() {
    if (draft.trim() === value) {
      cancelEditing();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await onSave(draft);
      if (saved) setEditing(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
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
    <div className={classNames(styles.root, className)}>
      <Text className={classNames(styles.value, styles.editor)}>
        <input
          className={styles.input}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => {
            if (!savingRef.current) cancelEditing();
          }}
          aria-label={`Novo ${label}`}
          aria-describedby={instructionsId}
          aria-busy={saving}
          required
          autoFocus
          readOnly={disabled || saving}
          size={Math.max(draft.length, 1)}
        />
      </Text>
      <span id={instructionsId} className={styles["visually-hidden"]}>
        Pressione Enter para salvar. Pressione Escape ou clique fora para
        cancelar.
      </span>
    </div>
  );
}
