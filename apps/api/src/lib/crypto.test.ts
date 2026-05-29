import { describe, it, expect } from "vitest";
import { encryptJSON, decryptJSON } from "./crypto";

describe("crypto (AES-256-GCM)", () => {
  it("round-trips a JSON object", () => {
    const plaintext = { username: "carevault-bot", password: "s3cret", apiKey: null };
    const cipher = encryptJSON(plaintext);
    expect(cipher).not.toContain("carevault-bot");
    expect(cipher).not.toContain("s3cret");
    expect(decryptJSON(cipher)).toEqual(plaintext);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const value = { token: "abc" };
    const a = encryptJSON(value);
    const b = encryptJSON(value);
    expect(a).not.toEqual(b);
    expect(decryptJSON(a)).toEqual(value);
    expect(decryptJSON(b)).toEqual(value);
  });

  it("rejects tampered ciphertext (GCM auth tag)", () => {
    const cipher = encryptJSON({ ok: true });
    // Flip a byte in the ciphertext segment (past iv[12] + tag[16] = 28)
    const buf = Buffer.from(cipher, "base64");
    buf[30] = buf[30]! ^ 0xff;
    const tampered = buf.toString("base64");
    expect(() => decryptJSON(tampered)).toThrow();
  });

  it("rejects truncated ciphertext", () => {
    expect(() => decryptJSON("AAAA")).toThrow();
  });
});
