import type { IOperationResult } from "@microsoft/power-apps/data";
import {
  audienceGroups,
  communicationGroups,
  communications,
  deliveries,
  manageFlow,
  manageInput,
  scheduleFlow,
  scheduleInput,
  settings,
  type QueryOptions,
  type TableService,
} from "./generated";
import { text, toLanguage } from "../i18n";
import {
  CommunicationStatus,
  type AudienceGroup,
  type Branding,
  type Communication,
  type CommunicationGroup,
  type Delivery,
  type DraftInput,
  type FlowResponse,
  type ManageOperation,
} from "./types";

export const DEFAULT_APP_TITLE = "Adopta Communications";
export const DEFAULT_AGENT_NAME = "Adopta";
export const NO_COMMUNICATION_ID = "00000000-0000-0000-0000-000000000000";

export const HISTORY_LIMIT = 500;
export const DELIVERY_LIMIT = 5000;

const COMMUNICATION_COLUMNS = [
  "vm_adoptacommunicationid",
  "vm_title",
  "vm_body",
  "vm_link",
  "vm_cardmessage",
  "vm_language",
  "vm_scheduledat",
  "vm_communicationstatus",
  "vm_startedat",
  "vm_completedat",
  "vm_recipientcount",
  "vm_sentcount",
  "vm_failedcount",
  "vm_notinstalledcount",
  "vm_lasterror",
  "createdon",
];

function check<T>(result: IOperationResult<T>, action: string): T {
  if (!result.success) {
    throw new Error(`${action}: ${result.error?.message ?? text().common.unknownError}`);
  }
  return result.data;
}

/** Reads every page up to `limit` rows. */
async function readAll<T>(service: TableService, options: QueryOptions, limit: number, action: string): Promise<T[]> {
  const rows: T[] = [];
  let skipToken: string | undefined;
  do {
    const result = await service.getAll({ ...options, maxPageSize: 500, skipToken });
    rows.push(...(check(result, action) as T[]));
    skipToken = result.skipToken;
  } while (skipToken && rows.length < limit);
  return rows.slice(0, limit);
}

export async function listCommunications(): Promise<Communication[]> {
  const result = await communications().getAll({
    select: COMMUNICATION_COLUMNS,
    orderBy: ["createdon desc"],
    top: HISTORY_LIMIT,
  });
  return check(result, text().repository.readCommunications) as Communication[];
}

export async function getCommunication(id: string): Promise<Communication> {
  const result = await communications().get(id, { select: COMMUNICATION_COLUMNS });
  return check(result, text().repository.readCommunication) as Communication;
}

/** Active groups, enabled or not: a draft can still reference a group the admin disabled later. */
export async function listAudienceGroups(): Promise<AudienceGroup[]> {
  const result = await audienceGroups().getAll({
    select: ["vm_adoptaaudiencegroupid", "vm_name", "vm_enabled"],
    filter: "statecode eq 0",
    orderBy: ["vm_name asc"],
  });
  return check(result, text().repository.readAudienceGroups) as AudienceGroup[];
}

async function listCommunicationGroups(communicationId: string): Promise<CommunicationGroup[]> {
  const result = await communicationGroups().getAll({
    select: ["vm_adoptacommunicationgroupid", "_vm_audiencegroup_value"],
    filter: `_vm_communication_value eq ${communicationId}`,
  });
  return check(result, text().repository.readCommunicationGroups) as CommunicationGroup[];
}

export async function getAudienceIds(communicationId: string): Promise<string[]> {
  const rows = await listCommunicationGroups(communicationId);
  return rows.map((row) => row._vm_audiencegroup_value ?? "").filter(Boolean);
}

/**
 * Saves the draft fields and returns its ID. Nothing is sent: delivery starts only after
 * scheduling, when the dispatcher flow picks the communication up.
 */
export async function saveCommunication(draft: DraftInput, existingId?: string): Promise<string> {
  const title = draft.title.trim();
  const record: Record<string, unknown> = {
    vm_name: title.slice(0, 100),
    vm_title: title,
    vm_body: draft.body,
    vm_link: draft.link.trim() || null,
    vm_cardmessage: draft.cardMessage.trim() || null,
    vm_language: draft.language,
    vm_scheduledat: draft.scheduledAt.toISOString(),
    vm_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Device local time",
    vm_communicationstatus: CommunicationStatus.Draft,
  };

  if (existingId) {
    check(await communications().update(existingId, record), text().repository.saveDraft);
    return existingId;
  }
  const created = check(await communications().create(record), text().repository.createDraft) as Communication;
  return created.vm_adoptacommunicationid;
}

