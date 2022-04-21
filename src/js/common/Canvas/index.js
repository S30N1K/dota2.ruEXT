import {DrawControl} from "./DrawControl";
import {ObjectsControl} from "./ObjectsControl";

export const Canvas = class extends ObjectsControl {
    constructor(selector, width, height, context) {
        super(selector, width, height, context)
    }
}