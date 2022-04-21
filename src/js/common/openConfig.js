import {createRandomElement, initVue} from "../utils";
import Config from "../../vue/Config.vue";

export default async () => {
    initVue(createRandomElement(), Config)
}