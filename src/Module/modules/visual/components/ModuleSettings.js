import events from "../../../../events";
import shadowWrapper from "../../../../shadowWrapper";

export default class ModuleSettings {
    constructor(module, container) {
        this.module = module;
        this.container = container;

        this.components = [];
        this.renderedOptions = new Set();

        this.initialized = false;
        this.isOpen = false;

        this.activeDropdown = null;
        this.currentOptionsList = null;
        this.activeDropdownListeners = null;
    }

    initialize() {
        if (this.initialized || !this.module?.options) return;

        this.settingsWrapper = document.createElement("div");
        this.settingsWrapper.className = "module-settings-wrapper";
        this.container.appendChild(this.settingsWrapper);

        this.settingsContainer = document.createElement("div");
        this.settingsContainer.className = "module-settings scrollable";
        this.settingsWrapper.appendChild(this.settingsContainer);

        this.container.style.position = "relative";

        const keys = Object.keys(this.module.options);
        const groups = this.groupSettings(keys);
        this.createSettings(groups);

        this.initialized = true;
    }

    groupSettings(keys) {
        return keys.reduce(
            (acc, key) => {
                const value = this.module.options[key];
                const type = typeof value;

                if (key.toLowerCase().includes("color")) {
                    acc.color.push(key);
                } else if (this.module.modes && this.module.modes[key]) {
                    acc.mode.push(key);
                } else if (type === "boolean" || value === "true" || value === "false") {
                    acc.boolean.push(key);
                } else {
                    acc.other.push(key);
                }
                return acc;
            },
            { boolean: [], mode: [], other: [], color: [] }
        );
    }

    createSettings(groups) {
        [...groups.boolean, ...groups.mode, ...groups.other, ...groups.color].forEach(key => {
            if (this.renderedOptions.has(key)) return;
            this.renderedOptions.add(key);

            const value = this.module.options[key];
            const type = typeof value;

            if (key.toLowerCase().includes("color")) {
                this.addColorPicker(key);
            } else if (this.module.modes && this.module.modes[key]) {
                this.addModeSelector(key);
            } else if (type === "boolean" || value === "true" || value === "false") {
                this.addCheckbox(key);
            } else if (type === "string") {
                this.addStringInput(key);
            } else {
                this.addNumberInput(key);
            }
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            this.settingsWrapper.classList.add("module-settings-open");
            this.checkPositionWithinViewport();
        } else {
            this.settingsWrapper.classList.remove("module-settings-open");
            this.closeAllDropdowns();
        }
    }

    checkPositionWithinViewport() {
        const rect = this.settingsWrapper.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
            const overflow = rect.bottom - window.innerHeight;
            this.settingsWrapper.style.maxHeight = `${rect.height - overflow - 10}px`;
        }
    }

    closeAllDropdowns() {
        document.querySelectorAll(".gui-dropdown-options").forEach(el => {
            if (shadowWrapper.wrapper.contains(el)) {
                shadowWrapper.wrapper.removeChild(el);
            }
        });

        if (this.activeDropdownListeners) {
            document.removeEventListener("click", this.activeDropdownListeners.outsideClickHandler);
            window.removeEventListener("scroll", this.activeDropdownListeners.hideDropdown, true);
            window.removeEventListener("resize", this.activeDropdownListeners.hideDropdown, true);
            this.activeDropdownListeners = null;
        }

        if (this.activeDropdown) {
            this.activeDropdown.classList.remove("open");
            this.activeDropdown = null;
        }

        this.currentOptionsList = null;
    }

    addNumberInput(name) {
        const container = document.createElement("div");
        container.className = "gui-setting-container setting-number";

        const label = document.createElement("div");
        label.className = "gui-setting-label";
        label.textContent = name;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "gui-text-input number-input";
        input.value = this.module.options[name];

        input.addEventListener("input", () => {
            const v = input.value.trim();
            if (!isNaN(v) && v !== "") {
                this.module.options[name] = v;
                events.emit("setting.update", { moduleName: this.module.name, setting: name, value: v });
            }
        });

        container.append(label, input);
        this.settingsContainer.appendChild(container);
        this.components.push(container);
    }

    addStringInput(name) {
        const container = document.createElement("div");
        container.className = "gui-setting-container setting-string";

        const label = document.createElement("div");
        label.className = "gui-setting-label";
        label.textContent = name;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "gui-text-input string-input";
        input.value = this.module.options[name];

        input.addEventListener("input", () => {
            this.module.options[name] = input.value;
            events.emit("setting.update", { moduleName: this.module.name, setting: name, value: input.value });
        });

        container.append(label, input);
        this.settingsContainer.appendChild(container);
        this.components.push(container);
    }

