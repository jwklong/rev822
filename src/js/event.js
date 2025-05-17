
/** @template {function(): void} H */
export class Event {
    /** @type {Array<EventHandler<H>>} */
    handlers = []

    /**
     * adds a handler to the event
     * @param {H} handler
     * @returns {EventHandler<H>}
     */
    on(handler) {
        let h = new EventHandler(this, handler, this.handlers.length)
        this.handlers.push(h)
        return h
    }

    /**
     * fires the event, mainly used internally
     * @type {H}
     */
    fire(...args) {
        this.timesFired += 1
        this.handlers.forEach(h => h.response(...args))
    }

    /**
     * amount of times the event has been fired
     * @type {number}
     */
    timesFired = 0
}

/** @template {function(): void} R */
export class EventHandler {
    /**
     * @type {Event<R>}
     * @readonly
     */
    parent

    /**
     * @type {R}
     * @readonly
     */
    response

    /**
     * @type {number}
     * @readonly
     */
    index

    /**
     * @param {Event<R>} parent
     * @param {R} response
     * @param {number} index
     */
    constructor(parent, response, index) {
        this.parent = parent
        this.response = response
        this.index = index
    }

    /**
     * removes the handler
     */
    dissolve() {
        delete this.parent.handlers[this.index]
    }
}