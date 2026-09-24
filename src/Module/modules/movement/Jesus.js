import hooks from "../../../hooks";
import blockUtils from "../../../utils/blockUtils";
import Module from "../../Module";

let waterId = 34;
let stoneId = 1;

export default class Jesus extends Module {
    constructor() {
        super("Jesus", "Movement", null);
    }

    onEnable() {
        let waterMgr = blockUtils.fromBlockStateId(waterId).manager;
        let StoneBlock = blockUtils.fromBlockStateId(stoneId).manager.block.constructor;

        if (!this.waterBlock) this.waterBlock = waterMgr.block;

        waterMgr.block = new StoneBlock();
        waterMgr.block.id = waterId;
        waterMgr.block.isReplaceable = true;
        waterMgr.block.transparent = true;
        waterMgr.block.fullBlock = false;

    }

    onDisable() {
        let waterMgr = blockUtils.fromBlockStateId(waterId).manager;
        waterMgr.block = this.waterBlock;
    }
}