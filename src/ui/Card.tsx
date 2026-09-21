import type { HTMLAttributes } from "react";
import { classNames } from "../lib/classNames";
import styles from "./Card.module.scss";

type CardElement = "article" | "div" | "section";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  tone?: "default" | "soft";
}

export function Card({
  as: Component = "div",
  tone = "default",
  className,
  ...props
}: CardProps) {
  return (
    <Component
      {...props}
      className={classNames(styles.card, styles[tone], className)}
    />
  );
}
