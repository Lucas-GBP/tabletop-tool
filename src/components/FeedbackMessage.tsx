import type { HTMLAttributes } from "react";
import { classNames } from "@/lib";
import styles from "./FeedbackMessage.module.scss";

interface FeedbackMessageProps extends HTMLAttributes<HTMLParagraphElement> {
  tone: "error" | "success";
}

export function FeedbackMessage({
  tone,
  className,
  ...props
}: FeedbackMessageProps) {
  return (
    <p
      {...props}
      className={classNames(styles.message, styles[tone], className)}
    />
  );
}
