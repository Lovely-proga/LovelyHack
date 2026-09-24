import Module from "../../Module";

export default class ViewCmdBlockCode extends Module {
    constructor() {
        super("ViewCmdBlockCode", "Misc");

    }

    get CommandBlockLogic () {
        return Blocks.command_block.createNewTileEntity().commandBlockLogic.constructor.prototype;
    }

    onEnable() {
        this._tryOpenEditCommandBlock = this._tryOpenEditCommandBlock || this.CommandBlockLogic.tryOpenEditCommandBlock;

        this.CommandBlockLogic.tryOpenEditCommandBlock = function(player) {
            player.openEditCommandBlock(this);
        }
    }

    onDisable() {
        this.CommandBlockLogic.tryOpenEditCommandBlock = this._tryOpenEditCommandBlock;
    }
}