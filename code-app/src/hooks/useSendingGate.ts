import { useCallback, useEffect, useState } from "react";
import { manageCommunication, NO_COMMUNICATION_ID } from "../data/repository";
import { flowText, text } from "../i18n";
import { errorMessage, type Notify } from "../lib/notify";

export type GateAction = "enable" | "disable";

/** Global sending flag (Sending enabled in Adopta Setting), read and written through AdoptaManageCommunication. */
export function useSendingGate(notify: Notify) {
  const [known, setKnown] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [readAt, setReadAt] = useState<Date>();
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setKnown(false);
    try {
      const result = await manageCommunication(NO_COMMUNICATION_ID, "status");
      setKnown(result.success && result.settingknown === true);
      setEnabled(result.sendingenabled === true);
      setReadAt(new Date());
      if (!result.success) notify(flowText(result.message), "error");
    } catch (err) {
      setKnown(false);
      notify(text().sidebar.gateReadFailed(errorMessage(err)), "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const apply = useCallback(
    async (action: GateAction) => {
      setLoading(true);
      try {
        const result = await manageCommunication(NO_COMMUNICATION_ID, action);
        setKnown(result.settingknown === true);
        setEnabled(result.sendingenabled === true);
        setReadAt(new Date());
        notify(flowText(result.message), result.success ? "success" : "error");
      } catch (err) {
        setKnown(false);
        notify(text().operationNotConfirmed(errorMessage(err)), "error");
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { known, enabled, readAt, loading, refresh, apply };
}

export type SendingGate = ReturnType<typeof useSendingGate>;
