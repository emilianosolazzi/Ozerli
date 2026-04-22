import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createSign,
  createVerify,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
} from "crypto";
import { eq } from "drizzle-orm";
import { db, serverSigningKeysTable } from "@workspace/db";

export function computeMessageHash(params: {
  ticketId: string;
  sequenceNumber: number;
  senderId: string;
  content: string;
  prevHash: string | null;
  createdAt: Date;
}): string {
  const data = [
    params.ticketId,
    String(params.sequenceNumber),
    params.senderId,
    params.content,
    params.prevHash ?? "",
    params.createdAt.toISOString(),
  ].join("|");

  return createHash("sha256").update(data).digest("hex");
}

// --- Persistent ED25519 signing key management -----------------------------
//
// Keys are stored in PostgreSQL (table `server_signing_keys`). Private keys
// are encrypted at rest with AES-256-GCM; the KEK is derived from
// SIGNING_KEY_SECRET (or SESSION_SECRET as a legacy fallback) via scrypt.
// No third-party KMS is required.

interface ActiveKeyMaterial {
  id: string;
  privateKey: string;
  publicKey: string;
}

let _activeKey: ActiveKeyMaterial | null = null;

function getKeyEncryptionSecret(): string {
  const secret = process.env.SIGNING_KEY_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SIGNING_KEY_SECRET (or SESSION_SECRET fallback) must be set to encrypt the server signing key at rest.",
    );
  }
  if (secret.length < 16) {
    throw new Error("Signing key secret must be at least 16 characters.");
  }
  return secret;
}

function deriveKek(secret: string, saltHex: string): Buffer {
  return scryptSync(secret, Buffer.from(saltHex, "hex"), 32);
}

function encryptPrivateKey(privateKeyPem: string): {
  encryptedPrivateKey: string;
  iv: string;
  authTag: string;
  salt: string;
} {
  const salt = randomBytes(16).toString("hex");
  const iv = randomBytes(12);
  const kek = deriveKek(getKeyEncryptionSecret(), salt);
  const cipher = createCipheriv("aes-256-gcm", kek, iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyPem, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedPrivateKey: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    salt,
  };
}

function decryptPrivateKey(row: {
  encryptedPrivateKey: string;
  iv: string;
  authTag: string;
  salt: string;
}): string {
  const kek = deriveKek(getKeyEncryptionSecret(), row.salt);
  const decipher = createDecipheriv("aes-256-gcm", kek, Buffer.from(row.iv, "hex"));
  decipher.setAuthTag(Buffer.from(row.authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(row.encryptedPrivateKey, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Load the active signing key, generating and persisting a new one if none
 * exists. Must be called once at server startup before any signing occurs.
 */
export async function initSigningKey(): Promise<{ id: string; publicKey: string }> {
  const [existing] = await db
    .select()
    .from(serverSigningKeysTable)
    .where(eq(serverSigningKeysTable.active, true))
    .limit(1);

  if (existing) {
    const privateKey = decryptPrivateKey({
      encryptedPrivateKey: existing.encryptedPrivateKey,
      iv: existing.iv,
      authTag: existing.authTag,
      salt: existing.salt,
    });
    _activeKey = { id: existing.id, privateKey, publicKey: existing.publicKey };
    return { id: existing.id, publicKey: existing.publicKey };
  }

  const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const sealed = encryptPrivateKey(privateKey);
  const [inserted] = await db
    .insert(serverSigningKeysTable)
    .values({
      algorithm: "ED25519",
      publicKey,
      encryptedPrivateKey: sealed.encryptedPrivateKey,
      iv: sealed.iv,
      authTag: sealed.authTag,
      salt: sealed.salt,
      active: true,
    })
    .returning({ id: serverSigningKeysTable.id });

  _activeKey = { id: inserted.id, privateKey, publicKey };
  return { id: inserted.id, publicKey };
}

export function getActivePublicKey(): string {
  if (!_activeKey) {
    throw new Error("Signing key has not been initialized. Call initSigningKey() at startup.");
  }
  return _activeKey.publicKey;
}

export function signMessage(messageHash: string): { signature: string; publicKey: string } {
  if (!_activeKey) {
    throw new Error("Signing key has not been initialized. Call initSigningKey() at startup.");
  }
  const sign = createSign("SHA256");
  sign.update(messageHash);
  sign.end();
  const signature = sign.sign(_activeKey.privateKey, "hex");
  return { signature, publicKey: _activeKey.publicKey };
}

export function verifySignature(messageHash: string, signature: string, publicKey: string): boolean {
  try {
    const verify = createVerify("SHA256");
    verify.update(messageHash);
    verify.end();
    return verify.verify(publicKey, signature, "hex");
  } catch {
    return false;
  }
}

export function generateOtp(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

export function generateNonce(): string {
  return createHash("sha256").update(String(Date.now()) + Math.random()).digest("hex");
}
