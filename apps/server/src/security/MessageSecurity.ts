export interface MessageRateLimit {
  /** Maximum accepted commands inside one rolling window. */
  maxEvents: number;
  /** Length of the rolling window in milliseconds. */
  windowMs: number;
}

/**
 * Server-private rolling-window limiter. It intentionally stores no payloads
 * and is cleared whenever a player permanently leaves a room.
 */
export class MessageRateLimiter {
  private readonly events = new Map<string, number[]>();

  allows(
    sessionId: string,
    messageType: string,
    limit: MessageRateLimit,
    now = Date.now(),
  ): boolean {
    const key = `${sessionId}:${messageType}`;
    const earliest = now - limit.windowMs;
    const recent = (this.events.get(key) ?? []).filter(
      (timestamp) => timestamp > earliest,
    );
    if (recent.length >= limit.maxEvents) {
      this.events.set(key, recent);
      return false;
    }
    recent.push(now);
    this.events.set(key, recent);
    return true;
  }

  clearPlayer(sessionId: string): void {
    const prefix = `${sessionId}:`;
    for (const key of this.events.keys()) {
      if (key.startsWith(prefix)) this.events.delete(key);
    }
  }
}

/** Reject payloads that cannot be safely processed as a bounded JSON command. */
export function isBoundedMessage(value: unknown, maxBytes = 1024): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8") <= maxBytes;
  } catch {
    return false;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isBoundedIdentifier(
  value: unknown,
  maxLength = 128,
): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}
