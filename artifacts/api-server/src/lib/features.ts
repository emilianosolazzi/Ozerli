export type OzerliTier = "oss" | "paid";

export interface OzerliFeatureFlags {
  advancedAnalytics: boolean;
  aiAutomation: boolean;
  slaWorkflows: boolean;
  complianceControls: boolean;
  usageMetering: boolean;
  /** @deprecated retained for backwards compatibility; mirrors slaWorkflows */
  riskAutomation: boolean;
}

export interface OzerliCapabilities {
  tier: OzerliTier;
  features: OzerliFeatureFlags;
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
      aiAutomation: paid,
      slaWorkflows: paid,
      complianceControls: paid,
      usageMetering: paid,
      riskAutomation: paid,
    },
  };
}