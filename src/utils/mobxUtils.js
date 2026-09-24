import hooks from "../hooks";

export default {
    get adminSym () {
        return Object.getOwnPropertySymbols(hooks.game.serverInfo)[0];
    },

    defineMobxProp (object, propName, getter, setter) {
        Object.defineProperty(object[this.adminSym].values_.get(propName), "value_", {
            get: getter,
            set: setter,
            configurable: true
        })
    },

    setMobxProp (object, propName, value) {
        Object.defineProperty(object[this.adminSym].values_.get(propName), "value_", {
            value: value,
            configurable: true
        })
    }
}