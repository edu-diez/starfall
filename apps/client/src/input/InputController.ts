import { GamePhase, PlayerRole, Vec2 } from "@starfall/shared";

export interface InputController {
  getMovement(): Vec2;
  setKeyboardMovement(direction: Vec2): void;
  setTouchMovement(direction: Vec2): void;
  clearTouchMovement(): void;
}

export interface LocalActionContext {
  phase: GamePhase | null;
  role: PlayerRole | null;
  isAlive: boolean;
  isVenting: boolean;
  hasNearbyKillTarget: boolean;
}

export interface AvailableActions {
  canKill: boolean;
  canCallMeeting: boolean;
}

const MAX_MOVEMENT_MAGNITUDE = 1;

export function normalizeMovement(direction: Vec2): Vec2 {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return { x: 0, y: 0 };
  }

  if (magnitude <= MAX_MOVEMENT_MAGNITUDE) {
    return { x: direction.x, y: direction.y };
  }

  return { x: direction.x / magnitude, y: direction.y / magnitude };
}

export function getAvailableActions(
  context: LocalActionContext,
): AvailableActions {
  const canAct =
    context.phase === GamePhase.Playing &&
    context.isAlive &&
    !context.isVenting;
  return {
    canKill:
      canAct &&
      context.role === PlayerRole.Killer &&
      context.hasNearbyKillTarget,
    canCallMeeting: canAct,
  };
}

export class PlayerInputController implements InputController {
  private keyboardMovement: Vec2 = { x: 0, y: 0 };
  private touchMovement: Vec2 = { x: 0, y: 0 };

  public getMovement(): Vec2 {
    const source =
      this.touchMovement.x !== 0 || this.touchMovement.y !== 0
        ? this.touchMovement
        : this.keyboardMovement;
    return normalizeMovement(source);
  }

  public setKeyboardMovement(direction: Vec2): void {
    this.keyboardMovement = normalizeMovement(direction);
  }

  public setTouchMovement(direction: Vec2): void {
    this.touchMovement = normalizeMovement(direction);
  }

  public clearTouchMovement(): void {
    this.touchMovement = { x: 0, y: 0 };
  }
}
