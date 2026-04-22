export type OzerliTier = "oss" | "paid";

function normalizeTier(value: string | undefined): OzerliTier {
  if (value?.trim().toLowerCase() === "paid") {
    return "paid";
  }
  return "oss";
}

function resolveTierEnvValue(): string | undefined {
  return import.meta.env.VITE_OZERLI_TIER ?? import.meta.env.VITE_TRUSTDESK_TIER;
}

export const ozerliTier = normalizeTier(resolveTierEnvValue());
export const paidTierEnabled = ozerliTier === "paid";

export const featureFlags = {
  advancedAnalytics: paidTierEnabled,
  riskAutomation: paidTierEnabled,
  slaWorkflows: paidTierEnabled,
} as const;