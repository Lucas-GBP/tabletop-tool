import { FeedbackMessage } from "./primitives";
import styles from "./WorkspaceFeedback.module.scss";

interface WorkspaceFeedbackProps {
  error: string;
}

export function WorkspaceFeedback({ error }: WorkspaceFeedbackProps) {
  if (!error) return null;

  return (
    <FeedbackMessage role="alert" tone="error" className={styles.feedback}>
      {error}
    </FeedbackMessage>
  );
}
