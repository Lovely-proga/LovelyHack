import hooks from "../hooks"

export default {
    placeBlock (pos, side, lookDir) {
        hooks.game.controller.onPlayerRightClick({
            sneak: false,
            getActiveItemStack: () => null,
            mode: {
                isSpectator: () => false
            }
        }, {
            getBlockState: function () {
                return {
                    getBlock: function () {
                        return {
                            onBlockActivated: function () {}
                        }
                    }
                }
            }
        }, {
            item: {
                canPlaceBlockOnSide: () => false,
                isItemBlock: () => true
            }
        }, pos, {
                toProto: () => side
        }, lookDir)
    }
}