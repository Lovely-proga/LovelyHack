import Module from "../../Module";

export default class ChatBypass extends Module {
    constructor() {
        super("ChatBypass", "Misc");
    }

    onPacket(pkt) {
        if (pkt.name == "SPacketMessage") {
			pkt.data.text = pkt.data.text.split(" ").map((w) => `${w.charAt(0)}\\${w.slice(1)}`).join(" ");
		}
    }
}