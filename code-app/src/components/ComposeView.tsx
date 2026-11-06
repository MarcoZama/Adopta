import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Dropdown,
  Field,
  Input,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Textarea,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowClockwise20Regular,
  CalendarCancel20Regular,
  Delete20Regular,
  Link20Regular,
  MoreHorizontal20Regular,
  People20Regular,
  Save20Regular,
  Send20Regular,
  TextDescription20Regular,
} from "@fluentui/react-icons";
import {
  getAudienceIds,
  getCommunication,
  listAudienceGroups,
  listCommunications,
  manageCommunication,
  saveCommunication,
  scheduleCommunication,
  syncAudience,
} from "../data/repository";
import { CommunicationStatus, type AudienceGroup, type Branding, type CardLanguage, type Communication } from "../data/types";
import { LANGUAGES, toLanguage, useI18n } from "../i18n";
import { addDays, combineLocal, formatDateTime, HOURS, HTTPS_LINK, MINUTES, toDateInput, twoDigits } from "../lib/format";
import { errorMessage, type Notify } from "../lib/notify";
import { CardPreview } from "./CardPreview";
import { CommunicationList } from "./CommunicationList";
import { ConfirmDialog } from "./ConfirmDialog";
import { PageHeader } from "./PageHeader";
import { Section } from "./Section";
import { CommunicationBadge } from "./StatusBadge";

interface FormState {
  title: string;
  body: string;
  link: string;
  cardMessage: string;
  language: CardLanguage;
  audienceIds: string[];
  date: string;
  hour: string;
  minute: string;
}

function emptyForm(language: CardLanguage): FormState {
  return {
    title: "",
    body: "",
    link: "",
    cardMessage: "",
    language,
    audienceIds: [],
    date: toDateInput(addDays(new Date(), 1)),
    hour: "09",
    minute: "00",
  };
}

function formFrom(item: Communication, audienceIds: string[]): FormState {
  const scheduled = item.vm_scheduledat ? new Date(item.vm_scheduledat) : undefined;
  return {
    title: item.vm_title ?? "",
    body: item.vm_body ?? "",
    link: item.vm_link ?? "",
    cardMessage: item.vm_cardmessage ?? "",
    // Communications created before 1.0.0.12 have no language: their card is Italian.
    language: toLanguage(item.vm_language) ?? "it",
    audienceIds,
    date: toDateInput(scheduled ?? addDays(new Date(), 1)),
    hour: scheduled ? twoDigits(scheduled.getHours()) : "09",
    minute: scheduled ? twoDigits(scheduled.getMinutes()) : "00",
  };
}

/** Values as they are saved, to compare the form with the stored draft. */
function normalized(form: FormState) {
  return JSON.stringify({
    title: form.title.trim(),
    body: form.body.replace(/\r\n/g, "\n"),
    link: form.link.trim(),
    cardMessage: form.cardMessage.trim(),
    language: form.language,
    audienceIds: [...form.audienceIds].sort(),
    when: `${form.date} ${form.hour}:${form.minute}`,
  });
}

type PendingAction = "delete" | "cancel";

interface ComposeViewProps {
  branding: Branding;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  notify: Notify;
  onRefreshGate: () => Promise<void>;
  /** Tells the shell whether leaving the page would lose changes. */
  onDirtyChange: (dirty: boolean) => void;
}

