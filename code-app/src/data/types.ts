// Option values of the Dataverse choices (see src/Entities in the solution).
export const CommunicationStatus = {
  Draft: 100000000,
  Scheduled: 100000001,
  Processing: 100000002,
  Completed: 100000003,
  PartiallyFailed: 100000004,
  Failed: 100000005,
  Cancelled: 100000006,
} as const;

export const DeliveryStatus = {
  Pending: 100000000,
  Sending: 100000001,
  Sent: 100000002,
  Failed: 100000003,
  Unknown: 100000004,
  Skipped: 100000005,
  /** Teams refused the card: the agent is not installed for the recipient. */
  NotInstalled: 100000006,
} as const;

/** Language of a communication (vm_language) and of the apps: empty or unknown means Italian. */
export type CardLanguage = "it" | "en";

export interface Communication {
  vm_adoptacommunicationid: string;
  vm_title?: string | null;
  vm_body?: string | null;
  vm_link?: string | null;
  vm_cardmessage?: string | null;
  vm_language?: string | null;
  vm_scheduledat?: string | null;
  vm_communicationstatus?: number | null;
  vm_startedat?: string | null;
  vm_completedat?: string | null;
  vm_recipientcount?: number | null;
  vm_sentcount?: number | null;
  vm_failedcount?: number | null;
  vm_notinstalledcount?: number | null;
  vm_lasterror?: string | null;
  createdon?: string | null;
}

export interface AudienceGroup {
  vm_adoptaaudiencegroupid: string;
  vm_name?: string | null;
  vm_enabled?: boolean | null;
}

export interface CommunicationGroup {
  vm_adoptacommunicationgroupid: string;
  _vm_audiencegroup_value?: string | null;
}

export interface Delivery {
  vm_adoptadeliveryid: string;
  vm_recipientupn?: string | null;
  vm_recipientobject?: string | null;
  vm_deliverystatus?: number | null;
  vm_sentat?: string | null;
  vm_attempts?: number | null;
  vm_lasterror?: string | null;
}

export interface Branding {
  appTitle: string;
  agentName: string;
  logoUrl?: string;
  /** vm_defaultlanguage of Adopta Setting, when set. */
  defaultLanguage?: CardLanguage;
}

/** Response of AdoptaScheduleCommunication and AdoptaManageCommunication. */
export interface FlowResponse {
  success: boolean;
  message: string;
  sendingenabled?: boolean;
  settingknown?: boolean;
}

export type ManageOperation = "status" | "enable" | "disable" | "delete" | "cancel";

export interface DraftInput {
  title: string;
  body: string;
  link: string;
  cardMessage: string;
  language: CardLanguage;
  scheduledAt: Date;
}
