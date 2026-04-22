import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, authIdentitiesTable, emailOtpTable, siweNoncesTable } from "@workspace/db";
import { generateOtp, generateNonce } from "../lib/crypto";
import {
  RequestEmailOtpBody,
  VerifyEmailOtpBody,
  VerifyWalletSignatureBody,
} from "@workspace/api-zod";

import "../lib/session";

const router: IRouter = Router();

router.get("/auth/session", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.json({ authenticated: false });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    req.session.destroy(() => {});
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user });
});

router.post("/auth/email/request-otp", async (req, res): Promise<void> => {
  const parsed = RequestEmailOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email } = parsed.data;
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(emailOtpTable).values({ email, otp, expiresAt });

  if (process.env.NODE_ENV !== "production") {
    req.log.info({ email, otp }, "OTP generated (dev: logging OTP for testing)");
  } else {
    req.log.info({ email }, "OTP generated");
  }

  res.json({ ok: true });
});

router.post("/auth/email/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyEmailOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, otp } = parsed.data;

  const now = new Date();
  const [record] = await db
    .select()
    .from(emailOtpTable)
    .where(
      and(
        eq(emailOtpTable.email, email),
        eq(emailOtpTable.otp, otp),
        eq(emailOtpTable.used, false),
      ),
    )
    .orderBy(emailOtpTable.createdAt)
    .limit(1);

  if (!record || record.expiresAt < now) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  await db.update(emailOtpTable).set({ used: true }).where(eq(emailOtpTable.id, record.id));

  let user = await findOrCreateUserByEmail(email);

  req.session.userId = user.id;
  res.json({ ok: true, user });
});

router.get("/auth/wallet/nonce", async (req, res): Promise<void> => {
  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(siweNoncesTable).values({ nonce, expiresAt });
  res.json({ nonce });
});

router.post("/auth/wallet/verify", async (req, res): Promise<void> => {
  const parsed = VerifyWalletSignatureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { address } = parsed.data;

  const walletAddr = address.toLowerCase();

  let user = await findOrCreateUserByWallet(walletAddr);

  req.session.userId = user.id;
  res.json({ ok: true, user });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

async function findOrCreateUserByEmail(email: string) {
  const [identity] = await db
    .select()
    .from(authIdentitiesTable)
    .where(and(eq(authIdentitiesTable.type, "email"), eq(authIdentitiesTable.email, email)));

  if (identity) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, identity.userId));
    return user;
  }

  const [user] = await db.insert(usersTable).values({ primaryEmail: email }).returning();
  await db.insert(authIdentitiesTable).values({ userId: user.id, type: "email", email, verified: true });
  return user;
}

async function findOrCreateUserByWallet(walletAddress: string) {
  const [identity] = await db
    .select()
    .from(authIdentitiesTable)
    .where(
      and(
        eq(authIdentitiesTable.type, "wallet"),
        eq(authIdentitiesTable.walletAddress, walletAddress),
      ),
    );

  if (identity) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, identity.userId));
    return user;
  }

  const [user] = await db.insert(usersTable).values({ primaryWallet: walletAddress }).returning();
  await db.insert(authIdentitiesTable).values({ userId: user.id, type: "wallet", walletAddress, verified: true });
  return user;
}

export default router;
