import hooks from "../../../hooks";
import mobxUtils from "../../../utils/mobxUtils";
import Module from "../../Module";

export default class OwnerSpoof extends Module {
    constructor() {
        super("OwnerSpoof", "World");
    }

    onEnable() {
        mobxUtils.defineMobxProp(hooks.game.serverInfo, "permissionLevel", () => 200, (v) => {});
    }

    onDisable() {
        mobxUtils.setMobxProp(hooks.game.serverInfo, "permissionLevel", 0);
    }
}