import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, riskEventsTable, staffActionsTable } from "@workspace/db";
import { requireAuth, requireStaff } from "../middlewares/auth";
import { GetUserParams, BanUserParams } from "@workspace/api-zod";
import "../lib/session";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.get("/users/:userId", requireStaff, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const recentRiskEvents = await db
    .select()
    .from(riskEventsTable)
    .where(eq(riskEventsTable.userId, user.id))
    .orderBy(desc(riskEventsTable.createdAt))
    .limit(10);

  res.json({ ...user, recentRiskEvents });
});

router.post("/users/:userId/ban", requireStaff, async (req, res): Promise<void> => {
  const params = BanUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ isBanned: true })
    .where(eq(usersTable.id, params.data.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(staffActionsTable).values({
    staffId: req.session.userId!,
    ticketId: null,
    actionType: "BAN_USER",
    metadata: { bannedUserId: params.data.userId },
  });

  res.json({ ok: true });
});

export default router;
