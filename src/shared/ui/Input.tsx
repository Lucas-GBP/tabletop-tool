import type { ComponentProps } from "react";
import styles from "./controls.module.scss";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={[styles.control, className].filter(Boolean).join(" ")}
    />
  );
}
