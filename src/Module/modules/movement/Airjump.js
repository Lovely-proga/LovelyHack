import hooks from "../../../hooks";
import Module from "../../Module";

export default class Airjump extends Module {
    constructor() {
        super("Airjump", "Movement", null);
    }

    beforeTick() {
        if (hooks.game.player.jumping) hooks.game.player.onGround = true;
    }
}