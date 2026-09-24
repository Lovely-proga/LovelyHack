import hooks from "../../../hooks";
import Module from "../../Module";

export default class HighJump extends Module {
    constructor() {
        super("HighJump", "Movement", {
            "Jump Velocity": 0.6
        });
    }

    onEnable() {
        hooks.game.player.initialJumpVelocity = parseFloat(this.options["Jump Velocity"]);
    }

    onDisable() {
        hooks.game.player.initialJumpVelocity = 0.42;
    }
}