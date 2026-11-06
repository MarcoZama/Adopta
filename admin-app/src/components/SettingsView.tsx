import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Caption1,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Select,
  Spinner,
  Switch,
  Text,
} from "@fluentui/react-components";
import {
  ArrowClockwise20Regular,
  ArrowUndo20Regular,
  ArrowUpload20Regular,
  Bot20Regular,
  CheckmarkCircle20Filled,
  Delete20Regular,
  Globe20Regular,
  Image20Regular,
  PlugConnected20Regular,
  Save20Regular,
  Send20Regular,
  Warning20Filled,
} from "@fluentui/react-icons";
import {
  emptySettings,
  HTTPS_LINK,
  loadLogo,
  loadSettings,
  readSettings,
  removeLogo,
  saveSettings,
  triggersApply,
  uploadLogo,
  type SettingsForm,
  type SettingsRecord,
} from "../data/admin";
import { LANGUAGES, toLanguage, useI18n, type Language } from "../i18n";
import { formatDateTime } from "../lib/format";
import { errorMessage, type Notify } from "../lib/notify";
import { PageHeader } from "./PageHeader";
import { Section } from "./Section";

export interface Branding {
  appTitle: string;
  logoUrl?: string;
  defaultLanguage?: Language;
}

interface SettingsViewProps {
  notify: Notify;
  onBrandingChange: (branding: Branding) => void;
}

const MAX_LOGO_BYTES = 10 * 1024 * 1024;
const POLL_INTERVAL_MS = 4000;
const POLL_ATTEMPTS = 10;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formOf(record?: SettingsRecord): SettingsForm {
  if (!record) return emptySettings();
  const { name, appTitle, agentName, defaultLanguage, coachKnowledgeUrl, sendingEnabled } = record;
  return { name, appTitle, agentName, defaultLanguage, coachKnowledgeUrl, sendingEnabled };
}

const sameForm = (a: SettingsForm, b: SettingsForm) =>
  a.name.trim() === b.name.trim() &&
  a.appTitle.trim() === b.appTitle.trim() &&
  a.agentName.trim() === b.agentName.trim() &&
  a.defaultLanguage === b.defaultLanguage &&
  a.coachKnowledgeUrl.trim() === b.coachKnowledgeUrl.trim() &&
  a.sendingEnabled === b.sendingEnabled;

/**
 * Outcome of AdoptaApplySettings, from the message it writes in Apply status:
 * "Configurazione applicata. ... Variabili aggiornate: ... Ripubblica ..." when variables changed.
 */
function applyOutcome(status: string): "none" | "ok" | "republish" | "problem" {
  if (!status.trim()) return "none";
  if (!status.startsWith("Configurazione applicata")) return "problem";
  return status.includes("Variabili aggiornate") ? "republish" : "ok";
}

