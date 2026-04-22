export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SlaTargetsHours = Record<TicketPriority, number>;

const MIN_TARGET_HOURS = 1;
const MAX_TARGET_HOURS = 168;

const DEFAULT_SLA_TARGETS_HOURS: SlaTargetsHours = {
  LOW: 24,
  NORMAL: 8,
  HIGH: 2,
  URGENT: 1,
};

let currentSlaTargetsHours: SlaTargetsHours = { ...DEFAULT_SLA_TARGETS_HOURS };

export function getSlaTargetsHours(): SlaTargetsHours {
  return { ...currentSlaTargetsHours };
}

function normalizePriority(value: string): TicketPriority {
  const normalized = value.toUpperCase() as TicketPriority;

  if (normalized in currentSlaTargetsHours) {
    return normalized;
  }

  return "NORMAL";
}

export function getSlaTargetMinutes(priority: TicketPriority | string): number {
  return currentSlaTargetsHours[normalizePriority(priority)] * 60;
}

export function updateSlaTargetsHours(
  patch: Partial<Record<TicketPriority, number>>,
): SlaTargetsHours {
  currentSlaTargetsHours = {
    ...currentSlaTargetsHours,
    ...patch,
  };

  return getSlaTargetsHours();
}

export function validateSlaTargetsPatch(
  input: unknown,
): { ok: true; patch: Partial<Record<TicketPriority, number>> } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Body must be an object with priority keys." };
  }

  const patch: Partial<Record<TicketPriority, number>> = {};
  const allowedPriorities = new Set<TicketPriority>(["LOW", "NORMAL", "HIGH", "URGENT"]);

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = rawKey.toUpperCase() as TicketPriority;

    if (!allowedPriorities.has(key)) {
      return { ok: false, error: `Unsupported priority key: ${rawKey}` };
    }

    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
      return { ok: false, error: `Target for ${rawKey} must be a finite number.` };
    }

    if (rawValue < MIN_TARGET_HOURS || rawValue > MAX_TARGET_HOURS) {
      return {
        ok: false,
        error: `Target for ${rawKey} must be between ${MIN_TARGET_HOURS} and ${MAX_TARGET_HOURS} hours.`,
      };
    }

    patch[key] = Math.round(rawValue);
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "At least one SLA target must be provided." };
  }

  return { ok: true, patch };
}