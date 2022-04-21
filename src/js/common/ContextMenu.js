import {createRandomElement, initVue} from "../utils";
import Context from "../../vue/ContextMenu.vue";

export const ContextMenu = class {
    
    constructor() {
        this.vue = initVue(createRandomElement(), Context).$children[0]
    }

    show(x, y, items) {
        this.vue.show(x, y, items)
    }
}