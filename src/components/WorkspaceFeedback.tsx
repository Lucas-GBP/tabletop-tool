import { FeedbackMessage } from "./primitives";
import styles from "./WorkspaceFeedback.module.scss";

interface WorkspaceFeedbackProps {
  error: string;
  notice: string;
}

export function WorkspaceFeedback({ error, notice }: WorkspaceFeedbackProps) {
  return (
    <>
      {error && (
        <FeedbackMessage role="alert" tone="error" className={styles.feedback}>
          {error}
        </FeedbackMessage>
      )}
      <FeedbackMessage role="status" tone="success" className={styles.feedback}>
        {notice}
      </FeedbackMessage>
    </>
  );
}
