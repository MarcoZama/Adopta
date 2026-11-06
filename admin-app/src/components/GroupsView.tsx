import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Radio,
  RadioGroup,
  SearchBox,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
} from "@fluentui/react-components";
import { Add20Regular, ArrowClockwise20Regular, Delete20Regular, Edit20Regular, PeopleTeam20Regular, PeopleTeam24Regular } from "@fluentui/react-icons";
import {
  deleteGroup,
  EMPTY_GROUP,
  GROUP_TYPES,
  GUID,
  listGroups,
  saveGroup,
  setGroupEnabled,
  type GroupForm,
  type GroupRecord,
  type GroupType,
} from "../data/admin";
import { useI18n } from "../i18n";
import { errorMessage, type Notify } from "../lib/notify";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";
import { Section } from "./Section";

interface GroupsViewProps {
  notify: Notify;
}

const typeLabel = (type: GroupType) => GROUP_TYPES.find((g) => g.value === type)?.label() ?? "-";

export function GroupsView({ notify }: GroupsViewProps) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id?: string; form: GroupForm }>();
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<GroupRecord>();
  const [toggling, setToggling] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      setGroups(await listGroups());
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? groups.filter((g) => g.name.toLowerCase().includes(term) || g.entraObjectId.includes(term)) : groups;
  }, [groups, search]);

  const form = editing?.form;
  const nameMissing = !!form && !form.name.trim();
  const idInvalid = !!form && !GUID.test(form.entraObjectId.trim());
  const duplicate =
    !!form && groups.some((g) => g.id !== editing?.id && g.entraObjectId.toLowerCase() === form.entraObjectId.trim().toLowerCase());

  const setField = <K extends keyof GroupForm>(key: K, value: GroupForm[K]) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, [key]: value } } : e));

  const submit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await saveGroup(editing.form, editing.id);
      notify(editing.id ? t.groups.saved : t.groups.added, "success");
      setEditing(undefined);
      await load();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (group: GroupRecord, enabled: boolean) => {
    setToggling(group.id);
    try {
      await setGroupEnabled(group.id, enabled);
      setGroups((list) => list.map((g) => (g.id === group.id ? { ...g, enabled } : g)));
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setToggling(undefined);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setSaving(true);
    try {
      await deleteGroup(toDelete.id);
      notify(t.groups.deleted, "success");
      setToDelete(undefined);
      await load();
    } catch (error) {
      notify(`${errorMessage(error)}${t.groups.deleteFailedHint}`, "error");
      setToDelete(undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="view">
      <PageHeader
        title={t.groups.title}
        description={t.groups.description}
        actions={
          <>
            <Tooltip content={t.common.refresh} relationship="label">
              <Button icon={<ArrowClockwise20Regular className={loading ? "spin" : undefined} />} disabled={loading} onClick={() => void load()} />
            </Tooltip>
            <Button appearance="primary" icon={<Add20Regular />} onClick={() => setEditing({ form: EMPTY_GROUP })}>
              {t.groups.add}
            </Button>
          </>
        }
      />

      {loadError && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>{t.groups.loadError}</MessageBarTitle>
            {loadError}
          </MessageBarBody>
        </MessageBar>
      )}

      <Section
        icon={<PeopleTeam20Regular />}
        title={t.groups.count(groups.length)}
        className="flush"
        tools={groups.length > 6 && <SearchBox placeholder={t.groups.search} value={search} onChange={(_, d) => setSearch(d.value)} />}
      >
        {loading && groups.length === 0 ? (
          <Spinner className="loading" label={t.groups.loading} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<PeopleTeam24Regular />} title={groups.length === 0 ? t.groups.empty : t.common.noResults}>
            {groups.length === 0 ? t.groups.emptyHint : t.groups.noMatch}
          </EmptyState>
        ) : (
          <Table className="table" size="medium" aria-label={t.groups.title}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t.groups.name}</TableHeaderCell>
                <TableHeaderCell className="col-opt col-type">{t.groups.type}</TableHeaderCell>
                <TableHeaderCell className="col-opt col-id">{t.groups.entraId}</TableHeaderCell>
                <TableHeaderCell className="col-switch">{t.groups.enabled}</TableHeaderCell>
                <TableHeaderCell className="col-actions">
                  <span className="sr-only">{t.groups.actions}</span>
                </TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="cell-name">
                      <span>{group.name || t.groups.noName}</span>
                      <Caption1 className="muted cell-sub">{typeLabel(group.type)}</Caption1>
                    </div>
                  </TableCell>
                  <TableCell className="col-opt col-type">{typeLabel(group.type)}</TableCell>
                  <TableCell className="col-opt col-id">
                    <code className="mono">{group.entraObjectId}</code>
                  </TableCell>
                  <TableCell className="col-switch">
                    <Switch
                      aria-label={t.groups.enabledLabel(group.name)}
                      checked={group.enabled}
                      disabled={toggling === group.id}
                      onChange={(_, d) => void toggle(group, d.checked)}
                    />
                  </TableCell>
                  <TableCell className="col-actions">
                    <Tooltip content={t.groups.edit} relationship="label">
                      <Button
                        appearance="subtle"
                        icon={<Edit20Regular />}
                        onClick={() => setEditing({ id: group.id, form: { name: group.name, entraObjectId: group.entraObjectId, type: group.type, enabled: group.enabled } })}
                      />
                    </Tooltip>
                    <Tooltip content={t.common.delete} relationship="label">
                      <Button appearance="subtle" icon={<Delete20Regular />} onClick={() => setToDelete(group)} />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Dialog open={editing !== undefined} onOpenChange={(_, d) => !d.open && !saving && setEditing(undefined)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editing?.id ? t.groups.editTitle : t.groups.add}</DialogTitle>
            <DialogContent>
              {form && (
                <fieldset className="fields" disabled={saving}>
                  <Field label={t.groups.name} required hint={t.groups.nameHint} validationState={nameMissing ? "error" : "none"}>
                    <Input value={form.name} maxLength={200} onChange={(_, d) => setField("name", d.value)} />
                  </Field>
                  <Field
                    label={t.groups.entraId}
                    required
                    hint={t.groups.entraIdHint}
                    validationState={form.entraObjectId.trim() && (idInvalid || duplicate) ? "error" : "none"}
                    validationMessage={
                      !form.entraObjectId.trim()
                        ? undefined
                        : idInvalid
                          ? t.groups.entraIdFormat
                          : duplicate
                            ? t.groups.duplicate
                            : undefined
                    }
                  >
                    <Input
                      className="mono"
                      value={form.entraObjectId}
                      placeholder="00000000-0000-0000-0000-000000000000"
                      onChange={(_, d) => setField("entraObjectId", d.value)}
                    />
                  </Field>
                  <Field label={t.groups.type}>
                    <RadioGroup layout="horizontal" value={String(form.type)} onChange={(_, d) => setField("type", Number(d.value) as GroupType)}>
                      {GROUP_TYPES.map((g) => (
                        <Radio key={g.value} value={String(g.value)} label={g.label()} />
                      ))}
                    </RadioGroup>
                  </Field>
                  <Switch checked={form.enabled} label={t.groups.enabledSwitch} onChange={(_, d) => setField("enabled", d.checked)} />
                </fieldset>
              )}
            </DialogContent>
            <DialogActions>
              <Button disabled={saving} onClick={() => setEditing(undefined)}>
                {t.common.cancel}
              </Button>
              <Button appearance="primary" disabled={saving || nameMissing || idInvalid || duplicate} onClick={() => void submit()}>
                {saving ? t.common.saving : t.common.save}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== undefined}
        title={t.groups.deleteTitle}
        message={t.groups.deleteMessage(toDelete?.name ?? "")}
        confirmLabel={t.common.delete}
        running={saving}
        onConfirm={() => void remove()}
        onDismiss={() => setToDelete(undefined)}
      />
    </div>
  );
}
