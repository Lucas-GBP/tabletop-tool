import type { ComponentProps } from "react";
import { classNames } from "../lib/classNames";
import styles from "./controls.module.scss";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={classNames(styles.control, styles.select, className)}
    />
  );
}
