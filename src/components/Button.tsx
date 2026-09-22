import type { ComponentProps } from "react";
import { classNames } from "@/lib";
import styles from "./Button.module.scss";

type ButtonProps = ComponentProps<"button"> & {
  tone?: "default" | "danger";
};

export function Button({
  className,
  tone = "default",
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
        className,
      )}
    />
  );
}