export function SettingsView({ notify, onBrandingChange }: SettingsViewProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [record, setRecord] = useState<SettingsRecord>();
  const [activeCount, setActiveCount] = useState(0);
  const [form, setForm] = useState<SettingsForm>(emptySettings);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>();
  const [logoBusy, setLogoBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const replaceLogo = useCallback((url?: string) => {
    setLogoUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const state = await loadSettings();
      setRecord(state.record);
      setActiveCount(state.activeCount);
      setForm(formOf(state.record));
      replaceLogo(state.record ? await loadLogo(state.record.id) : undefined);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [replaceLogo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => replaceLogo(undefined), [replaceLogo]);

  useEffect(() => {
    onBrandingChange({ appTitle: record?.appTitle ?? "", logoUrl, defaultLanguage: record?.defaultLanguage });
  }, [record?.appTitle, record?.defaultLanguage, logoUrl, onBrandingChange]);

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const dirty = !sameForm(form, formOf(record));
  const urlInvalid = form.coachKnowledgeUrl.trim() !== "" && !HTTPS_LINK.test(form.coachKnowledgeUrl.trim());
  const busy = loading || saving;

  /** Waits for AdoptaApplySettings to write a new Applied on after a save. */
  const waitForApply = async (id: string, previous?: string) => {
    setApplying(true);
    try {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS);
        const latest = await readSettings(id);
        if (latest.appliedOn && latest.appliedOn !== previous) {
          setRecord(latest);
          return;
        }
      }
      notify(t.settings.notApplied, "warning");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setApplying(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const startsApply = triggersApply(form, record);
      const id = await saveSettings(form, record);
      const latest = await readSettings(id);
      const previousAppliedOn = record ? record.appliedOn : undefined;
      setRecord(latest);
      setActiveCount((count) => Math.max(count, 1));
      setForm(formOf(latest));
      notify(t.settings.saved, "success");
      if (startsApply) void waitForApply(id, previousAppliedOn);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const refreshStatus = async () => {
    if (!record) return;
    try {
      const latest = await readSettings(record.id);
      setRecord((current) => (current ? { ...current, applyStatus: latest.applyStatus, appliedOn: latest.appliedOn } : latest));
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };

  const onLogoChosen = async (file?: File) => {
    if (!file || !record) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      notify(t.settings.chooseImage, "warning");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      notify(t.settings.imageTooLarge, "warning");
      return;
    }
    setLogoBusy(true);
    try {
      await uploadLogo(record.id, file);
      replaceLogo(await loadLogo(record.id));
      notify(t.settings.logoUpdated, "success");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoRemove = async () => {
    if (!record) return;
    setLogoBusy(true);
    try {
      await removeLogo(record.id);
      replaceLogo(undefined);
      notify(t.settings.logoRemoved, "success");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setLogoBusy(false);
    }
  };

  if (loading && !record) {
    return <Spinner className="loading" label={t.settings.loading} />;
  }

  const outcome = applyOutcome(record?.applyStatus ?? "");
  const headline = outcome === "none" ? "" : t.settings.applyHeadline[outcome];

  return (
    <div className="view">
      <PageHeader
        sticky
        title={t.settings.title}
        description={t.settings.description}
        badge={dirty && <span className="dirty">{t.settings.unsaved}</span>}
        actions={
          <>
            <Button icon={<ArrowUndo20Regular />} disabled={!dirty || busy} onClick={() => setForm(formOf(record))}>
              {t.settings.undo}
            </Button>
            <Button appearance="primary" icon={<Save20Regular />} disabled={!dirty || busy || urlInvalid} onClick={() => void save()}>
              {saving ? t.common.saving : record ? t.common.save : t.settings.create}
            </Button>
          </>
        }
      />

      {loadError && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>{t.settings.loadError}</MessageBarTitle>
            {loadError}
          </MessageBarBody>
        </MessageBar>
      )}
      {!loadError && !record && (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>{t.settings.noRecordTitle}</MessageBarTitle>
            {t.settings.noRecord}
          </MessageBarBody>
        </MessageBar>
      )}
      {activeCount > 1 && (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>{t.settings.activeTitle(activeCount)}</MessageBarTitle>
            {t.settings.active}
          </MessageBarBody>
        </MessageBar>
      )}

      <div className="settings-grid">
        <Section icon={<Image20Regular />} title={t.settings.names} className="span-2">
          <fieldset className="fields two" disabled={busy}>
            <Field label={t.settings.appTitle} hint={t.settings.appTitleHint}>
              <Input value={form.appTitle} maxLength={100} onChange={(_, d) => set("appTitle", d.value)} />
            </Field>
            <Field label={t.settings.agentName} hint={t.settings.agentNameHint}>
              <Input value={form.agentName} maxLength={100} onChange={(_, d) => set("agentName", d.value)} />
            </Field>
            <Field label={t.settings.name} hint={t.settings.nameHint}>
              <Input value={form.name} maxLength={850} onChange={(_, d) => set("name", d.value)} />
            </Field>
            <div className="logo-field">
              <Text weight="semibold" size={300}>
                {t.settings.logo}
              </Text>
              <div className="logo-row">
                <div className="logo-box">
                  {logoUrl ? <img src={logoUrl} alt={t.settings.currentLogo} /> : <Image20Regular aria-hidden="true" />}
                </div>
                <div className="logo-actions">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    hidden
                    onChange={(event) => {
                      void onLogoChosen(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    size="small"
                    icon={<ArrowUpload20Regular />}
                    disabled={!record || logoBusy || busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    {logoBusy ? t.common.wait : logoUrl ? t.settings.replace : t.settings.upload}
                  </Button>
                  {logoUrl && (
                    <Button size="small" appearance="subtle" icon={<Delete20Regular />} disabled={logoBusy || busy} onClick={() => void onLogoRemove()}>
                      {t.settings.remove}
                    </Button>
                  )}
                </div>
              </div>
              <Caption1 className="muted">{record ? t.settings.logoHint : t.settings.logoAfterCreate}</Caption1>
            </div>
          </fieldset>
        </Section>

        <Section icon={<Globe20Regular />} title={t.settings.languageSection}>
          <fieldset className="fields" disabled={busy}>
            <Field label={t.settings.defaultLanguage} hint={t.settings.defaultLanguageHint}>
              <Select value={form.defaultLanguage} onChange={(_, d) => set("defaultLanguage", toLanguage(d.value) ?? "it")}>
                {LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </fieldset>
        </Section>

        <Section icon={<Send20Regular />} title={t.settings.sending}>
          <fieldset className="fields" disabled={busy}>
            <Switch
              checked={form.sendingEnabled}
              label={form.sendingEnabled ? t.settings.sendingOn : t.settings.sendingOff}
              onChange={(_, d) => set("sendingEnabled", d.checked)}
            />
            <Caption1 className="muted">{t.settings.sendingHint}</Caption1>
          </fieldset>
        </Section>

        <Section icon={<Bot20Regular />} title={t.settings.knowledge} className="span-2">
          <fieldset className="fields" disabled={busy}>
            <Field
              label={t.settings.knowledgeUrl}
              hint={t.settings.knowledgeHint}
              validationState={urlInvalid ? "error" : "none"}
              validationMessage={urlInvalid ? t.settings.httpsRequired : undefined}
            >
              <Input
                type="url"
                value={form.coachKnowledgeUrl}
                placeholder="https://contoso.sharepoint.com/sites/..."
                maxLength={2000}
                onChange={(_, d) => set("coachKnowledgeUrl", d.value)}
              />
            </Field>
          </fieldset>
        </Section>

        <Section
          icon={<PlugConnected20Regular />}
          title={t.settings.apply}
          className="span-2"
          hint={t.settings.applyHint}
          tools={
            <Button size="small" appearance="subtle" icon={<ArrowClockwise20Regular />} disabled={!record || applying} onClick={() => void refreshStatus()}>
              {t.settings.refreshStatus}
            </Button>
          }
        >
          {applying ? (
            <Spinner size="small" labelPosition="after" label={t.settings.applying} className="apply-spinner" />
          ) : (
            <div className={`apply-status apply-${outcome}`}>
              {outcome === "ok" || outcome === "republish" ? (
                <CheckmarkCircle20Filled className="apply-icon" aria-hidden="true" />
              ) : outcome === "problem" ? (
                <Warning20Filled className="apply-icon" aria-hidden="true" />
              ) : null}
              <div className="apply-text">
                {/* AdoptaApplySettings writes the status in Italian: in English a headline comes first. */}
                {headline && <Text weight="semibold">{headline}</Text>}
                <Text>{record?.applyStatus?.trim() || t.settings.notAppliedYet}</Text>
                {record?.appliedOn && <Caption1 className="muted">{t.settings.lastApplied(formatDateTime(record.appliedOn))}</Caption1>}
              </div>
            </div>
          )}
          {!applying && outcome === "republish" && (
            <MessageBar intent="info" className="apply-next">
              <MessageBarBody>
                <MessageBarTitle>{t.settings.republishTitle}</MessageBarTitle>
                {t.settings.republish}
              </MessageBarBody>
            </MessageBar>
          )}
        </Section>
      </div>
    </div>
  );
}
