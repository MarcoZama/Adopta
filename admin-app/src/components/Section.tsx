import type { ReactNode } from "react";
import { Caption1, useId } from "@fluentui/react-components";

interface SectionProps {
  title: string;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Controls on the right of the title, such as filters. */
  tools?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A titled card: the building block of the editor and detail pages. */
export function Section({ title, hint, icon, tools, className, children }: SectionProps) {
  const titleId = useId("section");
  return (
    <section className={`card section${className ? ` ${className}` : ""}`} aria-labelledby={titleId}>
      <div className="section-head">
        {icon && (
          <span className="section-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="section-heading">
          <h2 id={titleId} className="section-title">
            {title}
          </h2>
          {hint && <Caption1 className="muted">{hint}</Caption1>}
        </div>
        {tools && <div className="section-tools">{tools}</div>}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}
