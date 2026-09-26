import { describe, expect, it } from "vitest";
import { GamePhase, PlayerRole } from "@starfall/shared";
import { getAvailableActions, normalizeMovement, PlayerInputController, } from "./InputController";
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
        };
        adapter.handlePointerDown({
            pointerId: 7,
            currentTarget: target,
            clientX: 100,
            clientY: 50,
            preventDefault: () => undefined,
        });
        expect(controller.getMovement().x).toBe(1);
        adapter.handlePointerEnd({
            pointerId: 7,
        });
        expect(controller.getMovement()).toEqual({ x: 0, y: 0 });
    });
});
describe("getAvailableActions", () => {
    it("exposes only actions valid for local role and phase", () => {
        expect(getAvailableActions({
            phase: GamePhase.Playing,
            role: PlayerRole.Killer,
            isAlive: true,
            isVenting: false,
            hasNearbyKillTarget: true,
        })).toEqual({ canKill: true, canCallMeeting: true });
        expect(getAvailableActions({
            phase: GamePhase.Voting,
            role: PlayerRole.Killer,
            isAlive: true,
            isVenting: false,
            hasNearbyKillTarget: true,
        })).toEqual({ canKill: false, canCallMeeting: false });
        expect(getAvailableActions({
            phase: GamePhase.Playing,
            role: PlayerRole.Crewmate,
            isAlive: true,
            isVenting: false,
            hasNearbyKillTarget: true,
        })).toEqual({ canKill: false, canCallMeeting: true });
    });
});
