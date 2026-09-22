import type { ComponentProps } from "react";
import { classNames } from "@/lib";
import styles from "./Input.module.scss";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={classNames(styles.control, className)} />;
}
