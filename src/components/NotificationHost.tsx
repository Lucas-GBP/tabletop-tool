import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import {
  NotificationContext,
  type NotificationTone,
} from "@/hooks/useNotifications";
import { FeedbackMessage } from "./primitives";
import styles from "./NotificationHost.module.scss";

const displayDurationMs = 4_000;

interface Notification {
  id: number;
  message: string;
  tone: NotificationTone;
}

export function NotificationHost({ children }: PropsWithChildren) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const nextId = useRef(0);
  const notify = useCallback(
    (message: string, tone: NotificationTone = "success") => {
      nextId.current += 1;
      setNotification({ id: nextId.current, message, tone });
    },
    [],
  );
  const context = useMemo(() => notify, [notify]);

  return (
    <NotificationContext.Provider value={context}>
      {children}
      {notification ? (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
      ) : null}
    </NotificationContext.Provider>
  );
}

function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, displayDurationMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <FeedbackMessage
      role={notification.tone === "error" ? "alert" : "status"}
      tone={notification.tone}
      className={styles.feedback}
      data-tone={notification.tone}
    >
      {notification.message}
    </FeedbackMessage>
  );
}
