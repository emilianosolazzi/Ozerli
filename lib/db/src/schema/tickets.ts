import { pgTable, text, uuid, doublePrecision, timestamp, bigint } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketsTable = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("OPEN"),
  subject: text("subject"),
  priority: text("priority").notNull().default("NORMAL"),
  riskScore: doublePrecision("risk_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
});

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull().references(() => ticketsTable.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => usersTable.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  sequenceNumber: bigint("sequence_number", { mode: "number" }).notNull(),
  prevHash: text("prev_hash"),
  messageHash: text("message_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageSignaturesTable = pgTable("message_signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  signerUserId: uuid("signer_user_id").references(() => usersTable.id),
  signature: text("signature").notNull(),
  publicKey: text("public_key").notNull(),
  signatureType: text("signature_type").notNull().default("ED25519"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketAnchorsTable = pgTable("ticket_anchors", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull().references(() => ticketsTable.id, { onDelete: "cascade" }),
  anchorHash: text("anchor_hash").notNull(),
  messageSequence: bigint("message_sequence", { mode: "number" }).notNull(),
  chain: text("chain"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
