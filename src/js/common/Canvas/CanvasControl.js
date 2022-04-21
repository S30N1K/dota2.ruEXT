import {EventControl} from "./EventControl";
import {Size} from "./Size";
import {Point} from "./Point";

export const CanvasControl = class extends EventControl {
    loaded = false
    selector
    iframe
    canvas
    ctx
    canvasSize = new Size()
    canvasSize2 = new Size()
    contextSettings = {
        fillStyle: 'black',
        strokeStyle: 'black',
        globalAlpha: 1,
        font: 'sans-serif',
        textBaseline: 'top',
        style: "",
        size: 16,
        align: "left",
        strokeColor: false
    }
    #modules = []

    addModule(module) {
        this.#modules.push(module)

        const events = ["onLoaded", "preLoop", "postLoop"]
        for (const event of events) {
            module[event] && this.event.addEvent(event, module[event].bind(this))
        }
    }

    constructor(selector, width, height, context = "2d") {
        super()

        if (document.readyState === "complete") {
            this.#init(selector, width, height, context)
        } else {
            document.onreadystatechange = () => {
                if (document.readyState === "complete") {
                    this.#init(selector, width, height, context)
                }
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    #init(selector, width, height, context = "2d") {
        (async () => {
            this.selector = typeof selector === "object" ? selector : document.querySelector(selector)

            this.iframe = document.createElement("iframe")
            this.canvas = document.createElement("canvas")
            this.selector.appendChild(this.iframe)
            this.selector.style.width = width + "px"
            this.selector.style.height = height + "px"
            this.selector.style.position = "relative"

            this.iframe.contentDocument.body.appendChild(this.canvas)

            this.iframe.contentDocument.body.style.margin = "0"
            this.iframe.contentDocument.body.style.padding = "0"
            this.iframe.style.width = width + "px"
            this.iframe.style.height = height + "px"
            this.iframe.style.frameBorder = "0"
            this.iframe.style.border = "0px"

            this.ctx = this.canvas.getContext(context)
            this.ctx.canvas.width = this.canvasSize.w = width
            this.ctx.canvas.height = this.canvasSize.h = height
            this.canvasSize2 = new Size(this.canvasSize.w / 2, this.canvasSize.h / 2)

            await this.sleep(100)

            for (const module of this.#modules) {
                await module.init(this)
            }

            this.loaded = true

            this.event.runEvent("onLoaded")
        })()
    }

    clear(point = null, size = null) {
        if (!point) {
            point = new Point()
        }

        if (!size) {
            size = this.canvasSize
        }

        this.ctx.clearRect(point.x, point.y, size.w, size.h)
    }
}