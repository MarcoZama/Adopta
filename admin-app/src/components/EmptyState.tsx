import type { ReactNode } from "react";
import { Body1, Subtitle2 } from "@fluentui/react-components";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, children }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        {icon}
      </span>
      <Subtitle2>{title}</Subtitle2>
      {children && <Body1 className="muted">{children}</Body1>}
    </div>
  );
}
