import { Badge, type BadgeProps } from "@fluentui/react-components";
import { CommunicationStatus, DeliveryStatus } from "../data/types";
import { useI18n } from "../i18n";

type BadgeColor = NonNullable<BadgeProps["color"]>;

const communicationColor: Record<number, BadgeColor> = {
  [CommunicationStatus.Draft]: "informative",
  [CommunicationStatus.Scheduled]: "brand",
  [CommunicationStatus.Processing]: "warning",
  [CommunicationStatus.Completed]: "success",
  [CommunicationStatus.PartiallyFailed]: "severe",
  [CommunicationStatus.Failed]: "danger",
  [CommunicationStatus.Cancelled]: "subtle",
};

const deliveryColor: Record<number, BadgeColor> = {
  [DeliveryStatus.Pending]: "informative",
  [DeliveryStatus.Sending]: "brand",
  [DeliveryStatus.Sent]: "success",
  [DeliveryStatus.Failed]: "danger",
  [DeliveryStatus.Unknown]: "warning",
  [DeliveryStatus.Skipped]: "subtle",
  [DeliveryStatus.NotInstalled]: "severe",
};

export function CommunicationBadge({ status }: { status?: number | null }) {
  const { t } = useI18n();
  const value = status ?? -1;
  return (
    <Badge appearance="tint" shape="rounded" color={communicationColor[value] ?? "subtle"}>
      {t.communicationStatus[value] ?? t.unknownStatus}
    </Badge>
  );
}

export function DeliveryBadge({ status }: { status?: number | null }) {
  const { t } = useI18n();
  const value = status ?? -1;
  return (
    <Badge appearance="tint" shape="rounded" color={deliveryColor[value] ?? "subtle"}>
      {t.deliveryStatus[value] ?? t.unrecognizedStatus}
    </Badge>
  );
}
