import events from "../events";
import hooks from "../hooks";
import Give from "./commands/Give";
import Help from "./commands/Help";
import NBT from "./commands/NBT";

export default {
    commands: {},
    prefix: ".",
    registerCommand(cmdClass) {
        let cmd = new cmdClass();
        this.commands[cmd.name.toLowerCase()] = cmd;
    },

    registerCommands: function (...commands) {
        for(const cmdClass of commands) {
            this.registerCommand(cmdClass);
        }
    },

    onPacket (pkt) {
        if (pkt.name == "SPacketMessage") {
            const message = pkt.data.text;
            if (message.startsWith(this.prefix)) {
                const args = message.slice(this.prefix.length).split(" ");
                const commandName = args.shift().toLowerCase();
                const command = this.commands[commandName];
                if (command) {
                    command.execute(args);
                } else {
                    hooks.game.chat.addChat({
                        text: "Unknown command. Type .help for a list of commands."
                    })
                }
                pkt.data.text = ""; // cancel
            }
		}
    },

    init () {
        events.on("packet", this.onPacket.bind(this));

        this.registerCommands(
            Help,
            Give,
            NBT
        );
    }
}