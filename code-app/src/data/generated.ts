import { dataSourcesInfo } from "../../.power/schemas/appschemas/dataSourcesInfo";
import { services } from "../../../shared/power-apps";
export type { IOperationOptions as QueryOptions } from "@microsoft/power-apps/data";
export type { TableService, FlowService } from "../../../shared/power-apps";

const bound = services(dataSourcesInfo);
export const communications = bound.table("vm_adoptacommunications");
export const communicationGroups = bound.table("vm_adoptacommunicationgroups");
export const audienceGroups = bound.table("vm_adoptaaudiencegroups");
export const deliveries = bound.table("vm_adoptadeliveries");
export const settings = bound.table("vm_adoptasettings");
export const scheduleFlow = bound.flow("schedulecommunication");
export const manageFlow = bound.flow("managecommunication");

export function scheduleInput(communicationId: string): Record<string, unknown> {
  return { text: communicationId };
}

export function manageInput(communicationId: string, operation: string): Record<string, unknown> {
  return { text: communicationId, text_1: operation };
}
