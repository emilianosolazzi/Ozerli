import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Persistent server signing keys. The ED25519 private key is encrypted at
 * rest with AES-256-GCM using a KEK derived from SIGNING_KEY_SECRET (or the
 * legacy fallback SESSION_SECRET) via scrypt.
 *
 * Exactly one row should be marked active at any time; retired rows are kept
 * so signatures of past messages remain verifiable against their stored
 * public key.
 */
export const serverSigningKeysTable = pgTable("server_signing_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  algorithm: text("algorithm").notNull().default("ED25519"),
  publicKey: text("public_key").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  salt: text("salt").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
});
