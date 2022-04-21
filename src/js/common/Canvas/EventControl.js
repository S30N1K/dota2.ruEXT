import {CanvasModule} from "./CanvasModule";

export const EventControl = class extends CanvasModule {


    #events = []
    #addEvent(eventName, callback){
        this.#events.push({eventName, callback})
    }
    #runEvent(eventName){
        const events = this.#events.filter(e => e.eventName === eventName)
        for (const event of events){
            event.callback()
        }
    }

    event = {
        addEvent: this.#addEvent.bind(this),
        runEvent: this.#runEvent.bind(this)
    }
}