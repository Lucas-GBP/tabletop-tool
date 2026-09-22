import type { ComponentProps } from "react";
import { classNames } from "@/lib";
import styles from "./Select.module.scss";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={classNames(styles.control, styles.select, className)}
    />
  );
}
