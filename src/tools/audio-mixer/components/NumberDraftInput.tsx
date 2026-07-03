import { createEffect, createSignal } from "solid-js";
import { parseOptionalSecondsInput, parseSecondsInput } from "../audio/audioRegions";

export type NumberInputMode = "seconds" | "optionalSeconds" | "milliseconds";

type NumberDraftInputProps = {
  value: number | null;
  mode: NumberInputMode;
  ariaLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  onCommit: (value: number | null) => void;
};

function formatNumberDraft(value: number | null): string {
  return value === null ? "" : String(value);
}

function parseNumberDraft(
  value: string,
  fallback: number | null,
  mode: NumberInputMode
): number | null {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) {
    return mode === "optionalSeconds" ? null : 0;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  switch (mode) {
    case "milliseconds":
      return Math.max(0, Math.round(parsedValue));
    case "optionalSeconds":
      return parseOptionalSecondsInput(normalizedValue);
    case "seconds":
      return parseSecondsInput(normalizedValue);
  }
}

export function NumberDraftInput(props: NumberDraftInputProps) {
  const [isEditing, setIsEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");

  createEffect(() => {
    if (!isEditing()) {
      setDraft(formatNumberDraft(props.value));
    }
  });

  const commitDraft = () => {
    const nextValue = parseNumberDraft(draft(), props.value, props.mode);

    props.onCommit(nextValue);
    setDraft(formatNumberDraft(nextValue));
    setIsEditing(false);
  };

  const cancelDraft = () => {
    setDraft(formatNumberDraft(props.value));
    setIsEditing(false);
  };

  return (
    <input
      type="text"
      inputmode={props.mode === "milliseconds" ? "numeric" : "decimal"}
      value={draft()}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      placeholder={props.placeholder}
      onFocus={() => {
        setIsEditing(true);
        setDraft(formatNumberDraft(props.value));
      }}
      onInput={(event) => setDraft(event.currentTarget.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
          return;
        }

        if (event.key === "Escape") {
          cancelDraft();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
