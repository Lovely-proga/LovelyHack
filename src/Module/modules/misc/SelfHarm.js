import hooks from "../../../hooks";
import Module from "../../Module";

export default class SelfHarm extends Module {
    constructor() {
        super("SelfHarm", "Misc");
    }

    onEnable() {
        hooks.game.controller.objectMouseOver.hitVec = hooks.game.player.pos.clone();
        hooks.game.controller.attackEntity(hooks.game.player);
        this.disable();
    }
}