/** Aligns the recipient groups of a communication with the selected ones. */
export async function syncAudience(id: string, audienceIds: string[], groups: AudienceGroup[]): Promise<void> {
  const current = await listCommunicationGroups(id);
  const wanted = new Set(audienceIds);
  const kept = new Set<string>();
  for (const row of current) {
    const groupId = row._vm_audiencegroup_value ?? "";
    if (wanted.has(groupId) && !kept.has(groupId)) {
      kept.add(groupId);
    } else {
      check(await communicationGroups().delete(row.vm_adoptacommunicationgroupid), text().repository.removeGroup);
    }
  }
  for (const groupId of audienceIds) {
    if (kept.has(groupId)) continue;
    const name = groups.find((g) => g.vm_adoptaaudiencegroupid === groupId)?.vm_name ?? "";
    check(
      await communicationGroups().create({
        vm_name: name.slice(0, 100),
        "vm_Communication@odata.bind": `/vm_adoptacommunications(${id})`,
        "vm_AudienceGroup@odata.bind": `/vm_adoptaaudiencegroups(${groupId})`,
      }),
      text().repository.linkGroup,
    );
  }
}

function flowResponse(result: IOperationResult<unknown>, action: string): FlowResponse {
  const data = check(result, action) as Partial<FlowResponse> | undefined;
  return {
    success: data?.success === true,
    message: data?.message ?? text().repository.noFlowMessage,
    sendingenabled: data?.sendingenabled,
    settingknown: data?.settingknown,
  };
}

export async function scheduleCommunication(id: string): Promise<FlowResponse> {
  return flowResponse(await scheduleFlow().Run(scheduleInput(id)), text().repository.schedule);
}

export async function manageCommunication(id: string, operation: ManageOperation): Promise<FlowResponse> {
  return flowResponse(await manageFlow().Run(manageInput(id, operation)), text().repository.operation);
}

export interface HistoryFilter {
  status?: number;
  from?: Date;
  to?: Date;
}

const HISTORY_STATUSES = [
  CommunicationStatus.Processing,
  CommunicationStatus.Completed,
  CommunicationStatus.PartiallyFailed,
  CommunicationStatus.Failed,
];

export async function listHistory(filter: HistoryFilter): Promise<Communication[]> {
  const statuses = filter.status !== undefined ? [filter.status] : HISTORY_STATUSES;
  const clauses = [`(${statuses.map((s) => `vm_communicationstatus eq ${s}`).join(" or ")})`];
  if (filter.from) clauses.push(`vm_scheduledat ge ${filter.from.toISOString()}`);
  if (filter.to) clauses.push(`vm_scheduledat lt ${filter.to.toISOString()}`);
  return readAll<Communication>(
    communications(),
    { select: COMMUNICATION_COLUMNS, filter: clauses.join(" and "), orderBy: ["vm_scheduledat desc"] },
    HISTORY_LIMIT,
    text().repository.readHistory,
  );
}

export async function listDeliveries(communicationId: string, status?: number): Promise<Delivery[]> {
  const clauses = [`_vm_communication_value eq ${communicationId}`];
  if (status !== undefined) clauses.push(`vm_deliverystatus eq ${status}`);
  const rows = await readAll<Delivery>(
    deliveries(),
    {
      select: [
        "vm_adoptadeliveryid",
        "vm_recipientupn",
        "vm_recipientobject",
        "vm_deliverystatus",
        "vm_sentat",
        "vm_attempts",
        "vm_lasterror",
      ],
      filter: clauses.join(" and "),
    },
    DELIVERY_LIMIT,
    text().repository.readDeliveries,
  );
  // Recipient UPN is a multiline column: sorted here, not in the query.
  return rows.sort((a, b) => (a.vm_recipientupn ?? "").localeCompare(b.vm_recipientupn ?? ""));
}

function imageType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  return "application/octet-stream";
}

/** Branding saved by the admin in Adopta Admin: first active record by creation date, like the agent. */
export async function loadBranding(): Promise<Branding> {
  const service = settings();
  const rows = check(
    await service.getAll({
      select: ["vm_adoptasettingid", "vm_apptitle", "vm_agentname", "vm_defaultlanguage"],
      filter: "statecode eq 0",
      orderBy: ["createdon asc"],
      top: 1,
    }),
    text().repository.readSettings,
  ) as {
    vm_adoptasettingid: string;
    vm_apptitle?: string | null;
    vm_agentname?: string | null;
    vm_defaultlanguage?: string | null;
  }[];

  const row = rows[0];
  const branding: Branding = {
    appTitle: row?.vm_apptitle?.trim() || DEFAULT_APP_TITLE,
    agentName: row?.vm_agentname?.trim() || DEFAULT_AGENT_NAME,
    defaultLanguage: toLanguage(row?.vm_defaultlanguage),
  };
  if (row && service.downloadImage) {
    try {
      const image = await service.downloadImage(row.vm_adoptasettingid, "vm_logo", true);
      if (image.success && image.data?.length) {
        const bytes = new Uint8Array(image.data);
        branding.logoUrl = URL.createObjectURL(new Blob([bytes], { type: imageType(bytes) }));
      }
    } catch {
      // No logo uploaded: the header shows the title only.
    }
  }
  return branding;
}
