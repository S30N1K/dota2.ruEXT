import {initVue} from "../utils";
import SmilesPanel from "../../vue/SmilesPanel.vue";

export const smilesPanel = () => {
    $("body").on("DOMNodeInserted", function (e) {
        if ("smiles-panel" === e.target.className) {
            initVue(e.target, SmilesPanel)
        }
    })
}