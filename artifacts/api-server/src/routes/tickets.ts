import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, usersTable, ticketsTable, messagesTable, messageSignaturesTable, staffActionsTable } from "@workspace/db";
import { requireAuth, requireStaff } from "../middlewares/auth";
import { computeMessageHash, signMessage, verifySignature } from "../lib/crypto";
import {
  CreateTicketBody,
  GetTicketParams,
  UpdateTicketParams,
  UpdateTicketBody,
  SendMessageParams,
  SendMessageBody,
  VerifyTicketIntegrityParams,
  ListTicketsQueryParams,
} from "@workspace/api-zod";
import "../lib/session";

const router: IRouter = Router();

router.get("/tickets", requireAuth, async (req, res): Promise<void> => {
  const queryParams = ListTicketsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { status, page = 1, limit = 20 } = queryParams.data;

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const offset = (page - 1) * limit;

  let whereConditions = [];
  if (!currentUser.isStaff) {
    whereConditions.push(eq(ticketsTable.creatorId, currentUser.id));
  }
  if (status) {
    whereConditions.push(eq(ticketsTable.status, status));
  }

  const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const tickets = await db
    .select({
      id: ticketsTable.id,
      creatorId: ticketsTable.creatorId,
      status: ticketsTable.status,
      subject: ticketsTable.subject,
      priority: ticketsTable.priority,
      riskScore: ticketsTable.riskScore,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
      lastMessageAt: ticketsTable.lastMessageAt,
      creator: {
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
    .from(ticketsTable)
    .leftJoin(usersTable, eq(ticketsTable.creatorId, usersTable.id))
    .where(where)
    .orderBy(desc(ticketsTable.updatedAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(where);

  res.json({ tickets, total: Number(countResult?.count ?? 0), page, limit });
});

router.post("/tickets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!currentUser || currentUser.isBanned) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { subject, content, priority = "NORMAL" } = parsed.data;

  const [ticket] = await db
    .insert(ticketsTable)
    .values({ creatorId: currentUser.id, subject, priority, status: "OPEN" })
    .returning();

  const createdAt = new Date();
  const messageHash = computeMessageHash({
    ticketId: ticket.id,
    sequenceNumber: 1,
    senderId: currentUser.id,
    content,
    prevHash: null,
    createdAt,
  });

  await db.insert(messagesTable).values({
    ticketId: ticket.id,
    senderId: currentUser.id,
    role: "USER",
    content,
    sequenceNumber: 1,
    prevHash: null,
    messageHash,
    createdAt,
  });

  await db.update(ticketsTable).set({ lastMessageAt: createdAt }).where(eq(ticketsTable.id, ticket.id));

  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, currentUser.id));

  res.status(201).json({ ...ticket, creator });
});

router.get("/tickets/:ticketId", requireAuth, async (req, res): Promise<void> => {
  const params = GetTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [ticket] = await db
    .select({
      id: ticketsTable.id,
      creatorId: ticketsTable.creatorId,
      status: ticketsTable.status,
      subject: ticketsTable.subject,
      priority: ticketsTable.priority,
      riskScore: ticketsTable.riskScore,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
      lastMessageAt: ticketsTable.lastMessageAt,
      creator: {
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
    .from(ticketsTable)
    .leftJoin(usersTable, eq(ticketsTable.creatorId, usersTable.id))
    .where(eq(ticketsTable.id, params.data.ticketId));

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (!currentUser.isStaff && ticket.creatorId !== currentUser.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.ticketId, ticket.id))
    .orderBy(messagesTable.sequenceNumber);

  const messages = await Promise.all(
    rawMessages.map(async (msg) => {
      const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));
      const [sig] = await db.select().from(messageSignaturesTable).where(eq(messageSignaturesTable.messageId, msg.id));
      return { ...msg, sender, signature: sig ?? null };
    }),
  );

  res.json({ ...ticket, messages });
});

router.patch("/tickets/:ticketId", requireStaff, async (req, res): Promise<void> => {
  const params = UpdateTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ticket] = await db
    .update(ticketsTable)
    .set(parsed.data)
    .where(eq(ticketsTable.id, params.data.ticketId))
    .returning();

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  await db.insert(staffActionsTable).values({
    staffId: req.session.userId!,
    ticketId: ticket.id,
    actionType: "STATUS_CHANGE",
    metadata: { newStatus: parsed.data.status, newPriority: parsed.data.priority },
  });

  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.creatorId));
  res.json({ ...ticket, creator });
});

