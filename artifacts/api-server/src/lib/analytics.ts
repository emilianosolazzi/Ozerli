import { and, avg, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, ticketsTable, messagesTable, usersTable } from "@workspace/db";

export interface AgentPerformance {
  agentId: string;
  email: string | null;
  handledTickets: number;
  staffReplies: number;
}

export interface CategoryTrendBucket {
  subject: string;
  count: number;
}

export interface ChurnRiskUser {
  userId: string;
  email: string | null;
  riskScore: number;
  openTickets: number;
}

/**
 * Paid analytics: median first-response time across recently created tickets.
 * Approximated by comparing ticket.createdAt to the first non-USER message.
 */
export async function getMedianFirstResponseMinutes(limit = 200): Promise<number | null> {
  const rows = await db
    .select({
      ticketId: ticketsTable.id,
      createdAt: ticketsTable.createdAt,
      firstStaffAt: sql<Date | null>`min(case when ${messagesTable.role} <> 'USER' then ${messagesTable.createdAt} end)`,
    })
    .from(ticketsTable)
    .leftJoin(messagesTable, eq(messagesTable.ticketId, ticketsTable.id))
    .groupBy(ticketsTable.id, ticketsTable.createdAt)
    .orderBy(desc(ticketsTable.createdAt))
    .limit(limit);

  const deltas: number[] = [];
  for (const row of rows) {
    if (!row.firstStaffAt) continue;
    const diffMs = new Date(row.firstStaffAt).getTime() - row.createdAt.getTime();
    if (diffMs <= 0) continue;
    deltas.push(diffMs / 60000);
  }

  if (deltas.length === 0) return null;
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  return deltas.length % 2 === 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];
}

export async function getAgentPerformance(limit = 10): Promise<AgentPerformance[]> {
  const rows = await db
    .select({
      agentId: messagesTable.senderId,
      email: usersTable.primaryEmail,
      staffReplies: sql<number>`count(*)`,
      handledTickets: sql<number>`count(distinct ${messagesTable.ticketId})`,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(eq(messagesTable.role, "STAFF"))
    .groupBy(messagesTable.senderId, usersTable.primaryEmail)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((r) => ({
    agentId: r.agentId,
    email: r.email ?? null,
    staffReplies: Number(r.staffReplies ?? 0),
    handledTickets: Number(r.handledTickets ?? 0),
  }));
}

export async function getCategoryTrends(limit = 10): Promise<CategoryTrendBucket[]> {
  const rows = await db
    .select({
      subject: ticketsTable.subject,
      count: sql<number>`count(*)`,
    })
    .from(ticketsTable)
    .where(sql`${ticketsTable.subject} is not null`)
    .groupBy(ticketsTable.subject)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((r) => ({
    subject: r.subject ?? "(none)",
    count: Number(r.count ?? 0),
  }));
}

export async function getChurnRiskUsers(limit = 10): Promise<ChurnRiskUser[]> {
  const rows = await db
    .select({
      userId: usersTable.id,
      email: usersTable.primaryEmail,
      riskScore: usersTable.riskScore,
      openTickets: sql<number>`count(${ticketsTable.id})`,
    })
    .from(usersTable)
    .leftJoin(
      ticketsTable,
      and(eq(ticketsTable.creatorId, usersTable.id), inArray(ticketsTable.status, ["OPEN", "IN_PROGRESS"])),
    )
    .where(gte(usersTable.riskScore, 0.5))
    .groupBy(usersTable.id, usersTable.primaryEmail, usersTable.riskScore)
    .orderBy(desc(usersTable.riskScore))
    .limit(limit);

  return rows.map((r) => ({
    userId: r.userId,
    email: r.email ?? null,
    riskScore: Number(r.riskScore ?? 0),
    openTickets: Number(r.openTickets ?? 0),
  }));
}

export async function getAverageTicketRiskScore(): Promise<number | null> {
  const [row] = await db
    .select({ avgRisk: avg(ticketsTable.riskScore) })
    .from(ticketsTable);
  return row?.avgRisk ? Number(row.avgRisk) : null;
}
