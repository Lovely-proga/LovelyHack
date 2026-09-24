import hooks from "../hooks";

// prob dumb but idk anything ab this game

export default {
    fromBlockStateId (id) {
        let Chunk = hooks.game.world.chunkProvider.posToChunk.values().next().value.constructor;
        let blockState = null;

        Chunk.prototype.setBlockState.bind({
            getBlockState: function () {
                return {
                    equals: function (arg) {
                        blockState = arg;
                        return true;
                    }
                }
            }
        })(0, id)

        return blockState;
    },

    get BlockPos() {
        if (this._cBlockPos) return this._cBlockPos;

        let blockPos = {};
        hooks.game.world.setAirXYZ.bind({
            setBlockState: function (newBlockPos) {
                blockPos = newBlockPos;
            }
        })(0, 0, 0);

        this._cBlockPos = blockPos.constructor;
        return this._cBlockPos;
    }


}