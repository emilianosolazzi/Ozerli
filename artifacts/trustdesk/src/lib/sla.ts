import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SlaTargetsHours = Record<TicketPriority, number>;

export interface SlaOverviewResponse {
  targetsHours: SlaTargetsHours;
  totals: {
    activeTickets: number;
    breachedTickets: number;
    atRiskTickets: number;
    onTrackTickets: number;
  };
  sample: Array<{
    id: string;
    status: string;
    priority: TicketPriority;
    elapsedMinutes: number;
    targetMinutes: number;
    remainingMinutes: number;
    state: "BREACHED" | "AT_RISK" | "ON_TRACK";
    updatedAt: string;
  }>;
}

async function getSlaOverview(): Promise<SlaOverviewResponse> {
  const response = await fetch("/api/dashboard/sla-overview");
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to load SLA overview.");
  }

  return response.json() as Promise<SlaOverviewResponse>;
}

async function patchSlaTargets(
  targetsHours: Partial<SlaTargetsHours>,
): Promise<{ ok: true; targetsHours: SlaTargetsHours }> {
  const response = await fetch("/api/dashboard/sla-targets", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(targetsHours),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to update SLA targets.");
  }

  return response.json() as Promise<{ ok: true; targetsHours: SlaTargetsHours }>;
}

export function useSlaOverview(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "sla-overview"],
    queryFn: getSlaOverview,
    enabled,
  });
}

export function useUpdateSlaTargets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchSlaTargets,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "sla-overview"] });
    },
  });
}