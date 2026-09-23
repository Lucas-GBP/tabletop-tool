import { useEffect, useState } from "react";
import { FeedbackMessage } from "./primitives";
import styles from "./WorkspaceFeedback.module.scss";

const displayDurationMs = 4_000;
type FeedbackTone = "error" | "success";

interface WorkspaceFeedbackProps {
  error: string;
  notice: string;
}

export function WorkspaceFeedback({ error, notice }: WorkspaceFeedbackProps) {
  const message = error || notice;
  const tone: FeedbackTone = error ? "error" : "success";

  if (!message) return null;

  return (
    <AutoDismissFeedback
      key={`${tone}:${message}`}
      message={message}
      tone={tone}
    />
  );
}

function AutoDismissFeedback({
  message,
  tone,
}: {
  message: string;
  tone: FeedbackTone;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), displayDurationMs);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <FeedbackMessage
      role={tone === "error" ? "alert" : "status"}
      tone={tone}
      className={styles.feedback}
      data-tone={tone}
    >
      {message}
    </FeedbackMessage>
  );
}
