import hooks from "../../../hooks";
import Module from "../../Module";

export default class Phase extends Module {
    constructor() {
        super("Phase", "Movement", null);
    }

    onEnable() {
        hooks.game.player.height = 0;
    }

    onDisable() {
        hooks.game.player.height = 1.8;
    }
}