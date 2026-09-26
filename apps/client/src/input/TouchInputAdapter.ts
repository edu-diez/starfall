import { InputController } from "./InputController";

export interface TouchInputAdapterOptions {
  deadZone?: number;
}

export class TouchInputAdapter {
  private activePointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 1;
  private readonly deadZone: number;

  public constructor(
    private readonly controller: InputController,
    options: TouchInputAdapterOptions = {},
  ) {
    this.deadZone = options.deadZone ?? 0.1;
  }

  public attach(element: HTMLElement): void {
    element.addEventListener("pointerdown", this.handlePointerDown);
    element.addEventListener("pointermove", this.handlePointerMove);
    element.addEventListener("pointerup", this.handlePointerEnd);
    element.addEventListener("pointercancel", this.handlePointerEnd);
    element.addEventListener("lostpointercapture", this.handlePointerEnd);
  }

  public detach(element: HTMLElement): void {
    element.removeEventListener("pointerdown", this.handlePointerDown);
    element.removeEventListener("pointermove", this.handlePointerMove);
    element.removeEventListener("pointerup", this.handlePointerEnd);
    element.removeEventListener("pointercancel", this.handlePointerEnd);
    element.removeEventListener("lostpointercapture", this.handlePointerEnd);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.activePointerId = event.pointerId;
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    this.radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    target.setPointerCapture(event.pointerId);
    event.preventDefault();
    this.updateMovement(event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    event.preventDefault();
    this.updateMovement(event);
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.controller.clearTouchMovement();
  };

  private updateMovement(event: PointerEvent): void {
    const x = (event.clientX - this.centerX) / this.radius;
    const y = (event.clientY - this.centerY) / this.radius;
    const magnitude = Math.hypot(x, y);
    if (magnitude <= this.deadZone) {
      this.controller.clearTouchMovement();
      return;
    }
    this.controller.setTouchMovement({ x, y });
  }
}
