import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKeyBuffer(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be set and exactly 32 characters.");
  }
  return Buffer.from(key, "utf8");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(text: string): string {
  const colonIndex = text.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Invalid encrypted payload: missing separator.");
  }
  const ivHex = text.slice(0, colonIndex);
  const encryptedHex = text.slice(colonIndex + 1);
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
