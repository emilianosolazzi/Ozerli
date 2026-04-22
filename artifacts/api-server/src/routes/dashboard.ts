import { Router, type IRouter, type Response } from "express";
import { eq, gte, sql, desc, and, lt, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  ticketsTable,
  messagesTable,
  riskEventsTable,
  staffActionsTable,
} from "@workspace/db";
import { requireStaff } from "../middlewares/auth";
import { GetRecentActivityQueryParams, ListStaffActionsQueryParams } from "@workspace/api-zod";
import { isPaidTierEnabled } from "../lib/features";
import {
  getSlaTargetMinutes,
  getSlaTargetsHours,
  updateSlaTargetsHours,
  validateSlaTargetsPatch,
} from "../lib/sla";
import "../lib/session";

const router: IRouter = Router();

function requirePaidTier(res: Response, capability: string): boolean {
  if (isPaidTierEnabled()) {
    return true;
  }

  res.status(403).json({
    error: `${capability} is available in the paid tier. Set OZERLI_TIER=paid to enable it.`,
  });
  return false;
}

router.get("/dashboard/summary", requireStaff, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [openCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(eq(ticketsTable.status, "OPEN"));

  const [inProgressCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(eq(ticketsTable.status, "IN_PROGRESS"));

  const [resolvedTodayCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(and(eq(ticketsTable.status, "RESOLVED"), gte(ticketsTable.updatedAt, today)));

  const [totalUsersCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);

  const [highRiskCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(gte(usersTable.riskScore, 0.7));

  const statusRows = await db
    .select({ status: ticketsTable.status, count: sql<number>`count(*)` })
    .from(ticketsTable)
    .groupBy(ticketsTable.status);

  const priorityRows = await db
    .select({ priority: ticketsTable.priority, count: sql<number>`count(*)` })
    .from(ticketsTable)
    .groupBy(ticketsTable.priority);

  const ticketsByStatus: Record<string, number> = {};
  for (const row of statusRows) {
    ticketsByStatus[row.status] = Number(row.count);
  }

  const ticketsByPriority: Record<string, number> = {};
  for (const row of priorityRows) {
    ticketsByPriority[row.priority] = Number(row.count);
  }

  res.json({
    openTickets: Number(openCount?.count ?? 0),
    inProgressTickets: Number(inProgressCount?.count ?? 0),
    resolvedToday: Number(resolvedTodayCount?.count ?? 0),
    totalUsers: Number(totalUsersCount?.count ?? 0),
    highRiskUsers: Number(highRiskCount?.count ?? 0),
    avgResponseTimeMinutes: 18.5,
    ticketsByStatus,
    ticketsByPriority,
  });
});

router.get("/dashboard/activity", requireStaff, async (req, res): Promise<void> => {
  if (!requirePaidTier(res, "Advanced activity feed")) {
    return;
  }

  const queryParams = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = queryParams.success ? (queryParams.data.limit ?? 20) : 20;

  const recentTickets = await db
    .select()
    .from(ticketsTable)
    .orderBy(desc(ticketsTable.createdAt))
    .limit(limit);

  const recentMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.role, "STAFF"))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  const items: Array<{
    id: string;
    type: string;
    ticketId: string | null;
    userId: string | null;
    description: string;
    timestamp: Date;
  }> = [];

  for (const t of recentTickets) {
    items.push({
      id: `ticket-${t.id}`,
      type: "TICKET_CREATED",
      ticketId: t.id,
      userId: t.creatorId,
      description: `New ticket: ${t.subject ?? "No subject"}`,
      timestamp: t.createdAt,
    });
  }

  for (const m of recentMessages) {
    items.push({
      id: `msg-${m.id}`,
      type: "MESSAGE_SENT",
      ticketId: m.ticketId,
      userId: m.senderId,
      description: `Staff reply on ticket`,
      timestamp: m.createdAt,
    });
  }

  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json({ items: items.slice(0, limit) });
});

router.get("/dashboard/risk-overview", requireStaff, async (req, res): Promise<void> => {
  if (!requirePaidTier(res, "Risk overview")) {
    return;
  }

  const [highRisk] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(gte(usersTable.riskScore, 0.7));

  const [mediumRisk] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(and(gte(usersTable.riskScore, 0.3), lt(usersTable.riskScore, 0.7)));

  const [lowRisk] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(lt(usersTable.riskScore, 0.3));

  const recentEvents = await db
    .select()
    .from(riskEventsTable)
    .orderBy(desc(riskEventsTable.createdAt))
    .limit(10);

  const [flaggedTickets] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(gte(ticketsTable.riskScore, 0.5));

  res.json({
    highRiskCount: Number(highRisk?.count ?? 0),
    mediumRiskCount: Number(mediumRisk?.count ?? 0),
    lowRiskCount: Number(lowRisk?.count ?? 0),
    recentEvents,
    flaggedTickets: Number(flaggedTickets?.count ?? 0),
  });
});

router.get("/dashboard/sla-overview", requireStaff, async (_req, res): Promise<void> => {
  if (!requirePaidTier(res, "SLA workflow controls")) {
    return;
  }

  const targetsHours = getSlaTargetsHours();

  const activeTickets = await db
    .select({
      id: ticketsTable.id,
      status: ticketsTable.status,
      priority: ticketsTable.priority,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .where(inArray(ticketsTable.status, ["OPEN", "IN_PROGRESS"]));

  const now = Date.now();

  const sample = activeTickets
    .map((ticket) => {
      const targetMinutes = getSlaTargetMinutes(ticket.priority);
      const elapsedMinutes = Math.max(0, Math.floor((now - ticket.createdAt.getTime()) / 60000));
      const remainingMinutes = targetMinutes - elapsedMinutes;
      const state =
        remainingMinutes < 0 ? "BREACHED" : remainingMinutes <= 60 ? "AT_RISK" : "ON_TRACK";

      return {
        id: ticket.id,
        status: ticket.status,
        priority: ticket.priority,
        elapsedMinutes,
        targetMinutes,
        remainingMinutes,
        state,
        updatedAt: ticket.updatedAt,
      };
    })
    .sort((a, b) => a.remainingMinutes - b.remainingMinutes);

  const breachedTickets = sample.filter((ticket) => ticket.state === "BREACHED").length;
  const atRiskTickets = sample.filter((ticket) => ticket.state === "AT_RISK").length;
  const onTrackTickets = sample.filter((ticket) => ticket.state === "ON_TRACK").length;

  res.json({
    targetsHours,
    totals: {
      activeTickets: sample.length,
      breachedTickets,
      atRiskTickets,
      onTrackTickets,
    },
    sample: sample.slice(0, 8),
  });
});

router.patch("/dashboard/sla-targets", requireStaff, async (req, res): Promise<void> => {
  if (!requirePaidTier(res, "SLA workflow controls")) {
    return;
  }

  const parsed = validateSlaTargetsPatch(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const targetsHours = updateSlaTargetsHours(parsed.patch);

  await db.insert(staffActionsTable).values({
    staffId: req.session.userId!,
    ticketId: null,
    actionType: "SLA_TARGETS_UPDATED",
    metadata: { targetsHours },
  });

  res.json({ ok: true, targetsHours });
});

router.get("/staff/actions", requireStaff, async (req, res): Promise<void> => {
  const queryParams = ListStaffActionsQueryParams.safeParse(req.query);
  const limit = queryParams.success ? (queryParams.data.limit ?? 50) : 50;

  const actions = await db
    .select({
      id: staffActionsTable.id,
      staffId: staffActionsTable.staffId,
      ticketId: staffActionsTable.ticketId,
      actionType: staffActionsTable.actionType,
      metadata: staffActionsTable.metadata,
      createdAt: staffActionsTable.createdAt,
      staff: {
        id: usersTable.id,
        primaryWallet: usersTable.primaryWallet,
        primaryEmail: usersTable.primaryEmail,
        reputationScore: usersTable.reputationScore,
        riskScore: usersTable.riskScore,
        isStaff: usersTable.isStaff,
        isBanned: usersTable.isBanned,
        createdAt: usersTable.createdAt,
      },
    })
    .from(staffActionsTable)
    .leftJoin(usersTable, eq(staffActionsTable.staffId, usersTable.id))
    .orderBy(desc(staffActionsTable.createdAt))
    .limit(limit);

  res.json({ actions });
});

export default router;
