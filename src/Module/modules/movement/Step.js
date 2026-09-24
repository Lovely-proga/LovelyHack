import hooks from "../../../hooks";
import Module from "../../Module";

export default class Step extends Module {
    constructor() {
        super("Step", "Movement", {
            "Height": 2
        });
    }

    onEnable() {
        hooks.game.player.stepHeight = parseFloat(this.options.Height);
    }

    onDisable() {
        hooks.game.player.stepHeight = 0.6;
    }
}