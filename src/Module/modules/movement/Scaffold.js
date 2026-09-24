import hooks from "../../../hooks";
import blockUtils from "../../../utils/blockUtils";
import interactionUtils from "../../../utils/interactionUtils";
import Module from "../../Module";

export default class Scaffold extends Module {
    constructor() {
        super("Scaffold", "Movement", {
            "Client Place": true,
            "Extend": 3
        });
    }

    tryPlace (x, y, z) {
        const holdingBlock = hooks.game.player.inventory.getCurrentItem()?.item?.block?.defaultState;

        const blockPos = new blockUtils.BlockPos( x, y, z );
        const currentBlock = hooks.game.world.getBlockState(blockPos);

        if (currentBlock?.id === 0) {
            if (this.options["Client Place"]) hooks.game.world.setBlockState(blockPos, holdingBlock);
            interactionUtils.placeBlock(blockPos, 1, { x: 0, y: 0, z: 0 });
        }
    }

    afterTick() {
        const holdingBlock = hooks.game.player.inventory.getCurrentItem()?.item?.block?.defaultState;
        if (!holdingBlock) return;

        const playerPos = hooks.game.player.pos.clone().floor();

        const yawRad = hooks.game.player.yaw;
        const forwardX = -Math.sin(yawRad);
        const forwardZ = -Math.cos(yawRad);

        this.tryPlace(playerPos.x, playerPos.y - 1, playerPos.z);

        if (!hooks.game.player.onGround) return;

        const extend = parseInt(this.options["Extend"]);
        for (let i = 1; i <= extend; i++) {
            const posX = Math.floor(playerPos.x + forwardX * i + 0.5);
            const posY = playerPos.y - 1;
            const posZ = Math.floor(playerPos.z + forwardZ * i + 0.5);

            this.tryPlace(posX, posY, posZ);
        }
    }
}
