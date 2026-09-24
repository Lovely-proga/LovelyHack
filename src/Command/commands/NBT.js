import hooks from "../../hooks";
import packetUtils from "../../utils/packetUtils";
import Command from "../Command";

export default class NBT extends Command {
    constructor() {
        super("NBT", "read or write NBT data", ["cmd", "data"]);
    }

    async execute(args) {
        const cmd = args[0];
        let data;

        if (args.length > 1) {
            try {
                data = JSON.parse(args.slice(1).join(" "));
            } catch (e) {
                hooks.game.chat.addChat({ text: "Invalid JSON provided!" });
                return;
            }
        } else {
            try {
                const clipboardText = await navigator.clipboard.readText();
                data = JSON.parse(clipboardText);
            } catch (e) {
                hooks.game.chat.addChat({ text: "No valid JSON in clipboard!" });
                return;
            }
        }

        if (cmd === "read") {
            const item = hooks.game.player.inventory.getCurrentItem();
            console.log(item);
        } else if (cmd === "write") {
            const item = hooks.game.player.inventory.getCurrentItem();

            for (let key in data) {
                item[key] = data[key];
            }

            packetUtils.sendPacket(hooks.game.player.inventory.sendInventoryToServer());

            hooks.game.chat.addChat({
                text: `Successfully wrote NBT data to item`
            });
        }
    }
}
