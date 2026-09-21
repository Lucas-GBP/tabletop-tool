import type { ComponentProps } from "react";
import { classNames } from "../lib/classNames";
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
      className={classNames(styles.control, styles.button, className)}
    />
  );
}
