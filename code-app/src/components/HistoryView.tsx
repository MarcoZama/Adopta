import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Caption1,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  SearchBox,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowClockwise20Regular,
  DataBarVertical20Regular,
  Dismiss20Regular,
  DocumentSearch20Regular,
  People20Regular,
} from "@fluentui/react-icons";
import { DELIVERY_LIMIT, HISTORY_LIMIT, listDeliveries, listHistory } from "../data/repository";
import { CommunicationStatus, DeliveryStatus, type Communication, type Delivery } from "../data/types";
import { text, useI18n } from "../i18n";
import { addDays, formatDateTime, formatDateTimeSeconds, fromDateInput } from "../lib/format";
import { errorMessage, type Notify } from "../lib/notify";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";
import { Section } from "./Section";
import { CommunicationBadge, DeliveryBadge } from "./StatusBadge";

const ALL = "all";

/** Filter keys (labels in history.statusFilters) and the communication status they select. */
const STATUS_FILTERS: Record<string, number | undefined> = {
  [ALL]: undefined,
  completed: CommunicationStatus.Completed,
  partial: CommunicationStatus.PartiallyFailed,
  failed: CommunicationStatus.Failed,
  processing: CommunicationStatus.Processing,
};

/** Delivery statuses offered as filters, in this order; the label is the status label. */
const DELIVERY_FILTERS: number[] = [
  DeliveryStatus.Sent,
  DeliveryStatus.NotInstalled,
  DeliveryStatus.Unknown,
  DeliveryStatus.Failed,
  DeliveryStatus.Sending,
  DeliveryStatus.Pending,
  DeliveryStatus.Skipped,
];

const deliveryFilterStatus = (value: string) => (value === ALL ? undefined : Number(value));

const count = (value?: number | null) => value ?? "-";

function Stat({ label, value, tone }: { label: string; value?: number | null; tone?: "ok" | "warn" }) {
  return (
    <div className={`stat${tone ? ` stat-${tone}` : ""}`}>
      <span className="stat-value">{count(value)}</span>
      <Caption1 className="muted">{label}</Caption1>
    </div>
  );
}

