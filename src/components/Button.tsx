import type { ComponentProps } from "react";
import { classNames } from "@/lib";
import styles from "./Button.module.scss";

type ButtonProps = ComponentProps<"button"> & {
  tone?: "default" | "primary" | "subtle" | "danger";
  size?: "default" | "compact";
};

export function Button({
  className,
  tone = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={classNames(
        styles.control,
        styles.button,
        styles[tone],
        styles[size],
        className,
      )}
    />
  );
}
