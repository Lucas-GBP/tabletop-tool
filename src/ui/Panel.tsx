import type { HTMLAttributes } from "react";
import { classNames } from "../lib/classNames";
import styles from "./Panel.module.scss";

type PanelElement = "article" | "aside" | "div" | "section";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: PanelElement;
}

export function Panel({
  as: Component = "div",
  className,
  ...props
}: PanelProps) {
  return (
    <Component {...props} className={classNames(styles.panel, className)} />
  );
}