router.post("/tickets/:ticketId/messages", requireAuth, async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!currentUser || currentUser.isBanned) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.ticketId));
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (!currentUser.isStaff && ticket.creatorId !== currentUser.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [lastMessage] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.ticketId, ticket.id))
    .orderBy(desc(messagesTable.sequenceNumber))
    .limit(1);

  const sequenceNumber = (lastMessage?.sequenceNumber ?? 0) + 1;
  const prevHash = lastMessage?.messageHash ?? null;
  const createdAt = new Date();
  const role = currentUser.isStaff ? "STAFF" : "USER";

  const messageHash = computeMessageHash({
    ticketId: ticket.id,
    sequenceNumber,
    senderId: currentUser.id,
    content: parsed.data.content,
    prevHash,
    createdAt,
  });

  const [message] = await db
    .insert(messagesTable)
    .values({
      ticketId: ticket.id,
      senderId: currentUser.id,
      role,
      content: parsed.data.content,
      sequenceNumber,
      prevHash,
      messageHash,
      createdAt,
    })
    .returning();

  await db.update(ticketsTable).set({ lastMessageAt: createdAt, status: "IN_PROGRESS" }).where(eq(ticketsTable.id, ticket.id));

  let signature = null;

  if (currentUser.isStaff) {
    const { signature: sig, publicKey } = signMessage(messageHash);
    const [sigRecord] = await db
      .insert(messageSignaturesTable)
      .values({
        messageId: message.id,
        signerUserId: currentUser.id,
        signature: sig,
        publicKey,
        signatureType: "ED25519",
      })
      .returning();
    signature = sigRecord;
  }

  res.status(201).json({ ...message, sender: currentUser, signature });
});

router.get("/tickets/:ticketId/verify", requireAuth, async (req, res): Promise<void> => {
  const params = VerifyTicketIntegrityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.ticketId, params.data.ticketId))
    .orderBy(messagesTable.sequenceNumber);

  if (messages.length === 0) {
    res.json({ valid: true, messageCount: 0, brokenAt: null, details: "No messages to verify" });
    return;
  }

  let brokenAt: number | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const expectedPrevHash = i === 0 ? null : messages[i - 1].messageHash;

    if (msg.prevHash !== expectedPrevHash) {
      brokenAt = msg.sequenceNumber;
      break;
    }

    const expectedHash = computeMessageHash({
      ticketId: msg.ticketId,
      sequenceNumber: msg.sequenceNumber,
      senderId: msg.senderId,
      content: msg.content,
      prevHash: msg.prevHash,
      createdAt: msg.createdAt,
    });

    if (expectedHash !== msg.messageHash) {
      brokenAt = msg.sequenceNumber;
      break;
    }
  }

  const sigResults: boolean[] = [];
  const staffMessages = messages.filter((m) => m.role === "STAFF");

  for (const msg of staffMessages) {
    const [sig] = await db.select().from(messageSignaturesTable).where(eq(messageSignaturesTable.messageId, msg.id));
    if (sig) {
      sigResults.push(verifySignature(msg.messageHash, sig.signature, sig.publicKey));
    }
  }

  const signaturesValid = sigResults.every(Boolean);
  const valid = brokenAt === null && signaturesValid;
  const details = valid
    ? `All ${messages.length} messages verified. ${staffMessages.length} staff signatures valid.`
    : brokenAt !== null
      ? `Hash chain broken at sequence ${brokenAt}`
      : "Signature verification failed";

  res.json({ valid, messageCount: messages.length, brokenAt, details });
});

export default router;
