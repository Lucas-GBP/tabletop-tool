import type { RuntimeError } from "@/runtime";
import { FeedbackMessage } from "./primitives";
import styles from "./RuntimeFeedback.module.scss";

interface RuntimeFeedbackProps {
  error: RuntimeError | null;
  diagnostics: readonly RuntimeError[];
}

export function RuntimeFeedback({ error, diagnostics }: RuntimeFeedbackProps) {
  if (!error && diagnostics.length === 0) return null;

  return (
    <section className={styles.feedback} aria-label="Feedback da execução">
      {error && (
        <FeedbackMessage tone="error" role="alert">
          {error.message}
        </FeedbackMessage>
      )}
      {diagnostics.length > 0 && (
        <details className={styles.diagnostics}>
          <summary>Diagnóstico da execução ({diagnostics.length})</summary>
          <ol aria-label="Erros registrados durante a execução">
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`}>
                <strong>{diagnostic.code}</strong>
                <span>{diagnostic.message}</span>
                {diagnostic.operation && (
                  <small>Operação: {diagnostic.operation}</small>
                )}
                {diagnostic.entityId && (
                  <small>Entidade: {diagnostic.entityId}</small>
                )}
                <small>
                  Recuperável: {diagnostic.recoverable ? "sim" : "não"}
                </small>
                {diagnostic.details && <small>{diagnostic.details}</small>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
