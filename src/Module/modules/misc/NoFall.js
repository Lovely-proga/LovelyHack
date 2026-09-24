import hooks from "../../../hooks";
import Module from "../../Module";

export default class NoFall extends Module {
    constructor() {
        super("NoFall", "Misc");
    }

    afterTick() {
        if (hooks.game.player.motion.y < -0.5 && !hooks.game.player.jumping) {
            hooks.game.player.onGround = true;
            hooks.game.player.sendPositionAndRotation();
            hooks.game.player.onGround = false;
        }
    }
}
