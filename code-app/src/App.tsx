import { useCallback, useState } from "react";
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Toast,
  Toaster,
  ToastTitle,
  useId,
  useToastController,
} from "@fluentui/react-components";
import { ComposeView } from "./components/ComposeView";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { HistoryView } from "./components/HistoryView";
import { Sidebar, type View } from "./components/Sidebar";
import type { Branding } from "./data/types";
import { useBranding } from "./hooks/useBranding";
import { useSendingGate } from "./hooks/useSendingGate";
import { I18nProvider, useI18n } from "./i18n";
import type { Notify } from "./lib/notify";

export default function App() {
  const { branding, error } = useBranding();
  // The default language of Adopta Setting applies only when neither the user nor the browser picks one.
  return (
    <I18nProvider fallback={branding.defaultLanguage}>
      <Shell branding={branding} brandingError={error} />
    </I18nProvider>
  );
}

function Shell({ branding, brandingError }: { branding: Branding; brandingError?: string }) {
  const { t } = useI18n();
  const toasterId = useId("toaster");
  const { dispatchToast } = useToastController(toasterId);
  const notify = useCallback<Notify>(
    (message, intent) =>
      dispatchToast(
        <Toast>
          <ToastTitle>{message}</ToastTitle>
        </Toast>,
        { intent, timeout: intent === "error" ? 10000 : 5000 },
      ),
    [dispatchToast],
  );

  const gate = useSendingGate(notify);
  const [view, setView] = useState<View>("compose");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [leaveTo, setLeaveTo] = useState<View>();

  const navigate = (next: View) => {
    if (next === view) return;
    if (dirty) setLeaveTo(next);
    else setView(next);
  };

  return (
    <div className="shell">
      <Toaster toasterId={toasterId} position="top-end" />
      <Sidebar branding={branding} view={view} onNavigate={navigate} gate={gate} busy={busy} />
      <main className="main">
        {brandingError && (
          <MessageBar intent="warning" className="banner">
            <MessageBarBody>
              <MessageBarTitle>{t.app.brandingErrorTitle}</MessageBarTitle>
              {t.app.brandingError(brandingError)}
            </MessageBarBody>
          </MessageBar>
        )}
        {view === "compose" ? (
          <ComposeView
            branding={branding}
            busy={busy}
            setBusy={setBusy}
            notify={notify}
            onRefreshGate={gate.refresh}
            onDirtyChange={setDirty}
          />
        ) : (
          <HistoryView agentName={branding.agentName} notify={notify} />
        )}
      </main>

      <ConfirmDialog
        open={leaveTo !== undefined}
        title={t.app.unsavedTitle}
        message={t.app.unsavedMessage}
        confirmLabel={t.app.discard}
        running={false}
        onConfirm={() => {
          if (leaveTo) setView(leaveTo);
          setLeaveTo(undefined);
        }}
        onDismiss={() => setLeaveTo(undefined)}
      />
    </div>
  );
}
