import { describe, expect, it } from "vitest";
import { RemoteSnapshotInterpolator } from "./RemoteSnapshotInterpolator";

describe("RemoteSnapshotInterpolator", () => {
  it("interpolates remote snapshots without mutating their source positions", () => {
    const interpolator = new RemoteSnapshotInterpolator(100, 300);
    const first = { x: 10, y: 20 };
    const second = { x: 110, y: 220 };

    interpolator.record("remote", first, 1_000);
    interpolator.record("remote", second, 1_100);

    expect(interpolator.getPosition("remote", 1_150)).toEqual({ x: 60, y: 120 });
    expect(first).toEqual({ x: 10, y: 20 });
    expect(second).toEqual({ x: 110, y: 220 });
  });

  it("snaps large position discontinuities instead of interpolating through walls", () => {
    const interpolator = new RemoteSnapshotInterpolator(100, 50);
    interpolator.record("remote", { x: 100, y: 100 }, 1_000);
    interpolator.record("remote", { x: 600, y: 100 }, 1_100);

    expect(interpolator.getPosition("remote", 1_050)).toEqual({
      x: 600,
      y: 100,
    });
  });

  it("removes presentation history when a remote player leaves", () => {
    const interpolator = new RemoteSnapshotInterpolator();
    interpolator.record("remote", { x: 10, y: 20 }, 1_000);
    interpolator.remove("remote");

    expect(interpolator.getPosition("remote", 1_100)).toBeNull();
    expect(interpolator.getDiagnostics(1_100).trackedPlayers).toBe(0);
  });
});
