import { desc, sql } from "drizzle-orm";
import { db, staffActionsTable, riskEventsTable, ticketsTable, messagesTable } from "@workspace/db";

/**
 * Paid compliance controls. Provides retention policy metadata, SOC2-style
 * structured log export, and immutable event history helpers.
 *
 * Retention values here describe the *policy* — actual deletion enforcement
 * should be wired to a scheduled job in production.
 */

export interface RetentionPolicy {
  scope: string;
  retentionDays: number;
  description: string;
}

export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  { scope: "tickets", retentionDays: 365 * 3, description: "Tickets retained 3 years for support history." },
  { scope: "messages", retentionDays: 365 * 3, description: "Messages retained alongside parent tickets." },
  { scope: "staff_actions", retentionDays: 365 * 7, description: "Audit trail retained 7 years for SOC2 alignment." },
  { scope: "risk_events", retentionDays: 365 * 7, description: "Risk events retained 7 years for investigations." },
];

export function getRetentionPolicies(): RetentionPolicy[] {
  return DEFAULT_RETENTION_POLICIES.map((p) => ({ ...p }));
}

export interface SoC2LogEntry {
  type: "STAFF_ACTION" | "RISK_EVENT";
  id: string;
  actorId: string | null;
  subjectId: string | null;
  action: string;
  metadata: unknown;
  occurredAt: string;
}

export async function exportSoC2Log(limit = 500): Promise<SoC2LogEntry[]> {
  const [staffActions, riskEvents] = await Promise.all([
    db
      .select({
        id: staffActionsTable.id,
        staffId: staffActionsTable.staffId,
        ticketId: staffActionsTable.ticketId,
        actionType: staffActionsTable.actionType,
        metadata: staffActionsTable.metadata,
        createdAt: staffActionsTable.createdAt,
      })
      .from(staffActionsTable)
      .orderBy(desc(staffActionsTable.createdAt))
      .limit(limit),
    db
      .select()
      .from(riskEventsTable)
      .orderBy(desc(riskEventsTable.createdAt))
      .limit(limit),
  ]);

  const entries: SoC2LogEntry[] = [];

  for (const a of staffActions) {
    entries.push({
      type: "STAFF_ACTION",
      id: a.id,
      actorId: a.staffId,
      subjectId: a.ticketId,
      action: a.actionType,
      metadata: a.metadata,
      occurredAt: a.createdAt.toISOString(),
    });
  }

  for (const e of riskEvents) {
    entries.push({
      type: "RISK_EVENT",
      id: e.id,
      actorId: null,
      subjectId: e.userId ?? null,
      action: e.eventType,
      metadata: e.metadata ?? null,
      occurredAt: e.createdAt.toISOString(),
    });
  }

  entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return entries.slice(0, limit);
}

export interface ImmutableHistoryStats {
  ticketCount: number;
  messageCount: number;
  description: string;
}

export async function getImmutableHistoryStats(): Promise<ImmutableHistoryStats> {
  const [ticketRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable);
  const [messageRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messagesTable);

  return {
    ticketCount: Number(ticketRow?.count ?? 0),
    messageCount: Number(messageRow?.count ?? 0),
    description:
      "Messages are hash-chained (prevHash -> messageHash) and staff replies can be signed (ED25519). Any edit invalidates the chain from the mutated message forward.",
  };
}
