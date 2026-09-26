import { describe, expect, it, vi } from "vitest";
import { GamePhase, PlayerRole } from "@starfall/shared";
import {
  getAvailableActions,
  normalizeMovement,
  PlayerInputController,
} from "./InputController";
import { DesktopInputAdapter } from "./DesktopInputAdapter";
import { TouchInputAdapter } from "./TouchInputAdapter";

describe("PlayerInputController", () => {
  it("normalizes equivalent desktop and touch diagonal intentions", () => {
    const controller = new PlayerInputController();
    controller.setKeyboardMovement({ x: 1, y: 1 });
    const keyboard = controller.getMovement();

    controller.setTouchMovement({ x: 4, y: 4 });
    const touch = controller.getMovement();

    expect(Math.hypot(keyboard.x, keyboard.y)).toBeCloseTo(1);
    expect(touch).toEqual(keyboard);
  });

  it("bounds malformed movement directions", () => {
    expect(normalizeMovement({ x: Number.NaN, y: 1 })).toEqual({ x: 0, y: 0 });
    expect(normalizeMovement({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
  });

  it("resets touch movement when its pointer is released", () => {
    const controller = new PlayerInputController();
    const adapter = new TouchInputAdapter(controller);
    const target = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      }),
      setPointerCapture: () => undefined,
    } as unknown as HTMLElement;

    (
      adapter as unknown as { handlePointerDown: (event: PointerEvent) => void }
    ).handlePointerDown({
      pointerId: 7,
      currentTarget: target,
      clientX: 100,
      clientY: 50,
      preventDefault: () => undefined,
    } as unknown as PointerEvent);
    expect(controller.getMovement().x).toBe(1);

    (
      adapter as unknown as { handlePointerEnd: (event: PointerEvent) => void }
    ).handlePointerEnd({
      pointerId: 7,
    } as PointerEvent);
    expect(controller.getMovement()).toEqual({ x: 0, y: 0 });
  });

  it("does not capture typing keys from text inputs", () => {
    const controller = new PlayerInputController();
    const adapter = new DesktopInputAdapter(controller, {
      onAction: () => undefined,
    });
    const preventDefault = vi.fn();
    const target = Object.assign(new EventTarget(), {
      tagName: "INPUT",
      isContentEditable: false,
    });

    (
      adapter as unknown as { handleKeyDown: (event: KeyboardEvent) => void }
    ).handleKeyDown({
      key: "a",
      target,
      preventDefault,
      repeat: false,
    } as unknown as KeyboardEvent);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(controller.getMovement()).toEqual({ x: 0, y: 0 });
  });
});

describe("getAvailableActions", () => {
  it("exposes only actions valid for local role and phase", () => {
    expect(
      getAvailableActions({
        phase: GamePhase.Playing,
        role: PlayerRole.Killer,
        isAlive: true,
        isVenting: false,
        hasNearbyKillTarget: true,
      }),
    ).toEqual({ canKill: true, canCallMeeting: true });

    expect(
      getAvailableActions({
        phase: GamePhase.Voting,
        role: PlayerRole.Killer,
        isAlive: true,
        isVenting: false,
        hasNearbyKillTarget: true,
      }),
    ).toEqual({ canKill: false, canCallMeeting: false });

    expect(
      getAvailableActions({
        phase: GamePhase.Playing,
        role: PlayerRole.Crewmate,
        isAlive: true,
        isVenting: false,
        hasNearbyKillTarget: true,
      }),
    ).toEqual({ canKill: false, canCallMeeting: true });
  });
});
