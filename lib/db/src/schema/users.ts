import { pgTable, text, uuid, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  primaryWallet: text("primary_wallet"),
  primaryEmail: text("primary_email"),
  reputationScore: doublePrecision("reputation_score").notNull().default(0),
  riskScore: doublePrecision("risk_score").notNull().default(0),
  isStaff: boolean("is_staff").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
