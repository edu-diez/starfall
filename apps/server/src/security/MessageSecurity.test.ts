import { describe, expect, it } from "vitest";
import {
  isBoundedIdentifier,
  isBoundedMessage,
  MessageRateLimiter,
} from "./MessageSecurity";

describe("MessageRateLimiter", () => {
  it("limits each session and message type independently", () => {
    const limiter = new MessageRateLimiter();
    const limit = { maxEvents: 2, windowMs: 1_000 };

    expect(limiter.allows("player-a", "move", limit, 1_000)).toBe(true);
    expect(limiter.allows("player-a", "move", limit, 1_100)).toBe(true);
    expect(limiter.allows("player-a", "move", limit, 1_200)).toBe(false);
    expect(limiter.allows("player-a", "vote", limit, 1_200)).toBe(true);
    expect(limiter.allows("player-b", "move", limit, 1_200)).toBe(true);
  });

  it("expires events and clears a departed player's state", () => {
    const limiter = new MessageRateLimiter();
    const limit = { maxEvents: 1, windowMs: 1_000 };

    expect(limiter.allows("player-a", "move", limit, 1_000)).toBe(true);
    expect(limiter.allows("player-a", "move", limit, 2_001)).toBe(true);
    limiter.clearPlayer("player-a");
    expect(limiter.allows("player-a", "move", limit, 2_002)).toBe(true);
  });
});

describe("message payload bounds", () => {
  it("rejects oversized, cyclic, and oversized identifiers", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(isBoundedMessage({ payload: "x".repeat(1025) })).toBe(false);
    expect(isBoundedMessage(cyclic)).toBe(false);
    expect(isBoundedIdentifier("vent-bridge")).toBe(true);
    expect(isBoundedIdentifier("x".repeat(129))).toBe(false);
  });
});
