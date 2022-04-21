import {DrawControl} from "./DrawControl";
import {Point} from "./Point";
import {Box} from "./Box";

export const ObjectsControl = class extends DrawControl{
    constructor(selector, width, height, context) {
        super(selector, width, height, context)

        let objectCount = 0
        class BaseObject {
            type = "BaseObject"
            id = objectCount ++
            position = new Point()
            size = new Point()
            box = new Box()
            center = new Point()
            parent = null
            children = []
            fillColor
            strokeColor
            strokeWidth
            angle = 0
            alpha = 1
            visible = true
            flip = new Point()

            constructor(object) {

            }

            getType(){
                return this.type
            }

            getId(){
                return this.id
            }



        }

    }
}