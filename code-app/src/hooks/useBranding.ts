import { useEffect, useState } from "react";
import { DEFAULT_AGENT_NAME, DEFAULT_APP_TITLE, loadBranding } from "../data/repository";
import type { Branding } from "../data/types";
import { errorMessage } from "../lib/notify";

export function useBranding() {
  const [branding, setBranding] = useState<Branding>({ appTitle: DEFAULT_APP_TITLE, agentName: DEFAULT_AGENT_NAME });
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    let logoUrl: string | undefined;
    loadBranding()
      .then((value) => {
        logoUrl = value.logoUrl;
        if (cancelled) {
          if (logoUrl) URL.revokeObjectURL(logoUrl);
          return;
        }
        setBranding(value);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, []);

  useEffect(() => {
    document.title = branding.appTitle;
  }, [branding.appTitle]);

  return { branding, error };
}
