export class TouchInputAdapter {
    controller;
    activePointerId = null;
    centerX = 0;
    centerY = 0;
    radius = 1;
    deadZone;
    constructor(controller, options = {}) {
        this.controller = controller;
        this.deadZone = options.deadZone ?? 0.1;
    }
    attach(element) {
        element.addEventListener("pointerdown", this.handlePointerDown);
        element.addEventListener("pointermove", this.handlePointerMove);
        element.addEventListener("pointerup", this.handlePointerEnd);
        element.addEventListener("pointercancel", this.handlePointerEnd);
        element.addEventListener("lostpointercapture", this.handlePointerEnd);
    }
    detach(element) {
        element.removeEventListener("pointerdown", this.handlePointerDown);
        element.removeEventListener("pointermove", this.handlePointerMove);
        element.removeEventListener("pointerup", this.handlePointerEnd);
        element.removeEventListener("pointercancel", this.handlePointerEnd);
        element.removeEventListener("lostpointercapture", this.handlePointerEnd);
    }
    handlePointerDown = (event) => {
        if (this.activePointerId !== null)
            return;
        const target = event.currentTarget;
        const rect = target.getBoundingClientRect();
        this.activePointerId = event.pointerId;
        this.centerX = rect.left + rect.width / 2;
        this.centerY = rect.top + rect.height / 2;
        this.radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
        target.setPointerCapture(event.pointerId);
        event.preventDefault();
        this.updateMovement(event);
    };
    handlePointerMove = (event) => {
        if (event.pointerId !== this.activePointerId)
            return;
        event.preventDefault();
        this.updateMovement(event);
    };
    handlePointerEnd = (event) => {
        if (event.pointerId !== this.activePointerId)
            return;
        this.activePointerId = null;
        this.controller.clearTouchMovement();
    };
    updateMovement(event) {
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
