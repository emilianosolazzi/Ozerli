import { and, gte, inArray, sql } from "drizzle-orm";
import { db, ticketsTable, messagesTable, staffActionsTable } from "@workspace/db";

/**
 * Paid usage metering. Computes current-period counters across billing
 * dimensions: active tickets, monthly conversations, storage bytes,
 * API calls (session-counter), and AI actions.
 *
 * API calls + AI actions are tracked in-process as counters. For production
 * they should be persisted; this module is the wiring surface billing can
 * connect to.
 */

export interface UsageSnapshot {
  periodStart: string;
  activeTickets: number;
  monthlyConversations: number;
  approximateStorageBytes: number;
  apiCalls: number;
  aiActions: number;
}

let apiCallCounter = 0;
let aiActionCounter = 0;
let periodStart = startOfMonth(new Date());

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function resetIfNewPeriod(now: Date): void {
  const currentStart = startOfMonth(now);
  if (currentStart.getTime() !== periodStart.getTime()) {
    periodStart = currentStart;
    apiCallCounter = 0;
    aiActionCounter = 0;
  }
}

export function recordApiCall(): void {
  resetIfNewPeriod(new Date());
  apiCallCounter++;
}

export function recordAiAction(): void {
  resetIfNewPeriod(new Date());
  aiActionCounter++;
}

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const now = new Date();
  resetIfNewPeriod(now);

  const [activeRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(inArray(ticketsTable.status, ["OPEN", "IN_PROGRESS"]));

  const [conversationsRow] = await db
    .select({ count: sql<number>`count(distinct ${messagesTable.ticketId})` })
    .from(messagesTable)
    .where(gte(messagesTable.createdAt, periodStart));

  const [storageRow] = await db
    .select({
      bytes: sql<number>`coalesce(sum(octet_length(${messagesTable.content})), 0) + coalesce(sum(octet_length(coalesce(${messagesTable.messageHash}, ''))), 0)`,
    })
    .from(messagesTable);

  return {
    periodStart: periodStart.toISOString(),
    activeTickets: Number(activeRow?.count ?? 0),
    monthlyConversations: Number(conversationsRow?.count ?? 0),
    approximateStorageBytes: Number(storageRow?.bytes ?? 0),
    apiCalls: apiCallCounter,
    aiActions: aiActionCounter,
  };
}
