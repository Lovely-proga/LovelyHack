import hooks from "../../../hooks";
import Module from "../../Module";

export default class Speed extends Module {
    constructor() {
        super("Speed", "Movement", {
            "Air Speed": 0.03
        });
    }

    onEnable() {
        hooks.game.player.speedInAir = parseFloat(this.options["Air Speed"]);
    }

    onDisable() {
        hooks.game.player.speedInAir = 0.02;
    }
}