    addCheckbox(name) {
        const container = document.createElement("div");
        container.className = "gui-setting-container setting-boolean";

        const label = document.createElement("div");
        label.className = "gui-setting-label";
        label.textContent = name;

        const checkbox = document.createElement("div");
        checkbox.className = "gui-checkbox";
        checkbox.classList.toggle(
            "enabled",
            this.module.options[name] === true || this.module.options[name] === "true"
        );

        container.addEventListener("click", () => {
            const newState = !(this.module.options[name] === true || this.module.options[name] === "true");
            this.module.options[name] = newState.toString();
            checkbox.classList.toggle("enabled", newState);
            events.emit("setting.update", { moduleName: this.module.name, setting: name, value: newState.toString() });
        });

        container.append(label, checkbox);
        this.settingsContainer.appendChild(container);
        this.components.push(container);
    }

    addColorPicker(name) {
        const container = document.createElement("div");
        container.className = "gui-setting-container setting-color";

        const label = document.createElement("div");
        label.className = "gui-setting-label";
        label.textContent = name;

        const bg = document.createElement("div");
        bg.className = "gui-color-picker";
        bg.style.background = this.module.options[name];

        const input = document.createElement("input");
        input.type = "color";
        input.value = this.rgbToHex(this.module.options[name]);

        input.addEventListener("input", e => {
            bg.style.background = e.target.value;
            this.module.options[name] = e.target.value;
            events.emit("setting.update", { moduleName: this.module.name, setting: name, value: e.target.value });
        });

        bg.appendChild(input);
        container.append(label, bg);
        this.settingsContainer.appendChild(container);
        this.components.push(container);
    }

    addModeSelector(name) {
        const container = document.createElement("div");
        container.className = "gui-setting-container setting-mode";

        const label = document.createElement("div");
        label.className = "gui-setting-label";
        label.textContent = name;

        const dropdown = document.createElement("div");
        dropdown.className = "gui-dropdown";

        const selected = document.createElement("div");
        selected.className = "gui-dropdown-selected";
        selected.textContent = this.module.options[name];

        dropdown.appendChild(selected);

        dropdown.addEventListener("click", e => {
            e.stopPropagation();
            this.closeAllDropdowns();

            const list = document.createElement("div");
            list.className = "gui-dropdown-options";

            this.module.modes[name].forEach(mode => {
                const opt = document.createElement("div");
                opt.textContent = mode;
                opt.addEventListener("click", () => {
                    this.module.options[name] = mode;
                    selected.textContent = mode;
                    events.emit("setting.update", { moduleName: this.module.name, setting: name, value: mode });
                    this.closeAllDropdowns();
                });
                list.appendChild(opt);
            });

            shadowWrapper.wrapper.appendChild(list);
            this.currentOptionsList = list;
            this.activeDropdown = dropdown;
        });

        container.append(label, dropdown);
        this.settingsContainer.appendChild(container);
        this.components.push(container);
    }

    refresh() {
        if (!this.initialized) return;

        const keys = Object.keys(this.module.options).filter(k => !this.renderedOptions.has(k));
        if (keys.length) {
            const groups = this.groupSettings(keys);
            this.createSettings(groups);
        }

        for (const container of this.components) {
            const name = container.querySelector(".gui-setting-label")?.textContent;
            if (!(name in this.module.options)) continue;

            const value = this.module.options[name];

            const checkbox = container.querySelector(".gui-checkbox");
            if (checkbox) {
                checkbox.classList.toggle("enabled", value === true || value === "true");
                continue;
            }

            const selected = container.querySelector(".gui-dropdown-selected");
            if (selected) {
                selected.textContent = value;
                continue;
            }

            const input = container.querySelector("input");
            if (input) {
                input.value = value;
                continue;
            }

            const colorBg = container.querySelector(".gui-color-picker");
            if (colorBg) {
                colorBg.style.background = value;
            }
        }
    }

    rgbToHex(rgb) {
        if (!rgb) return "#000000";
        if (rgb.startsWith("#")) return rgb;
        const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
        return m ? "#" + ((1 << 24) + (+m[1] << 16) + (+m[2] << 8) + +m[3]).toString(16).slice(1) : "#000000";
    }
}