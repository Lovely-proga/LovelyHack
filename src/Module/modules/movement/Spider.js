import hooks from "../../../hooks";
import Module from "../../Module";

export default class Spider extends Module {
    constructor() {
        super("Spider", "Movement", {
            "Climb Speed": 0.2
        });
    }

    afterTick() {
        if (hooks.game.player.isCollidedHorizontally) {
            hooks.game.player.motion.y = parseFloat(this.options["Climb Speed"]);
        }
    }
}