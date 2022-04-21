import {MiscControl} from "./MiscControl";

export const LoopControl = class extends MiscControl {
    #fpsChecker = {
        fps: 0,
        time: 0,
        tmpFps: 0
    }
    #startTime
    #currentLoop
    #endTime
    #time
    #deltaTime
    #fps
    #loops = []

    constructor(selector, width, height, context) {
        super(selector, width, height, context)

        if (this.loaded){
            this.#update()
        } else {
            this.event.addEvent("onLoaded", () => {
                this.#update()
            })
        }


    }

    getLoops(){
        return this.#loops
    }

    getCurrentLoop(){
        return this.#currentLoop
    }

    setFps(fps) {
        this.#fps = fps
    }

    getDeltaTime(delta) {
        return this.#deltaTime / delta
    }

    getTime() {
        return this.#time
    }

    getFps() {
        return this.#fpsChecker.fps
    }

    async #update() {

        const update = async (deltaTime) => {
            if (this.#currentLoop && this.#currentLoop.update) {
                await this.#currentLoop.update.call(this, deltaTime)
            }
        }

        if (this.#fps < 60) {
            const pauseTime = 1000 / this.#fps;

            this.#time = Date.now();
            if (this.#time - this.#endTime > pauseTime) {
                this.#preLoop()
                await update(this.#deltaTime)
                this.#endTime = this.#time;
                this.#postLoop()
            }

        } else {
            this.#preLoop()
            await update(this.#deltaTime)
            this.#postLoop()
        }

        requestAnimationFrame(this.#update.bind(this))
    }

    #preLoop() {
        this.#time = Date.now()
        this.event.runEvent("preLoop")
    }

    #postLoop() {
        this.event.runEvent("postLoop")

        this.#fpsChecker.tmpFps += 1;
        if (this.#time - this.#fpsChecker.time >= 1000) {
            this.#fpsChecker.fps = this.#fpsChecker.tmpFps;
            this.#fpsChecker.tmpFps = 0;
            this.#fpsChecker.time = this.#time;
        }


        this.#endTime = this.#time
        if (this.#startTime !== -1) {
            this.#deltaTime = this.#time - this.#startTime
        }
        this.#startTime = this.#time
    }

    start() {
        if (this.#currentLoop && this.#currentLoop.start) {
            this.#currentLoop.start.apply(this)
        }
    }

    pause() {

    }

    exit(){

    }

    addLoop(name, start, update, exit) {

        if (update) {
            this.#loops[name] = {start, update, exit}
        } else {
            this.#loops[name] = start
        }
    }

    startLoop(name) {
        const loop = this.#loops[name]
        if (loop) {
            this.exit()
            this.#currentLoop = loop
            this.start()
        }
    }
}