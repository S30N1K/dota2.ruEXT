import {LoopControl} from "./LoopControl";
import {Point} from "./Point";
import {Box} from "./Box";
import {Size} from "./Size";

export const CameraControl = class extends LoopControl {
    constructor(selector, width, height, context) {
        super(selector, width, height, context)

        this.event.addEvent("preLoop", () => {

            if (this.camera.getFree()) {
                const mp = this.mouse.getPositionS()
                if (mp.x < 20) {
                    this.camera.move(new Point(-1, 0))
                } else if (mp.x > this.canvasSize.w - 20){
                    this.camera.move(new Point(1, 0))
                }
                if (mp.y < 20) {
                    this.camera.move(new Point(0, -1))
                } else if (mp.y > this.canvasSize.h - 20){
                    this.camera.move(new Point(0, 1))
                }
            }
        })
    }

    #offset = new Point()
    #isFree = false

    #getPosition() {
        return new Point(this.#offset)
    }

    #setPosition(point) {
        this.#offset = point
    }

    #getStaticBox() {
        return new Box(this.#offset, this.canvasSize)
    }

    #getDynamicBox() {
        return new Box(this.#offset, new Size(this.#offset.x + this.canvasSize.w, this.#offset.y + this.canvasSize.h))
    }

    #move(point) {
        this.#offset.x += point.x || 0;
        this.#offset.y += point.y || 0;
    }

    #moveTime(point, time) {
        const position = new Point(this.#offset.x, this.#offset.y)
        this.#move(new Point((point.x - position.x) / time, (point.y - position.y) / time))
    }

    #moveTimeC(point, time) {
        const position = new Point(this.#offset.x + this.canvasSize2.w, this.#offset.y + this.canvasSize2.h)
        this.#move(new Point((point.x - position.x) / time, (point.y - position.y) / time))
    }

    #follow(object) {
        this.#moveTimeC(object.getPositionC(), 10)
    }

    #getFree() {
        return this.#isFree
    }

    #setFree(e) {
        this.#isFree = e
    }

    camera = {
        setFree: this.#setFree.bind(this),
        getFree: this.#getFree.bind(this),
        getPosition: this.#getPosition.bind(this),
        setPosition: this.#setPosition.bind(this),
        getStaticBox: this.#getStaticBox.bind(this),
        getDynamicBox: this.#getDynamicBox.bind(this),
        move: this.#move.bind(this),
        moveTime: this.#moveTime.bind(this),
        moveTimeC: this.#moveTimeC.bind(this),
        follow: this.#follow.bind(this)
    }

}