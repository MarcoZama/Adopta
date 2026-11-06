import type { ReactNode } from "react";
import { Button, Text } from "@fluentui/react-components";
import { ArrowLeft16Regular } from "@fluentui/react-icons";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Link back to the list the page was opened from. */
  back?: { label: string; onClick: () => void; disabled?: boolean };
  badge?: ReactNode;
  actions?: ReactNode;
  /** Stays at the top while the page scrolls (desktop only). */
  sticky?: boolean;
}

export function PageHeader({ title, description, back, badge, actions, sticky }: PageHeaderProps) {
  return (
    <header className={`page-header${sticky ? " sticky" : ""}`}>
      {back && (
        <Button
          appearance="transparent"
          size="small"
          className="back-link"
          icon={<ArrowLeft16Regular />}
          disabled={back.disabled}
          onClick={back.onClick}
        >
          {back.label}
        </Button>
      )}
      <div className="page-header-row">
        <div className="page-heading">
          <div className="page-title-row">
            <h1 className="page-title">{title}</h1>
            {badge}
          </div>
          {description && <Text className="muted page-description">{description}</Text>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}
