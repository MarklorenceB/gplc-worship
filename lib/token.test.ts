import { describe, expect, it } from "vitest";
import { codeMatches, fingerprint, signToken, verifyToken } from "./token";

describe("signed tokens", () => {
  it("round-trips a payload", () => {
    const token = signToken({ memberId: 7, leader: true }, "secret");
    expect(verifyToken(token, "secret")).toEqual({ memberId: 7, leader: true });
  });

  it("rejects a token signed with another secret", () => {
    const token = signToken({ memberId: 7 }, "secret");
    expect(verifyToken(token, "other")).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = signToken({ memberId: 7, leader: false }, "secret");
    const [, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ memberId: 7, leader: true })).toString("base64url");
    expect(verifyToken(`${forged}.${mac}`, "secret")).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyToken("not-a-token", "secret")).toBeNull();
    expect(verifyToken("", "secret")).toBeNull();
  });
});

describe("codeMatches", () => {
  it("ignores case and surrounding spaces", () => {
    expect(codeMatches("  GPLC2026 ", "gplc2026")).toBe(true);
    expect(codeMatches("gplc", "gplc2026")).toBe(false);
  });
});

describe("fingerprint", () => {
  it("changes when the code changes", () => {
    expect(fingerprint("a", "secret")).toBe(fingerprint("A ", "secret"));
    expect(fingerprint("a", "secret")).not.toBe(fingerprint("b", "secret"));
  });
});
