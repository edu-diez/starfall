import { Vec2 } from "@starfall/shared";
import { InputController } from "./InputController";

export type DesktopAction = "kill" | "meeting";

export interface DesktopInputAdapterOptions {
  onAction: (action: DesktopAction) => void;
}

const MOVEMENT_KEYS = new Set([
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "w",
  "a",
  "s",
  "d",
]);

export class DesktopInputAdapter {
  private readonly pressedKeys = new Set<string>();

  public constructor(
    private readonly controller: InputController,
    private readonly options: DesktopInputAdapterOptions,
  ) {}

  public attach(target: Window = window): void {
    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("blur", this.handleBlur);
  }

  public detach(target: Window = window): void {
    target.removeEventListener("keydown", this.handleKeyDown);
    target.removeEventListener("keyup", this.handleKeyUp);
    target.removeEventListener("blur", this.handleBlur);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (MOVEMENT_KEYS.has(key)) {
      event.preventDefault();
      this.pressedKeys.add(key);
      this.publishMovement();
      return;
    }

    if (event.repeat) return;
    if (key === " " || key === "k") {
      event.preventDefault();
      this.options.onAction("kill");
    } else if (key === "e" || key === "m") {
      event.preventDefault();
      this.options.onAction("meeting");
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (!MOVEMENT_KEYS.has(key)) return;
    event.preventDefault();
    this.pressedKeys.delete(key);
    this.publishMovement();
  };

  private readonly handleBlur = (): void => {
    this.pressedKeys.clear();
    this.publishMovement();
  };

  private publishMovement(): void {
    const direction: Vec2 = {
      x:
        (this.pressedKeys.has("arrowright") || this.pressedKeys.has("d")
          ? 1
          : 0) -
        (this.pressedKeys.has("arrowleft") || this.pressedKeys.has("a")
          ? 1
          : 0),
      y:
        (this.pressedKeys.has("arrowdown") || this.pressedKeys.has("s")
          ? 1
          : 0) -
        (this.pressedKeys.has("arrowup") || this.pressedKeys.has("w") ? 1 : 0),
    };
    this.controller.setKeyboardMovement(direction);
  }
}
