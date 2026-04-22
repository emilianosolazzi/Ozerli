import { useQuery } from "@tanstack/react-query";
import { paidTierEnabled } from "./features";

export type OzerliTier = "oss" | "paid";

export interface OzerliCapabilities {
  tier: OzerliTier;
  features: {
    advancedAnalytics: boolean;
    riskAutomation: boolean;
    slaWorkflows: boolean;
  };
}

export const fallbackCapabilities: OzerliCapabilities = {
  tier: paidTierEnabled ? "paid" : "oss",
  features: {
    advancedAnalytics: paidTierEnabled,
    riskAutomation: paidTierEnabled,
    slaWorkflows: paidTierEnabled,
  },
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

  if (
    typeof features.advancedAnalytics !== "boolean" ||
    typeof features.riskAutomation !== "boolean" ||
    typeof features.slaWorkflows !== "boolean"
  ) {
    return null;
  }

  return {
    tier: value.tier,
    features: {
      advancedAnalytics: features.advancedAnalytics,
      riskAutomation: features.riskAutomation,
      slaWorkflows: features.slaWorkflows,
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