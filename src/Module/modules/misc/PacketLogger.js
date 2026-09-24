import Module from "../../Module";
import moduleManager from "../../moduleManager";

export default class PacketLogger extends Module {
    constructor() {
        super("PacketLogger", "Misc", {});
    }

    trimName (name) {
        return name.substring(0, 15);
    }

    onPacket(pkt) {
        let packetName = this.trimName(pkt.name);

        if (!this.options[packetName]) {
            this.options[packetName] = "true";
            moduleManager.modules['ClickGUI'].panels.find(panel => panel.title == this.category).refreshModuleSettings();
        }

        if (this.options[packetName] == "true") {
            console.log(pkt.name, pkt.data);
        }
    }
}