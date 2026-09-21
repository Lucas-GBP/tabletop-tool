import type { ComponentProps } from "react";
import { classNames } from "../lib/classNames";
import styles from "./controls.module.scss";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={classNames(styles.control, className)} />;
}
