export type OzerliTier = "oss" | "paid";

export interface OzerliCapabilities {
  tier: OzerliTier;
  features: {
    advancedAnalytics: boolean;
    riskAutomation: boolean;
    slaWorkflows: boolean;
  };
}

function normalizeTier(value: string | undefined): OzerliTier {
  if (value?.trim().toLowerCase() === "paid") {
    return "paid";
  }
  return "oss";
}

function resolveTierEnvValue(): string | undefined {
  // Keep legacy env support so existing deployments continue to work.
  return process.env.OZERLI_TIER ?? process.env.TRUSTDESK_TIER;
}

export function getOzerliTier(): OzerliTier {
  return normalizeTier(resolveTierEnvValue());
}

export function isPaidTierEnabled(): boolean {
  return getOzerliTier() === "paid";
}

export function getOzerliCapabilities(): OzerliCapabilities {
  const tier = getOzerliTier();
  const paid = tier === "paid";

  return {
    tier,
    features: {
      advancedAnalytics: paid,
      riskAutomation: paid,
      slaWorkflows: paid,
    },
  };
}