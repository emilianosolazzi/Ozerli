import { useQuery } from "@tanstack/react-query";
import { paidTierEnabled } from "./features";

export type OzerliTier = "oss" | "paid";

export interface OzerliFeatureFlags {
  advancedAnalytics: boolean;
  aiAutomation: boolean;
  slaWorkflows: boolean;
  complianceControls: boolean;
  usageMetering: boolean;
  /** @deprecated retained for backwards compatibility with older API builds */
  riskAutomation: boolean;
}

export interface OzerliCapabilities {
  tier: OzerliTier;
  features: OzerliFeatureFlags;
}

function buildFallbackFeatures(paid: boolean): OzerliFeatureFlags {
  return {
    advancedAnalytics: paid,
    aiAutomation: paid,
    slaWorkflows: paid,
    complianceControls: paid,
    usageMetering: paid,
    riskAutomation: paid,
  };
}

export const fallbackCapabilities: OzerliCapabilities = {
  tier: paidTierEnabled ? "paid" : "oss",
  features: buildFallbackFeatures(paidTierEnabled),
};

function parseCapabilities(input: unknown): OzerliCapabilities | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const value = input as Record<string, unknown>;
  if (value.tier !== "oss" && value.tier !== "paid") {
    return null;
  }

  const features = value.features as Record<string, unknown> | undefined;
  if (!features) {
    return null;
  }

  const paid = value.tier === "paid";
  const coerce = (key: string, fallback: boolean): boolean =>
    typeof features[key] === "boolean" ? (features[key] as boolean) : fallback;

  // Required core flag for forward-compat: if advancedAnalytics is missing we
  // still accept the payload but derive defaults from the tier.
  if (typeof features.advancedAnalytics !== "boolean" && typeof features.slaWorkflows !== "boolean") {
    return null;
  }

  return {
    tier: value.tier,
    features: {
      advancedAnalytics: coerce("advancedAnalytics", paid),
      aiAutomation: coerce("aiAutomation", paid),
      slaWorkflows: coerce("slaWorkflows", paid),
      complianceControls: coerce("complianceControls", paid),
      usageMetering: coerce("usageMetering", paid),
      riskAutomation: coerce("riskAutomation", paid),
    },
  };
}

async function fetchCapabilities(): Promise<OzerliCapabilities> {
  try {
    const response = await fetch("/api/features/capabilities");
    if (!response.ok) {
      return fallbackCapabilities;
    }

    const payload = (await response.json()) as unknown;
    return parseCapabilities(payload) ?? fallbackCapabilities;
  } catch {
    return fallbackCapabilities;
  }
}

export function useCapabilities() {
  return useQuery({
    queryKey: ["ozerli", "capabilities"],
    queryFn: fetchCapabilities,
    initialData: fallbackCapabilities,
    staleTime: 60 * 1000,
  });
}