export function ComposeView({ branding, busy, setBusy, notify, onRefreshGate, onDirtyChange }: ComposeViewProps) {
  const { t, language: appLanguage, flowText } = useI18n();
  const agentName = branding.agentName;
  // New communications start in the default language of Adopta Setting, or else in the app language.
  const newLanguage = branding.defaultLanguage ?? appLanguage;
  const [items, setItems] = useState<Communication[]>([]);
  const [groups, setGroups] = useState<AudienceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Communication>();
  const [form, setForm] = useState<FormState>(() => emptyForm(newLanguage));
  const [saved, setSaved] = useState<string>();
  const [pending, setPending] = useState<PendingAction>();
  const [discard, setDiscard] = useState<() => void>();
  const [running, setRunning] = useState(false);
  const [action, setAction] = useState<"save" | "schedule">();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const status = selected?.vm_communicationstatus;
  const isDraft = !selected || status === CommunicationStatus.Draft;
  const editable = !busy && isDraft;
  const dirty = isDraft && saved !== undefined && saved !== normalized(form);
  const canDelete =
    !!selected && (status === CommunicationStatus.Draft || (status === CommunicationStatus.Cancelled && !selected.vm_startedat));
  const canCancel = !!selected && status === CommunicationStatus.Scheduled;

  useEffect(() => onDirtyChange(editing && dirty), [editing, dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const update = (changes: Partial<FormState>) => setForm((current) => ({ ...current, ...changes }));

  /** Runs `next` now, or after the user agrees to discard the unsaved changes. */
  const leave = (next: () => void) => (dirty ? setDiscard(() => next) : next());

  const open = useCallback(async (item: Communication) => {
    const audienceIds = await getAudienceIds(item.vm_adoptacommunicationid);
    const next = formFrom(item, audienceIds);
    setSelected(item);
    setForm(next);
    setSaved(normalized(next));
  }, []);

  const startNew = () => {
    const next = emptyForm(newLanguage);
    setSelected(undefined);
    setForm(next);
    setSaved(normalized(next));
    setEditing(true);
  };

  const load = useCallback(
    async (selectId?: string) => {
      setLoading(true);
      try {
        const [list, audience] = await Promise.all([listCommunications(), listAudienceGroups()]);
        setItems(list);
        setGroups(audience);
        if (selectId) {
          const fresh = list.find((c) => c.vm_adoptacommunicationid === selectId) ?? (await getCommunication(selectId));
          await open(fresh);
        }
      } catch (err) {
        notify(errorMessage(err), "error");
      } finally {
        setLoading(false);
      }
    },
    [notify, open],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const select = async (item: Communication) => {
    setBusy(true);
    try {
      await open(item);
      setEditing(true);
    } catch (err) {
      notify(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return notify(t.compose.missingText, "error");
    if (form.link.trim() && !HTTPS_LINK.test(form.link.trim())) return notify(t.compose.invalidLink, "error");
    const scheduledAt = combineLocal(form.date, form.hour, form.minute);
    if (!scheduledAt) return notify(t.compose.invalidDate, "error");

    setBusy(true);
    setAction("save");
    let id = selected?.vm_adoptacommunicationid;
    try {
      id = await saveCommunication({ ...form, scheduledAt }, id);
      await syncAudience(id, form.audienceIds, groups);
      await load(id);
      notify(t.compose.saved, "success");
    } catch (err) {
      // The draft may exist even if a group link failed: reload it so a retry updates it.
      if (id) await load(id);
      notify(t.compose.saveIncomplete(errorMessage(err)), "error");
    } finally {
      setBusy(false);
      setAction(undefined);
    }
  };

  const schedule = async () => {
    if (!selected) return;
    if (dirty) return notify(t.compose.saveBeforeSchedule, "warning");
    setBusy(true);
    setAction("schedule");
    try {
      const result = await scheduleCommunication(selected.vm_adoptacommunicationid);
      await load(selected.vm_adoptacommunicationid);
      notify(flowText(result.message), result.success ? "success" : "error");
    } catch (err) {
      notify(t.compose.scheduleNotConfirmed(errorMessage(err)), "error");
    } finally {
      setBusy(false);
      setAction(undefined);
    }
  };

  const runPending = async () => {
    if (!pending || !selected) return;
    const id = selected.vm_adoptacommunicationid;
    setRunning(true);
    setBusy(true);
    try {
      const result = await manageCommunication(id, pending);
      if (result.success && pending === "delete") {
        setEditing(false);
        setSelected(undefined);
        setSaved(undefined);
        await load();
      } else {
        await load(id);
      }
      notify(flowText(result.message), result.success ? "success" : "error");
    } catch (err) {
      notify(t.operationNotConfirmed(errorMessage(err)), "error");
    } finally {
      setRunning(false);
      setBusy(false);
      setPending(undefined);
    }
  };

  const audienceOptions = useMemo(
    () => groups.filter((g) => g.vm_enabled || form.audienceIds.includes(g.vm_adoptaaudiencegroupid)),
    [groups, form.audienceIds],
  );
  const groupLabel = (g: AudienceGroup) => `${g.vm_name ?? t.compose.unnamedGroup}${g.vm_enabled ? "" : t.compose.disabledGroup}`;
  const audienceText = form.audienceIds
    .map((id) => groups.find((g) => g.vm_adoptaaudiencegroupid === id))
    .map((g) => (g ? groupLabel(g) : t.compose.missingGroup))
    .join(", ");

  const statusLine = dirty ? (
    <span className="dirty">{t.compose.unsaved}</span>
  ) : selected ? (
    t.compose.createdOn(formatDateTime(selected.createdon))
  ) : (
    t.compose.notSavedYet
  );

  const dialogs = (
    <>
      <ConfirmDialog
        open={pending !== undefined}
        title={pending === "delete" ? t.compose.deleteTitle : t.compose.cancelTitle}
        message={
          pending === "delete"
            ? t.compose.deleteMessage(selected?.vm_title ?? "")
            : t.compose.cancelMessage(selected?.vm_title ?? "")
        }
        confirmLabel={pending === "delete" ? t.compose.deleteConfirm : t.compose.cancelTitle}
        running={running}
        onConfirm={() => void runPending()}
        onDismiss={() => setPending(undefined)}
      />
      <ConfirmDialog
        open={discard !== undefined}
        title={t.app.unsavedTitle}
        message={t.app.unsavedMessage}
        confirmLabel={t.app.discard}
        running={false}
        onConfirm={() => {
          discard?.();
          setDiscard(undefined);
        }}
        onDismiss={() => setDiscard(undefined)}
      />
    </>
  );

  if (!editing) {
    return (
      <div className="page">
        <PageHeader
          title={t.compose.title}
          description={t.compose.description(agentName)}
          actions={
            <>
              <Tooltip content={t.compose.refreshList} relationship="label">
                <Button
                  appearance="subtle"
                  icon={<ArrowClockwise20Regular />}
                  disabled={busy || loading}
                  onClick={() => {
                    void load();
                    void onRefreshGate();
                  }}
                />
              </Tooltip>
              <Button appearance="primary" icon={<Add20Regular />} disabled={busy} onClick={startNew}>
                {t.compose.newCommunication}
              </Button>
            </>
          }
        />
        <CommunicationList
          items={items}
          loading={loading}
          busy={busy}
          filter={filter}
          search={search}
          onFilter={setFilter}
          onSearch={setSearch}
          onOpen={(item) => void select(item)}
        />
        {dialogs}
      </div>
    );
  }

  return (
    <div className="page editing">
      <PageHeader
        sticky
        back={{ label: t.compose.title, disabled: busy, onClick: () => leave(() => setEditing(false)) }}
        title={selected ? selected.vm_title || t.common.untitled : t.compose.newCommunication}
        badge={<CommunicationBadge status={selected ? status : CommunicationStatus.Draft} />}
        description={statusLine}
        actions={
          <div className="editor-actions">
            {selected && (
              <Menu positioning="below-end">
                <MenuTrigger disableButtonEnhancement>
                  <Button appearance="subtle" icon={<MoreHorizontal20Regular />} aria-label={t.compose.moreActions} disabled={busy} />
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem
                      icon={<ArrowClockwise20Regular />}
                      onClick={() => leave(() => void load(selected.vm_adoptacommunicationid))}
                    >
                      {t.common.refresh}
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem icon={<CalendarCancel20Regular />} disabled={!canCancel} onClick={() => setPending("cancel")}>
                      {t.compose.cancelTitle}
                    </MenuItem>
                    <MenuItem icon={<Delete20Regular />} disabled={!canDelete} onClick={() => setPending("delete")}>
                      {t.compose.deleteTitle}
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            )}
            <Tooltip content={t.compose.scheduleHint} relationship="description">
              <Button icon={<Send20Regular />} disabled={busy || !selected || !isDraft} onClick={() => void schedule()}>
                {action === "schedule" ? t.common.wait : t.compose.schedule}
              </Button>
            </Tooltip>
            <Button appearance="primary" icon={<Save20Regular />} disabled={!editable} onClick={() => void save()}>
              {action === "save" ? t.common.wait : t.compose.saveDraft}
            </Button>
          </div>
        }
      />

      {!isDraft && (
        <MessageBar intent="info">
          <MessageBarBody>
            {t.compose.locked(t.communicationStatus[status ?? -1]?.toLowerCase() ?? "")}
            {canCancel && t.compose.lockedCancel}
          </MessageBarBody>
        </MessageBar>
      )}

      <div className="editor">
        <div className="editor-form">
          <Section icon={<TextDescription20Regular />} title={t.compose.messageSection} hint={t.compose.messageHint}>
            <fieldset className="fields" disabled={!editable}>
              <Field label={t.compose.titleField} required>
                <Input
                  value={form.title}
                  maxLength={500}
                  placeholder={t.compose.titlePlaceholder}
                  onChange={(_, d) => update({ title: d.value })}
                />
              </Field>
              <Field label={t.compose.bodyField} required>
                <Textarea
                  value={form.body}
                  maxLength={20000}
                  rows={6}
                  resize="vertical"
                  placeholder={t.compose.bodyPlaceholder(agentName)}
                  onChange={(_, d) => update({ body: d.value })}
                />
              </Field>
              <Field label={t.compose.cardLanguage} hint={t.compose.cardLanguageHint}>
                <Select value={form.language} onChange={(_, d) => update({ language: toLanguage(d.value) ?? "it" })}>
                  {LANGUAGES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </fieldset>
          </Section>

          <Section icon={<Link20Regular />} title={t.compose.linkSection} hint={t.compose.linkHint}>
            <fieldset className="fields" disabled={!editable}>
              <Field label={t.compose.linkField}>
                <Input value={form.link} maxLength={2048} placeholder="https://..." onChange={(_, d) => update({ link: d.value })} />
              </Field>
              <Field label={t.compose.closingField}>
                <Textarea
                  value={form.cardMessage}
                  maxLength={2000}
                  rows={2}
                  resize="vertical"
                  placeholder={t.compose.closingPlaceholder(agentName)}
                  onChange={(_, d) => update({ cardMessage: d.value })}
                />
              </Field>
            </fieldset>
          </Section>

          <Section icon={<People20Regular />} title={t.compose.audienceSection} hint={t.compose.audienceHint}>
            <fieldset className="fields" disabled={!editable}>
              <Field label={t.compose.groupsField}>
                <Dropdown
                  multiselect
                  placeholder={t.compose.groupsPlaceholder}
                  value={audienceText}
                  selectedOptions={form.audienceIds}
                  disabled={!editable}
                  onOptionSelect={(_, d) => update({ audienceIds: d.selectedOptions })}
                >
                  {audienceOptions.map((g) => (
                    <Option key={g.vm_adoptaaudiencegroupid} value={g.vm_adoptaaudiencegroupid} text={groupLabel(g)}>
                      {groupLabel(g)}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <div className="field-when" role="group" aria-label={t.compose.whenLabel}>
                <Field label={t.compose.date}>
                  <Input type="date" value={form.date} onChange={(_, d) => update({ date: d.value })} />
                </Field>
                <Field label={t.compose.hour}>
                  <Select value={form.hour} onChange={(_, d) => update({ hour: d.value })}>
                    {HOURS.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t.compose.minutes}>
                  <Select value={form.minute} onChange={(_, d) => update({ minute: d.value })}>
                    {MINUTES.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </fieldset>
          </Section>
        </div>

        <CardPreview
          agentName={agentName}
          logoUrl={branding.logoUrl}
          title={form.title}
          body={form.body}
          cardMessage={form.cardMessage}
          language={form.language}
        />
      </div>

      {dialogs}
    </div>
  );
}
