import { createHash, createSign, createVerify, generateKeyPairSync } from "crypto";

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

let _serverKeyPair: { privateKey: string; publicKey: string } | null = null;

function getServerKeyPair() {
  if (!_serverKeyPair) {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    _serverKeyPair = { privateKey, publicKey };
  }
  return _serverKeyPair;
}

export function signMessage(messageHash: string): { signature: string; publicKey: string } {
  const { privateKey, publicKey } = getServerKeyPair();
  const sign = createSign("SHA256");
  sign.update(messageHash);
  sign.end();
  const signature = sign.sign(privateKey, "hex");
  return { signature, publicKey };
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
