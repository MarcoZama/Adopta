import { useCallback, useEffect, useState } from "react";
import { Caption1, Tab, TabList, Text, Toast, Toaster, ToastTitle, useId, useToastController } from "@fluentui/react-components";
import { People20Regular, Settings20Regular } from "@fluentui/react-icons";
import { GroupsView } from "./components/GroupsView";
import { LanguageSwitch } from "./components/LanguageSwitch";
import { SettingsView, type Branding } from "./components/SettingsView";
import { I18nProvider, useI18n } from "./i18n";
import type { Notify } from "./lib/notify";
import { edition } from "../../shared/edition";

type View = "settings" | "groups";

export default function App() {
  const [branding, setBranding] = useState<Branding>({ appTitle: "" });
  // The saved default language applies only when neither the user nor the browser picks one.
  return (
    <I18nProvider fallback={branding.defaultLanguage}>
      <Shell branding={branding} onBrandingChange={setBranding} />
    </I18nProvider>
  );
}

function Shell({ branding, onBrandingChange }: { branding: Branding; onBrandingChange: (branding: Branding) => void }) {
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

  const [view, setView] = useState<View>("settings");

  useEffect(() => {
    document.title = t.app.documentTitle(branding.appTitle);
  }, [branding.appTitle, t]);

  return (
    <div className="app">
      <Toaster toasterId={toasterId} position="top-end" />
      <header className="topbar">
        <div className="brand">
          {branding.logoUrl ? (
            <img className="brand-mark" src={branding.logoUrl} alt="" />
          ) : (
            <span className="brand-mark brand-monogram" aria-hidden="true">
              <Settings20Regular />
            </span>
          )}
          <div className="brand-text">
            <Text weight="semibold" className="brand-title">
              {t.app.title} - {edition().label}
            </Text>
            <Caption1 className="muted">{branding.appTitle || t.app.subtitle}</Caption1>
          </div>
        </div>
        <div className="topbar-end">
          <TabList selectedValue={view} onTabSelect={(_, d) => setView(d.value as View)} aria-label={t.app.sections}>
            <Tab value="settings" icon={<Settings20Regular />}>
              {t.app.settings}
            </Tab>
            <Tab value="groups" icon={<People20Regular />}>
              {t.app.groups}
            </Tab>
          </TabList>
          <LanguageSwitch />
        </div>
      </header>
      {/* Both views stay mounted, so unsaved edits survive a tab switch. */}
      <main className="page">
        <div hidden={view !== "settings"}>
          <SettingsView notify={notify} onBrandingChange={onBrandingChange} />
        </div>
        <div hidden={view !== "groups"}>
          <GroupsView notify={notify} />
        </div>
      </main>
    </div>
  );
}
