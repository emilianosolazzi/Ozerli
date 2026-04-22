import { Router, type IRouter, type Response, type NextFunction, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, ticketsTable, messagesTable, usersTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireStaff } from "../middlewares/auth";
import { isPaidTierEnabled } from "../lib/features";
import {
  getMedianFirstResponseMinutes,
  getAgentPerformance,
  getCategoryTrends,
  getChurnRiskUsers,
  getAverageTicketRiskScore,
} from "../lib/analytics";
import {
  suggestResponses,
  findDuplicateCandidates,
  routeTicket,
  scorePriority,
} from "../lib/automation";
import {
  getRetentionPolicies,
  exportSoC2Log,
  getImmutableHistoryStats,
} from "../lib/compliance";
import { getUsageSnapshot, recordAiAction } from "../lib/usage";
import "../lib/session";

const router: IRouter = Router();

function paidTierGate(capability: string) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (isPaidTierEnabled()) {
      next();
      return;
    }
    res.status(403).json({
      error: `${capability} is available in the paid tier. Set OZERLI_TIER=paid to enable it.`,
    });
  };
}

// ---------- Advanced analytics ----------
router.get(
  "/paid/analytics/overview",
  requireStaff,
  paidTierGate("Advanced analytics"),
  async (_req, res): Promise<void> => {
    const [medianResponseMinutes, agentPerformance, categoryTrends, churnRisk, avgRisk] =
      await Promise.all([
        getMedianFirstResponseMinutes(),
        getAgentPerformance(),
        getCategoryTrends(),
        getChurnRiskUsers(),
        getAverageTicketRiskScore(),
      ]);

    res.json({
      medianResponseMinutes,
      averageTicketRiskScore: avgRisk,
      agentPerformance,
      categoryTrends,
      churnRisk,
    });
  },
);

// ---------- AI automation ----------
router.get(
  "/paid/automation/suggestions/:ticketId",
  requireStaff,
  paidTierGate("AI automation"),
  async (req, res): Promise<void> => {
    const ticketId = String(req.params.ticketId);

    const [ticket] = await db
      .select({ subject: ticketsTable.subject })
      .from(ticketsTable)
      .where(eq(ticketsTable.id, ticketId))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const [lastMessage] = await db
      .select({ content: messagesTable.content })
      .from(messagesTable)
      .where(eq(messagesTable.ticketId, ticketId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);

    recordAiAction();
    res.json({
      suggestions: suggestResponses(ticket.subject, lastMessage?.content ?? null),
    });
  },
);

router.get(
  "/paid/automation/duplicates/:ticketId",
  requireStaff,
  paidTierGate("AI automation"),
  async (req, res): Promise<void> => {
    recordAiAction();
    const candidates = await findDuplicateCandidates(String(req.params.ticketId));
    res.json({ candidates });
  },
);

router.get(
  "/paid/automation/routing/:ticketId",
  requireStaff,
  paidTierGate("AI automation"),
  async (req, res): Promise<void> => {
    const [ticket] = await db
      .select({ id: ticketsTable.id, subject: ticketsTable.subject, riskScore: ticketsTable.riskScore })
      .from(ticketsTable)
      .where(eq(ticketsTable.id, String(req.params.ticketId)))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const [firstMessage] = await db
      .select({ content: messagesTable.content })
      .from(messagesTable)
      .where(eq(messagesTable.ticketId, ticket.id))
      .orderBy(messagesTable.createdAt)
      .limit(1);

    recordAiAction();
    const routing = routeTicket(ticket.subject, firstMessage?.content ?? null);
    const priority = scorePriority(ticket.subject, firstMessage?.content ?? null, Number(ticket.riskScore ?? 0));
    res.json({ routing, priority });
  },
);

// ---------- Compliance ----------
router.get(
  "/paid/compliance/retention",
  requireStaff,
  paidTierGate("Compliance controls"),
  (_req, res): void => {
    res.json({ policies: getRetentionPolicies() });
  },
);

router.get(
  "/paid/compliance/audit-log",
  requireStaff,
  paidTierGate("Compliance controls"),
  async (req, res): Promise<void> => {
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit ?? 200)));
    const entries = await exportSoC2Log(limit);
    res.json({ entries });
  },
);

router.get(
  "/paid/compliance/immutable-history",
  requireStaff,
  paidTierGate("Compliance controls"),
  async (_req, res): Promise<void> => {
    res.json(await getImmutableHistoryStats());
  },
);

// ---------- Usage metering ----------
router.get(
  "/paid/usage/current",
  requireStaff,
  paidTierGate("Usage metering"),
  async (_req, res): Promise<void> => {
    res.json(await getUsageSnapshot());
  },
);

// Silence unused-import warning if tree-shakers complain about usersTable.
void usersTable;

export default router;
