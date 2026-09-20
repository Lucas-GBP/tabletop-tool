import type { ComponentProps } from "react";
import styles from "./controls.module.scss";

export function Button({
  className,
  type = "button",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.control, styles.button, className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
