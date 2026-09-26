import { GamePhase, PlayerRole } from "@starfall/shared";
const MAX_MOVEMENT_MAGNITUDE = 1;
export function normalizeMovement(direction) {
    const magnitude = Math.hypot(direction.x, direction.y);
    if (!Number.isFinite(magnitude) || magnitude === 0) {
        return { x: 0, y: 0 };
    }
    if (magnitude <= MAX_MOVEMENT_MAGNITUDE) {
        return { x: direction.x, y: direction.y };
    }
    return { x: direction.x / magnitude, y: direction.y / magnitude };
}
export function getAvailableActions(context) {
    const canAct = context.phase === GamePhase.Playing &&
        context.isAlive &&
        !context.isVenting;
    return {
        canKill: canAct &&
            context.role === PlayerRole.Killer &&
            context.hasNearbyKillTarget,
        canCallMeeting: canAct,
    };
}
export class PlayerInputController {
    keyboardMovement = { x: 0, y: 0 };
    touchMovement = { x: 0, y: 0 };
    getMovement() {
        const source = this.touchMovement.x !== 0 || this.touchMovement.y !== 0
            ? this.touchMovement
            : this.keyboardMovement;
        return normalizeMovement(source);
    }
    setKeyboardMovement(direction) {
        this.keyboardMovement = normalizeMovement(direction);
    }
    setTouchMovement(direction) {
        this.touchMovement = normalizeMovement(direction);
    }
    clearTouchMovement() {
        this.touchMovement = { x: 0, y: 0 };
    }
}
