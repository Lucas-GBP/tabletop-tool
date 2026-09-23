import { Button, FeedbackMessage } from "./primitives";
import styles from "./LoadFailure.module.scss";

interface LoadFailureProps {
  message: string;
  onRetry: () => void;
}

export function LoadFailure({ message, onRetry }: LoadFailureProps) {
  return (
    <section className={styles.failure} aria-labelledby="load-failure-title">
      <h2 id="load-failure-title">Não foi possível carregar os dados</h2>
      <FeedbackMessage role="alert" tone="error">
        {message}
      </FeedbackMessage>
      <Button tone="primary" onClick={onRetry}>
        Tentar novamente
      </Button>
    </section>
  );
}
