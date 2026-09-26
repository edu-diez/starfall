export interface PositionSnapshot {
  x: number;
  y: number;
  receivedAt: number;
}

export interface InterpolatedPosition {
  x: number;
  y: number;
}

export interface InterpolationDiagnostics {
  trackedPlayers: number;
  latestSnapshotAgeMs: number | null;
}

/**
 * Client-only history for rendering replicated remote positions. It never
 * mutates, predicts, or writes authoritative room state.
 */
export class RemoteSnapshotInterpolator {
  private readonly snapshots = new Map<string, PositionSnapshot[]>();
  private latestSnapshotAt: number | null = null;

  constructor(
    private readonly interpolationDelayMs = 100,
    private readonly discontinuityDistance = 120,
  ) {}

  record(
    playerId: string,
    position: { x: number; y: number },
    receivedAt: number,
  ): void {
    const previous = this.snapshots.get(playerId)?.at(-1);
    const isDiscontinuity =
      previous !== undefined &&
      Math.hypot(position.x - previous.x, position.y - previous.y) >
        this.discontinuityDistance;
    const snapshot: PositionSnapshot = { ...position, receivedAt };

    this.snapshots.set(playerId, isDiscontinuity ? [snapshot] : [
      ...(this.snapshots.get(playerId) ?? []),
      snapshot,
    ].slice(-2));
    this.latestSnapshotAt = receivedAt;
  }

  getPosition(playerId: string, renderAt: number): InterpolatedPosition | null {
    const history = this.snapshots.get(playerId);
    if (!history?.length) return null;

    const latest = history.at(-1)!;
    if (history.length === 1) return { x: latest.x, y: latest.y };

    const previous = history[0]!;
    const targetTime = renderAt - this.interpolationDelayMs;
    const duration = latest.receivedAt - previous.receivedAt;
    if (duration <= 0 || targetTime >= latest.receivedAt) {
      return { x: latest.x, y: latest.y };
    }
    if (targetTime <= previous.receivedAt) {
      return { x: previous.x, y: previous.y };
    }

    const progress = (targetTime - previous.receivedAt) / duration;
    return {
      x: previous.x + (latest.x - previous.x) * progress,
      y: previous.y + (latest.y - previous.y) * progress,
    };
  }

  remove(playerId: string): void {
    this.snapshots.delete(playerId);
  }

  reset(): void {
    this.snapshots.clear();
    this.latestSnapshotAt = null;
  }

  getDiagnostics(now: number): InterpolationDiagnostics {
    return {
      trackedPlayers: this.snapshots.size,
      latestSnapshotAgeMs:
        this.latestSnapshotAt === null ? null : Math.max(0, now - this.latestSnapshotAt),
    };
  }
}
