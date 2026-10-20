import { useEffect, useState } from "react";

export type AppConfig = { minDeposit: number; minWithdrawal: number };

// Limits are set by the admin; fall back to defaults until loaded / if offline
export function useAppConfig(): AppConfig {
  const [cfg, setCfg] = useState<AppConfig>({ minDeposit: 200, minWithdrawal: 500 });
  useEffect(() => {
    fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/app-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.minDeposit && j?.minWithdrawal) setCfg(j); })
      .catch(() => {});
  }, []);
  return cfg;
}
