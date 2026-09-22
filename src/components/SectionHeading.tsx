import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib";
import styles from "./SectionHeading.module.scss";

interface SectionHeadingProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  headingLevel = 2,
  className,
  ...props
}: SectionHeadingProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div {...props} className={classNames(styles.heading, className)}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <Heading>{title}</Heading>
      </div>
      {action}
    </div>
  );
}
