import hooks from "../../hooks";
import packetUtils from "../../utils/packetUtils";
import Command from "../Command";

export default class Give extends Command {
    constructor() {
        super("give", "Gives a player an item", ["itemName"]);
    }

    execute(args) {
        // weird work around so i could try and give myself illegal items like "hell_portal"
        let itemName = args[0];
        let test = new Items.stone.constructor.__proto__("stone");
        test.name = itemName;

        let thing = Items?.[itemName] || Blocks[itemName];
        test.block = thing;
        test.id = thing.id;

        let index = hooks.game.controller.findHotbarSlotForPickBlock();
        hooks.game.player.inventory.main[index] = new ItemStack(test);
        packetUtils.sendPacket(hooks.game.player.inventory.sendInventoryToServer());
    }
}