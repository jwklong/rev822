/** @class */
export class TimeManager {
    /** @type {Object<string, Timer>} */
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

export class Timer {
    /** @type {number} */
    timePassed = 0

    /**
     * Fires when the timer is finished
     * @type {Event<function(): void>}
     */
    finish = new window.game.Classes.Event

    /**
     * Runs every tick
     * @type {Event<function(number): void>}
     */
    while = new window.game.Classes.Event

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
        this.timePassed = Math.min(this.timePassed, this.length)

        this.while.fire(this.timePassed)

        if (this.finished) this.finish.fire()
    }
}