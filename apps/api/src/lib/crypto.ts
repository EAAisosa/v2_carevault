import crypto from "node:crypto";
import { config } from "../config";

// AES-256-GCM authenticated encryption for sensitive blobs (EHR credentials).
//
// Format on disk: base64( iv[12] | authTag[16] | ciphertext )
// Key:            32 raw bytes, supplied as base64 in ENCRYPTION_KEY.
// Rotation:       generate a new key, re-encrypt all rows in a one-shot script,
//                 then swap the env var. We don't carry a key-id for now because
//                 the only encrypted field is auth_credentials and rotation is
//                 expected to be rare; add one if more fields adopt this.

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = Buffer.from(config.encryptionKey, "base64");
  if (raw.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded)");
  }
  cachedKey = raw;
  return raw;
}

export function encryptJSON(value: unknown): string {
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptJSON<T = unknown>(payload: string): T {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Ciphertext is too short to be valid");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
