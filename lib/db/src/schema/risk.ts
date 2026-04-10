import { pgTable, text, uuid, doublePrecision, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ticketsTable } from "./tickets";

export const riskEventsTable = pgTable("risk_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  ticketId: uuid("ticket_id").references(() => ticketsTable.id),
  eventType: text("event_type").notNull(),
  scoreDelta: doublePrecision("score_delta"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimitsTable = pgTable("rate_limits", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  ticketsCreatedLastHour: integer("tickets_created_last_hour").notNull().default(0),
  messagesSentLastMinute: integer("messages_sent_last_minute").notNull().default(0),
  lastReset: timestamp("last_reset", { withTimezone: true }).notNull().defaultNow(),
});

export const staffActionsTable = pgTable("staff_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => usersTable.id),
  ticketId: uuid("ticket_id").references(() => ticketsTable.id),
  actionType: text("action_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
