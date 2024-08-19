/** @class */
export default class TimeManager {
    /** @type {Object.<string, Timer>} */
    timers = {}

    /**
     * @param {string} id 
     * @param {number} length 
     * @returns {Timer}
     */
    createTimer(id, length) {
        const timer = new Timer(length)
        this.timers[id] = timer
        return timer
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    timerExists(id) {
        return this.timers[id] != null
    }

    /**
     * @param {string} id 
     * @returns {Timer?}
     */
    getTimer(id) {
        return this.timers[id]
    }

    /** @param {number} dt */
    tick(dt) {
        Object.values(this.timers)
            .filter(timer => !timer.finished)
            .forEach(timer => timer.tick(dt))
    }
}

class Timer {
    /** @type {number} */
    timePassed = 0

    /** @type {function} */
    onfinish = () => {}

    /** @type {function} */
    while = () => {}

    /** @param {number} length */
    constructor(length) {
        this.length = length
    }

    /** @returns {boolean} */
    get finished() {
        return this.timePassed >= this.length
    }

    /** @param {number} dt */
    tick(dt) {
        this.timePassed += dt

        this.while()

        if (this.finished) this.onfinish()
    }
}