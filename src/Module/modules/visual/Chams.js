import hooks from "../../../hooks";
import Module from "../../Module";

export default class Chams extends Module {
    constructor () {
        super("Chams", "Visual", "");
    }

    onEnable() {
        let cRenderPlayer = hooks.game.player.mesh.constructor.prototype;
        this._renderPlayers = this.__renderPlayers || cRenderPlayer.render;
        let context = this;

        cRenderPlayer.render = function () {
            for (const mesh in this.meshes) {
                this.meshes[mesh].material.depthTest = false;
                this.meshes[mesh].renderOrder = 3;
            }
                        
            for (const mesh in this.armorMesh) {
                this.armorMesh[mesh].material.depthTest = false;
                this.armorMesh[mesh].renderOrder = 4;
            }
                        
            if (this.capeMesh) {
                this.capeMesh.children[0].material.depthTest = false;
                this.capeMesh.children[0].renderOrder = 5;
            }
                        
            if (this.hatMesh) {
                for (const mesh of this.hatMesh.children[0].children) {
                    if (!mesh.material) continue;
                    mesh.material.depthTest = false;
                    mesh.renderOrder = 4;
                }
            }
            return context._renderPlayers.apply(this, arguments);
        }
    }

    onDisable() {
        let cRenderPlayer = hooks.game.player.mesh.constructor.prototype;
        cRenderPlayer.render = this._renderPlayers;

        // ill make it reset renderOrder and stuff some day thats so much work rn
    }
};