import events from "../events";
import Criticals from "./modules/combat/Criticals";
import Killaura from "./modules/combat/Killaura";
import ChatBypass from "./modules/misc/ChatBypass";
import CraftingUnlock from "./modules/misc/CraftingUnlock";
import FastBreak from "./modules/misc/FastBreak";
import NoFall from "./modules/misc/NoFall";
import PacketLogger from "./modules/misc/PacketLogger";
import SelfHarm from "./modules/misc/SelfHarm";
import ViewCmdBlockCode from "./modules/misc/ViewCmdBlockCode";
import Airjump from "./modules/movement/Airjump";
import HighJump from "./modules/movement/HighJump";
import Jesus from "./modules/movement/Jesus";
import Phase from "./modules/movement/Phase";
import Scaffold from "./modules/movement/Scaffold";
import Speed from "./modules/movement/Speed";
import Spider from "./modules/movement/Spider";
import Step from "./modules/movement/Step";
import ArrayList from "./modules/visual/Arraylist";
import Chams from "./modules/visual/Chams";
import ClickGUI from "./modules/visual/ClickGUI";

import Watermark from "./modules/visual/Watermark";
import Crasher from "./modules/world/Crasher";
import OwnerSpoof from "./modules/world/OwnerSpoof";

export default {
    modules: {},
    addModules: function (...modules) {
        for(const module of modules) {
            let moduleInstance = new module;
            this.modules[moduleInstance.name] = moduleInstance;
        }
    },
    addModule: function (module) {
        this.modules[module.name] = module;
    },
    handleKeyPress: function (key) {
        for (let name in this.modules) {
            let module = this.modules[name];


            if (module.waitingForBind) {
                module.keybind = key;
                module.waitingForBind = false;
            } else if (key && module.keybind == key) {
                module.toggle();
            }
        }
    },

    init () {
        this.addModules(

            // visual
            Watermark,
            ClickGUI,
            ArrayList,
            Chams,

            // movement
            Airjump,
            Phase,
            Step,
            HighJump,
            Speed,
            Scaffold,
            Spider,
            Jesus,

            // combat
            Killaura,
            Criticals,

            // misc
            SelfHarm,
            NoFall,
            ChatBypass,
            PacketLogger,
            ViewCmdBlockCode,
            CraftingUnlock,
            FastBreak,

            // world
            Crasher,
            OwnerSpoof
        );

        events.on("render", () => {
            for (let name in this.modules) {
                if (this.modules[name].isEnabled) {
                    this.modules[name].onRender();
                }
            }
        });

        events.on("beforeTick", () => {
            for (let name in this.modules) {
                if (this.modules[name].isEnabled) {
                    this.modules[name].beforeTick();
                }
            }
        });

        events.on("afterTick", () => {
            for (let name in this.modules) {
                if (this.modules[name].isEnabled) {
                    this.modules[name].afterTick();
                }
            }
        });

        events.on("packet", (data) => {
            for (let name in this.modules) {
                if (this.modules[name].isEnabled) {
                    this.modules[name].onPacket(data);
                }
            }
        });

        events.on("keydown", this.handleKeyPress.bind(this));
        events.on("setting.update", data => {
            for (let name in this.modules) {
                if (this.modules[name].isEnabled || data.moduleName === name) {
                    this.modules[name].onSettingUpdate(data.moduleName, data.setting, data.value);
                }
            }
        });

        this.modules["Arraylist"].enable();
        this.modules["Watermark"].enable();
    }
};