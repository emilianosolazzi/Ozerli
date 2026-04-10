import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const authIdentitiesTable = pgTable("auth_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  walletAddress: text("wallet_address"),
  email: text("email"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailOtpTable = pgTable("email_otp", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siweNoncesTable = pgTable("siwe_nonces", {
  id: uuid("id").primaryKey().defaultRandom(),
  nonce: text("nonce").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
