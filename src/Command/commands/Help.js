import hooks from "../../hooks";
import Command from "../Command";
import commandManager from "../commandManager";

export default class Help extends Command {
    constructor() {
        super("help", "Displays a list of available commands", []);
    }

    execute(args) {
        hooks.game.chat.addChat({
            text: "Available commands:"
        })

        Object.values(commandManager.commands).forEach(cmd => {
            hooks.game.chat.addChat({
                text: `.${cmd.name} - ${cmd.description}`
            })
        });
    }
}