export function HistoryView({ agentName, notify }: { agentName: string; notify: Notify }) {
  const { t, flowText } = useI18n();
  const [rows, setRows] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [readAt, setReadAt] = useState<Date>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Communication>();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [upnSearch, setUpnSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState(ALL);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery>();

  const fromDate = fromDateInput(from);
  const toDate = fromDateInput(to);
  const invalidRange = !!fromDate && !!toDate && fromDate > toDate;

  const loadHistory = useCallback(async () => {
    const start = fromDateInput(from);
    const end = fromDateInput(to);
    if (start && end && start > end) return;
    setLoading(true);
    setError(undefined);
    setSelected(undefined);
    setSelectedDelivery(undefined);
    try {
      setRows(
        await listHistory({
          status: STATUS_FILTERS[statusFilter],
          from: start,
          // The end date is included: up to the next midnight.
          to: end ? addDays(end, 1) : undefined,
        }),
      );
      setReadAt(new Date());
    } catch (err) {
      // text(), not t: switching language must not reload the history.
      const message = text().history.readFailed(errorMessage(err));
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, from, to, notify]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const loadDeliveries = useCallback(
    async (communication: Communication, filter: string) => {
      setDeliveriesLoading(true);
      setSelectedDelivery(undefined);
      try {
        setDeliveries(await listDeliveries(communication.vm_adoptacommunicationid, deliveryFilterStatus(filter)));
      } catch (err) {
        setDeliveries([]);
        notify(t.history.deliveriesFailed(errorMessage(err)), "error");
      } finally {
        setDeliveriesLoading(false);
      }
    },
    [notify, t],
  );

  const visibleRows = useMemo(() => {
    const prefix = search.trim().toLocaleLowerCase();
    return prefix ? rows.filter((r) => (r.vm_title ?? "").toLocaleLowerCase().startsWith(prefix)) : rows;
  }, [rows, search]);

  const visibleDeliveries = useMemo(() => {
    const prefix = upnSearch.trim().toLocaleLowerCase();
    return prefix ? deliveries.filter((d) => (d.vm_recipientupn ?? "").toLocaleLowerCase().startsWith(prefix)) : deliveries;
  }, [deliveries, upnSearch]);

  const choose = (row: Communication) => {
    setSelected(row);
    setUpnSearch("");
    setDeliveryFilter(ALL);
    void loadDeliveries(row, ALL);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter(ALL);
    setFrom("");
    setTo("");
  };

  const refresh = (
    <>
      <Caption1 className={error ? "error-text" : "muted"}>
        {error ?? (readAt ? t.history.updatedAt(formatDateTimeSeconds(readAt)) : "")}
      </Caption1>
      <Tooltip content={t.history.reload} relationship="label">
        <Button appearance="subtle" icon={<ArrowClockwise20Regular />} disabled={loading} onClick={() => void loadHistory()} />
      </Tooltip>
    </>
  );

  if (!selected) {
    return (
      <div className="page">
        <PageHeader title={t.history.title} description={t.history.description} actions={refresh} />

        <section className="card" aria-label={t.history.region}>
          <div className="table-toolbar filters" role="search" aria-label={t.history.filters}>
            <Field label={t.history.titleFilter} className="filter-search">
              <SearchBox
                placeholder={t.history.startsWith}
                value={search}
                onChange={(_, d) => setSearch(d.value)}
                aria-label={t.history.titleFilterLabel}
              />
            </Field>
            <Field label={t.history.outcome} className="filter-field">
              <Select value={statusFilter} onChange={(_, d) => setStatusFilter(d.value)}>
                {Object.keys(STATUS_FILTERS).map((k) => (
                  <option key={k} value={k}>
                    {t.history.statusFilters[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.history.from} className="filter-field">
              <Input type="date" value={from} onChange={(_, d) => setFrom(d.value)} />
            </Field>
            <Field label={t.history.to} className="filter-field" validationMessage={invalidRange ? t.history.rangeError : undefined}>
              <Input type="date" value={to} onChange={(_, d) => setTo(d.value)} />
            </Field>
            <Button appearance="subtle" icon={<Dismiss20Regular />} className="filter-reset" onClick={resetFilters}>
              {t.history.reset}
            </Button>
          </div>

          {loading ? (
            <Spinner size="small" label={t.history.loading} className="pad" />
          ) : visibleRows.length === 0 ? (
            <EmptyState icon={<DataBarVertical20Regular />} title={t.history.empty}>
              {t.history.emptyHint}
            </EmptyState>
          ) : (
            <Table className="table" aria-label={t.history.table}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>{t.list.title}</TableHeaderCell>
                  <TableHeaderCell className="col-status">{t.history.outcome}</TableHeaderCell>
                  <TableHeaderCell className="col-date col-opt">{t.history.scheduled}</TableHeaderCell>
                  <TableHeaderCell className="col-num col-opt">{t.history.recipients}</TableHeaderCell>
                  <TableHeaderCell className="col-num col-opt">{t.history.sent}</TableHeaderCell>
                  <TableHeaderCell className="col-num col-opt">{t.history.notInstalled}</TableHeaderCell>
                  <TableHeaderCell className="col-num col-opt">{t.history.toCheck}</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.vm_adoptacommunicationid} className="row-link" onClick={() => choose(row)}>
                    <TableCell>
                      <button type="button" className="cell-link">
                        {row.vm_title || t.common.untitled}
                      </button>
                      <span className="cell-sub">{formatDateTime(row.vm_scheduledat)}</span>
                    </TableCell>
                    <TableCell>
                      <CommunicationBadge status={row.vm_communicationstatus} />
                    </TableCell>
                    <TableCell className="col-opt">{formatDateTime(row.vm_scheduledat)}</TableCell>
                    <TableCell className="col-num col-opt">{count(row.vm_recipientcount)}</TableCell>
                    <TableCell className="col-num col-opt">{count(row.vm_sentcount)}</TableCell>
                    <TableCell className={`col-num col-opt${row.vm_notinstalledcount ? " warn-text" : ""}`}>
                      {count(row.vm_notinstalledcount)}
                    </TableCell>
                    <TableCell className={`col-num col-opt${row.vm_failedcount ? " warn-text" : ""}`}>{count(row.vm_failedcount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {rows.length >= HISTORY_LIMIT && <Caption1 className="muted pad">{t.history.limit(HISTORY_LIMIT)}</Caption1>}
        </section>
      </div>
    );
  }

  const recipientName = (d: Delivery) => d.vm_recipientupn || d.vm_recipientobject || t.history.unknownRecipient;
  const deliveryStatus = selectedDelivery?.vm_deliverystatus ?? -1;
  const diagnostic = !selectedDelivery
    ? flowText(selected.vm_lasterror || "") || t.history.noCommunicationError
    : `${t.history.technicalStatus}: ${t.deliveryStatus[deliveryStatus] ?? t.unrecognizedStatus}\n` +
      (deliveryStatus === DeliveryStatus.NotInstalled ? `${t.history.notInstalledExplanation}\n` : "") +
      `Object ID: ${selectedDelivery.vm_recipientobject ?? "-"}\n` +
      (flowText(selectedDelivery.vm_lasterror || "") || t.history.noDeliveryError);
  const notInstalled = selected.vm_notinstalledcount ?? 0;

  return (
    <div className="page">
      <PageHeader
        back={{ label: t.history.title, onClick: () => setSelected(undefined) }}
        title={selected.vm_title || t.common.untitled}
        badge={<CommunicationBadge status={selected.vm_communicationstatus} />}
        description={t.history.timeline(
          formatDateTime(selected.vm_scheduledat),
          formatDateTime(selected.vm_startedat),
          formatDateTime(selected.vm_completedat),
        )}
      />

      <div className="stats">
        <Stat label={t.history.resolved} value={selected.vm_recipientcount} />
        <Stat label={t.history.statSent} value={selected.vm_sentcount} tone="ok" />
        <Stat label={t.history.statNotInstalled} value={selected.vm_notinstalledcount} tone="warn" />
        <Stat label={t.history.statToCheck} value={selected.vm_failedcount} tone="warn" />
      </div>
      <Caption1 className="muted stats-note">{t.history.statsNote}</Caption1>

      {notInstalled > 0 && (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>{t.history.notInstalledTitle(notInstalled)}</MessageBarTitle>
            {t.history.notInstalledBody(agentName)}
          </MessageBarBody>
        </MessageBar>
      )}

      <div className="detail-grid">
        <Section
          icon={<People20Regular />}
          title={t.history.recipientsSection}
          hint={deliveriesLoading ? t.common.loading : t.history.outcomes(visibleDeliveries.length)}
          tools={
            <>
              <SearchBox
                size="small"
                placeholder={t.history.upnFilter}
                value={upnSearch}
                onChange={(_, d) => setUpnSearch(d.value)}
                aria-label={t.history.upnFilterLabel}
              />
              <Select
                size="small"
                aria-label={t.history.outcomeFilterLabel}
                value={deliveryFilter}
                onChange={(_, d) => {
                  setDeliveryFilter(d.value);
                  void loadDeliveries(selected, d.value);
                }}
              >
                <option value={ALL}>{t.history.allOutcomes}</option>
                {DELIVERY_FILTERS.map((s) => (
                  <option key={s} value={String(s)}>
                    {t.deliveryStatus[s]}
                  </option>
                ))}
              </Select>
            </>
          }
        >
          {deliveriesLoading ? (
            <Spinner size="small" label={t.history.loadingDeliveries} className="pad" />
          ) : visibleDeliveries.length === 0 ? (
            <Caption1 className="muted pad">{t.history.noLogs}</Caption1>
          ) : (
            <div className="table-scroll">
              <Table className="table" size="small" aria-label={t.history.deliveriesTable}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>{t.history.recipient}</TableHeaderCell>
                    <TableHeaderCell className="col-status">{t.history.outcome}</TableHeaderCell>
                    <TableHeaderCell className="col-date col-opt">{t.history.sentAt}</TableHeaderCell>
                    <TableHeaderCell className="col-num-sm col-opt">{t.history.attempts}</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDeliveries.map((d) => {
                    const isSelected = d.vm_adoptadeliveryid === selectedDelivery?.vm_adoptadeliveryid;
                    return (
                      <TableRow
                        key={d.vm_adoptadeliveryid}
                        className="row-link"
                        appearance={isSelected ? "brand" : "none"}
                        aria-selected={isSelected}
                        onClick={() => setSelectedDelivery(isSelected ? undefined : d)}
                      >
                        <TableCell>
                          <button type="button" className="cell-link">
                            {recipientName(d)}
                          </button>
                        </TableCell>
                        <TableCell>
                          <DeliveryBadge status={d.vm_deliverystatus} />
                        </TableCell>
                        <TableCell className="col-opt">{formatDateTimeSeconds(d.vm_sentat)}</TableCell>
                        <TableCell className="col-num-sm col-opt">{count(d.vm_attempts)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {deliveries.length >= DELIVERY_LIMIT && <Caption1 className="muted pad">{t.history.deliveryLimit(DELIVERY_LIMIT)}</Caption1>}
        </Section>

        <Section
          className="diagnostic"
          icon={<DocumentSearch20Regular />}
          title={t.history.diagnostic}
          hint={selectedDelivery ? recipientName(selectedDelivery) : t.history.diagnosticHint}
        >
          <pre aria-label={t.history.diagnosticLabel}>{diagnostic}</pre>
        </Section>
      </div>
    </div>
  );
}
