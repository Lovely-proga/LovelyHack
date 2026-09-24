import events from "./events";

export default {
    gameScript: "",
    
    get game () {
        if (this._game) {
            return this._game;
        } else {
            return this._game = Object.values(document.querySelector("#react"))[0].updateQueue.baseState.element.props.game;
        }
    },

    async getGameScript () {
        const scriptEl = Object.values(document.scripts).find(script => script.src.includes("index-"));

        if (scriptEl.src) {
            const res = await fetch(scriptEl.src);
            this.gameScript = await res.text();
        }
    },

    hookOnTick () {
        let hooksContext = this;
        this._fixedUpdate = this.game.fixedUpdate;
        this.game.fixedUpdate = function () {
            events.emit("beforeTick");
            let returnVal = hooksContext._fixedUpdate.apply(this, arguments);
            events.emit("afterTick");
            return returnVal;
        }
    }
}