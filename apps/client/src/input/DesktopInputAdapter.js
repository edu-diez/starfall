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
    controller;
    options;
    pressedKeys = new Set();
    constructor(controller, options) {
        this.controller = controller;
        this.options = options;
    }
    attach(target = window) {
        target.addEventListener("keydown", this.handleKeyDown);
        target.addEventListener("keyup", this.handleKeyUp);
        target.addEventListener("blur", this.handleBlur);
    }
    detach(target = window) {
        target.removeEventListener("keydown", this.handleKeyDown);
        target.removeEventListener("keyup", this.handleKeyUp);
        target.removeEventListener("blur", this.handleBlur);
    }
    handleKeyDown = (event) => {
        const key = event.key.toLowerCase();
        if (MOVEMENT_KEYS.has(key)) {
            event.preventDefault();
            this.pressedKeys.add(key);
            this.publishMovement();
            return;
        }
        if (event.repeat)
            return;
        if (key === " " || key === "k") {
            event.preventDefault();
            this.options.onAction("kill");
        }
        else if (key === "e" || key === "m") {
            event.preventDefault();
            this.options.onAction("meeting");
        }
    };
    handleKeyUp = (event) => {
        const key = event.key.toLowerCase();
        if (!MOVEMENT_KEYS.has(key))
            return;
        event.preventDefault();
        this.pressedKeys.delete(key);
        this.publishMovement();
    };
    handleBlur = () => {
        this.pressedKeys.clear();
        this.publishMovement();
    };
    publishMovement() {
        const direction = {
            x: (this.pressedKeys.has("arrowright") || this.pressedKeys.has("d")
                ? 1
                : 0) -
                (this.pressedKeys.has("arrowleft") || this.pressedKeys.has("a")
                    ? 1
                    : 0),
            y: (this.pressedKeys.has("arrowdown") || this.pressedKeys.has("s")
                ? 1
                : 0) -
                (this.pressedKeys.has("arrowup") || this.pressedKeys.has("w") ? 1 : 0),
        };
        this.controller.setKeyboardMovement(direction);
    }
}
