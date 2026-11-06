import { useMemo } from "react";
import {
  SearchBox,
  Spinner,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@fluentui/react-components";
import { DocumentEdit20Regular } from "@fluentui/react-icons";
import { CommunicationStatus, type Communication } from "../data/types";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/format";
import { EmptyState } from "./EmptyState";
import { CommunicationBadge } from "./StatusBadge";

export const FILTERS: { key: string; statuses?: number[] }[] = [
  { key: "all" },
  { key: "draft", statuses: [CommunicationStatus.Draft] },
  { key: "scheduled", statuses: [CommunicationStatus.Scheduled] },
  {
    key: "sent",
    statuses: [
      CommunicationStatus.Processing,
      CommunicationStatus.Completed,
      CommunicationStatus.PartiallyFailed,
      CommunicationStatus.Failed,
    ],
  },
  { key: "cancelled", statuses: [CommunicationStatus.Cancelled] },
];

const matches = (item: Communication, statuses?: number[]) =>
  !statuses || statuses.includes(item.vm_communicationstatus ?? -1);

interface CommunicationListProps {
  items: Communication[];
  loading: boolean;
  busy: boolean;
  filter: string;
  search: string;
  onFilter: (key: string) => void;
  onSearch: (text: string) => void;
  onOpen: (item: Communication) => void;
}

export function CommunicationList({ items, loading, busy, filter, search, onFilter, onSearch, onOpen }: CommunicationListProps) {
  const { t } = useI18n();
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, items.filter((item) => matches(item, f.statuses)).length])),
    [items],
  );

  const visible = useMemo(() => {
    const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
    const text = search.trim().toLocaleLowerCase();
    return items.filter(
      (item) => matches(item, statuses) && (!text || (item.vm_title ?? "").toLocaleLowerCase().includes(text)),
    );
  }, [items, filter, search]);

  return (
    <section className="card" aria-label={t.list.region}>
      <div className="table-toolbar">
        <div className="tabs-scroll">
          <TabList size="small" selectedValue={filter} onTabSelect={(_, d) => onFilter(String(d.value))} aria-label={t.list.filterBy}>
            {FILTERS.map((f) => (
              <Tab key={f.key} value={f.key}>
                {t.list.filters[f.key]}
                <span className="tab-count">{counts[f.key]}</span>
              </Tab>
            ))}
          </TabList>
        </div>
        <SearchBox
          className="table-search"
          placeholder={t.list.search}
          value={search}
          onChange={(_, d) => onSearch(d.value)}
          aria-label={t.list.searchLabel}
        />
      </div>

      {loading ? (
        <Spinner size="small" label={t.common.loading} className="pad" />
      ) : visible.length === 0 ? (
        <EmptyState icon={<DocumentEdit20Regular />} title={items.length ? t.list.noResults : t.list.empty}>
          {items.length ? t.list.noResultsHint : t.list.emptyHint}
        </EmptyState>
      ) : (
        <Table className="table" aria-label={t.list.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t.list.title}</TableHeaderCell>
              <TableHeaderCell className="col-status">{t.list.status}</TableHeaderCell>
              <TableHeaderCell className="col-date col-opt">{t.list.scheduled}</TableHeaderCell>
              <TableHeaderCell className="col-date col-opt">{t.list.created}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((item) => (
              <TableRow key={item.vm_adoptacommunicationid} className="row-link" onClick={() => !busy && onOpen(item)}>
                <TableCell>
                  <button type="button" className="cell-link" disabled={busy}>
                    {item.vm_title || t.common.untitled}
                  </button>
                  <span className="cell-sub">{formatDateTime(item.vm_scheduledat, t.list.dateNotSet)}</span>
                </TableCell>
                <TableCell>
                  <CommunicationBadge status={item.vm_communicationstatus} />
                </TableCell>
                <TableCell className="col-opt">{formatDateTime(item.vm_scheduledat, t.list.notSet)}</TableCell>
                <TableCell className="col-opt muted">{formatDateTime(item.createdon)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
