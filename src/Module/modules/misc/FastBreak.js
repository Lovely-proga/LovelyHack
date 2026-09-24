import hooks from "../../../hooks";
import Module from "../../Module";

export default class FastBreak extends Module {
    constructor() {
        super("FastBreak", "Misc", {
            "Multiplier": 1.1
        });
    }

    get Block () {
        return Blocks.stone.constructor.__proto__;
    }

    onEnable() {
        this._getPlayerRelativeBlockHardness = this._getPlayerRelativeBlockHardness || this.Block.prototype.getPlayerRelativeBlockHardness;
        let moduleContext = this;
        this.Block.prototype.getPlayerRelativeBlockHardness = function (player) {
            const hardness = this.hardness;
            if (hardness < 0) return 0;

            const base = player.canHarvestBlock(this)
                ? player.getToolDigEfficiency(this) / hardness / 30
                : player.getToolDigEfficiency(this) / hardness / 100;

            return base * parseFloat(moduleContext.options["Multiplier"]);
        };
    }

    onDisable() {
        this.Block.prototype.getPlayerRelativeBlockHardness = this._getPlayerRelativeBlockHardness;
    }
}