import {Point} from "./Point";
import {CameraControl} from "./CameraControl";

export const MouseControl = class extends CameraControl {

    #position = new Point()
    #prevPosition = new Point()
    #speed = new Point()
    #isMoving = false

    #mouseList = {
        'LEFT': 1,
        'RIGHT': 3,
        'MIDDLE': 2
    }

    #mouseDown = {}
    #mouseUp = {}
    #mousePress = {}
    #mouseWheel = 0

    constructor(selector, width, height, context) {
        super(selector, width, height, context)

        this.event.addEvent("onLoaded", () => {
            this.iframe.contentWindow.onmousemove = (e) => {
                e.preventDefault()
                e.stopPropagation()

                this.#position = new Point(e.pageX, e.pageY)

                this.#speed = new Point(this.#position).minus(this.#prevPosition)

                this.#prevPosition = this.#position

                this.#isMoving = true
            };

            this.iframe.contentWindow.onmousedown = (e) => {
                e.preventDefault()
                e.stopPropagation()

                if (!e.which & e.button) {
                    if (e.button & 1) e.which = 1
                    else if (e.button & 4) e.which = 2
                    else if (e.button & 2) e.which = 3
                }

                this.#mouseDown[e.which] = true
                this.#mousePress[e.which] = 1
            }

            this.iframe.contentWindow.onmouseup = (e) => {
                e.preventDefault()
                e.stopPropagation()

                if (!e.which & e.button) {
                    if (e.button & 1) e.which = 1
                    else if (e.button & 4) e.which = 2
                    else if (e.button & 2) e.which = 3
                }

                this.#mouseDown[e.which] = false;
                this.#mouseUp[e.which] = true;
                delete this.#mousePress[e.which];

            };

            this.iframe.contentWindow.oncontextmenu = window.onselectstart = window.ondragstart = function () {
                return false
            };

            this.iframe.contentWindow.onmousewheel = (e) => {
                this.#mouseWheel = ((e.wheelDelta) ? e.wheelDelta : -e.detail)
            }
        })

        this.event.addEvent("postLoop", () => {
            this.#mouseUp = {}
            this.misc.forEach(this.#mousePress, function (el, i, arr) {
                if (el === 1)
                    arr[i] = 2;
            })
            this.#mouseWheel = 0
            this.#isMoving = false
            this.#speed = new Point(0, 0)
        })
    }

    #isDown(key) {
        return !!this.#mouseDown[this.#mouseList[key]]
    }

    #isUp(key) {
        return !!this.#mouseUp[this.#mouseList[key]]
    }

    #isPress(key) {
        return !!this.#mouseUp[this.#mouseList[key]]
    }

    #isMove() {
        return this.#isMoving
    }

    #isWheel(key) {
        return (key === 'UP' && this.#mouseWheel > 0) || (key === 'DOWN' && this.#mouseWheel < 0)
    }

    #getPosition() {
        return new Point(this.#position).plus(this.camera.getPosition())
    }

    #getPositionS() {
        return this.#position
    }

    #getSpeed() {
        return this.#speed
    }

    #isInStatic(box){
        const pos = this.#position
        return (pos.x >= box.x && pos.x <= box.x + box.w && pos.y >= box.y && pos.y <= box.y + box.h);
    }

    #isInDynamic(box){
        const pos = new Point(this.#position).plus(this.camera.getPosition())
        return (pos.x >= box.x && pos.x <= box.x + box.w && pos.y >= box.y && pos.y <= box.y + box.h);
    }

    mouse = {
        isDown: this.#isDown.bind(this),
        isUp: this.#isUp.bind(this),
        isPress: this.#isPress.bind(this),
        isMove: this.#isMove.bind(this),
        isWheel: this.#isWheel.bind(this),
        getPosition: this.#getPosition.bind(this),
        getPositionS: this.#getPositionS.bind(this),
        getSpeed: this.#getSpeed.bind(this),
        isInStatic: this.#isInStatic.bind(this),
        isInDynamic: this.#isInDynamic.bind(this)
    }
}