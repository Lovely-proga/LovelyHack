import hooks from "../../../hooks";
import mobxUtils from "../../../utils/mobxUtils";
import reactUtils from "../../../utils/reactUtils";
import Module from "../../Module";

export default class CraftingUnlock extends Module {
    constructor() {
        super("CraftingUnlock", "Misc", {
            "Force Enable": "true"
        });
        this.observer = null;
        this._recipes = null;
        this._serverCategory = null;
    }

    get recipes() {
        if (this._recipes) return this._recipes;

        const match = hooks.gameScript.match(
            /,\s*recipes\s*=\s*(\{[\s\S]*?\})\s*;\s*async function searchRecipes\(m\)\s*\{/
        );

        const recipesSource = match[1];
        this._recipes = (0, eval)(`(${recipesSource})`);
        return this._recipes;
    }

    updateRecipes(el) {
        let fiber =  reactUtils.getFiber(el);
        let dispatch = reactUtils.getDispatch(fiber);
        dispatch(prev => this.getAvailableRecipes(hooks.game.player.inventory));
    }

    tryUpdateRecipes() {
        const inventoryText = [...document.getElementsByClassName("chakra-text")]
            .find(el => el.innerText === "Inventory");
        if (!inventoryText) return;

        const inventoryEl = inventoryText.nextSibling;
        if (!inventoryEl) return;

        const craftingEl = inventoryEl.children[inventoryEl.children.length - 1];
        if (!craftingEl) return;

        this.updateRecipes(craftingEl)
    }

    onEnable() {
        this.observer = new MutationObserver(() => this.tryUpdateRecipes());
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        if (this.options["Force Enable"] === "true") {
            let context = this;
            this._serverCategory = hooks.game.serverInfo.serverCategory;
            mobxUtils.defineMobxProp(hooks.game.serverInfo, "serverCategory", function () {
                let stack = Error().stack;
                if (stack.includes("useObserver")) {
                    return "bob";
                } else {
                    return context._serverCategory;
                }
            }, function (v) {
                context._serverCategory = v;
            });
        }
    }

    onDisable() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.options["Force Enable"] === "true" && this._serverCategory !== null) {
            mobxUtils.setMobxProp(hooks.game.serverInfo, "serverCategory", this._serverCategory);
        }
    }

    getAvailableRecipes(playerInventory) {
        const availableRecipes = [];

        for (const recipeGroupKey in this.recipes) {
            const recipeGroup = this.recipes[recipeGroupKey];

            for (const recipe of recipeGroup) {
                let canCraft = true;

                if (recipe.ingredients) {
                    for (const ingredientId of recipe.ingredients) {
                        if (!playerInventory.hasItem(Items.getItemById(ingredientId))) {
                            canCraft = false;
                            break;
                        }
                    }
                } else if (recipe.inShape) {
                    const requiredCounts = this.getRecipeCount(recipe);
                    if (!requiredCounts)
                        continue;

                    for (const [itemId, count] of requiredCounts.entries()) {
                        if (
                            playerInventory.getInventoryItemCount(
                                Items.getItemById(itemId)
                            ) < count
                        ) {
                            canCraft = false;
                            break;
                        }
                    }

                    if (!canCraft)
                        continue;
                }

                if (canCraft) {
                    availableRecipes.push(recipe);
                    break;
                }
            }
        }

        return availableRecipes;
    }

    getRecipeCount(recipe) {
        const itemCounts = new Map();

        if (recipe.ingredients) {
            for (const itemId of recipe.ingredients) {
                const current = itemCounts.get(itemId);
                current ? itemCounts.set(itemId, current + 1) : itemCounts.set(itemId, 1);
            }
        } else if (recipe.inShape) {
            for (const row of recipe.inShape) {
                if (typeof row === "number") {
                    if (!row)
                        continue;
                    if (!Items.getItemById(row))
                        return null;

                    const current = itemCounts.get(row);
                    current ? itemCounts.set(row, current + 1) : itemCounts.set(row, 1);
                } else {
                    for (const itemId of row) {
                        if (!itemId)
                            continue;
                        if (!Items.getItemById(itemId))
                            return null;

                        const current = itemCounts.get(itemId);
                        current ? itemCounts.set(itemId, current + 1) : itemCounts.set(itemId, 1);
                    }
                }
            }
        }

        return itemCounts;
    }
}