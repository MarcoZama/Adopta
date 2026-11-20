import { useState, type ReactElement } from "react";
import { Button, Caption1, InfoLabel, Switch, Text, Tooltip } from "@fluentui/react-components";
import { ArrowClockwise16Regular, DataBarVertical20Regular, Mail20Regular } from "@fluentui/react-icons";
import type { Branding } from "../data/types";
import type { GateAction, SendingGate } from "../hooks/useSendingGate";
import { useI18n } from "../i18n";
import { formatTime } from "../lib/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { LanguageSwitch } from "./LanguageSwitch";
import { edition } from "../../../shared/edition";

export type View = "compose" | "history";

interface SidebarProps {
  branding: Branding;
  view: View;
  onNavigate: (view: View) => void;
  gate: SendingGate;
  busy: boolean;
}

const NAV: { view: View; icon: ReactElement }[] = [
  { view: "compose", icon: <Mail20Regular /> },
  { view: "history", icon: <DataBarVertical20Regular /> },
];

export function Sidebar({ branding, view, onNavigate, gate, busy }: SidebarProps) {
  const { t } = useI18n();
  const [pending, setPending] = useState<GateAction>();
  const state = !gate.known ? "unknown" : gate.enabled ? "on" : "off";
  const stateText = !gate.known ? t.sidebar.gateUnknown : gate.enabled ? t.sidebar.gateOn : t.sidebar.gateOff;

  const confirm = async () => {
    if (!pending) return;
    await gate.apply(pending);
    setPending(undefined);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        {branding.logoUrl ? (
          <img className="brand-mark" src={branding.logoUrl} alt="" />
        ) : (
          <span className="brand-mark brand-monogram" aria-hidden="true">
            {branding.appTitle.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="brand-text">
          <Text weight="semibold" className="brand-title">
            {branding.appTitle}
          </Text>
          <Caption1 className="muted brand-subtitle">{edition().label} - {t.sidebar.console(branding.agentName)}</Caption1>
        </div>
      </div>

      <nav className="nav" aria-label={t.sidebar.sections}>
        {NAV.map((item) => (
          <button
            key={item.view}
            type="button"
            className={`nav-item${view === item.view ? " active" : ""}`}
            aria-current={view === item.view ? "page" : undefined}
            disabled={busy}
            onClick={() => onNavigate(item.view)}
          >
            {item.icon}
            <span>{t.sidebar[item.view]}</span>
          </button>
        ))}
      </nav>

      <section className={`gate gate-${state}`} aria-label={t.sidebar.gateRegion}>
        <span className="eyebrow gate-eyebrow">{t.sidebar.gateEyebrow}</span>
        <div className="gate-row">
          <span className={`dot dot-${state}`} aria-hidden="true" />
          <InfoLabel weight="semibold" className="gate-label" info={t.sidebar.gateInfo}>
            {stateText}
          </InfoLabel>
          <Switch
            aria-label={t.sidebar.gateSwitch(branding.agentName)}
            checked={gate.enabled}
            disabled={busy || gate.loading || !gate.known}
            onChange={(_, data) => setPending(data.checked ? "enable" : "disable")}
          />
        </div>
        <div className="gate-foot">
          <Caption1 className="muted gate-time">{gate.known ? t.sidebar.readAt(formatTime(gate.readAt)) : t.sidebar.notChecked}</Caption1>
          <Tooltip content={t.sidebar.refreshGate} relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowClockwise16Regular className={gate.loading ? "spin" : undefined} />}
              disabled={busy || gate.loading}
              onClick={() => void gate.refresh()}
            />
          </Tooltip>
        </div>
      </section>

      <LanguageSwitch />

      <ConfirmDialog
        open={pending !== undefined}
        title={pending === "enable" ? t.sidebar.enableTitle : t.sidebar.disableTitle}
        message={pending === "enable" ? t.sidebar.enableMessage : pending === "disable" ? t.sidebar.disableMessage : ""}
        running={gate.loading}
        onConfirm={() => void confirm()}
        onDismiss={() => setPending(undefined)}
      />
    </aside>
  );
}
