/** @class */
export default class InputTracker {
    /** @type {Number} */
    x = 0
    /** @type {Number} */
    y = 0

    /** @type {Boolean} */
    left = false
    /** @type {Boolean} */
    right = false

    /** @type {Boolean} */
    shift = false

    /** @type {Boolean} */
    inWindow = true

    /** @type {Gooball?} */
    ball

    constructor() {
        const clamp = (a, b, c) => Math.min(c, Math.max(b, a))

        let the = this

        /** @param {MouseEvent} event */
        function mouseHandler(event) {
            the.x = clamp(0, event.pageX, 1280)
            the.y = clamp(0, event.pageY, 720)
    
            the.left = event.buttons % 2 >= 1
            the.right = event.buttons % 4 >= 2

            the.inWindow = true
        }

        /** @param {KeyboardEvent} event */
        function keyHandler(event) {
            the.shift = event.shiftKey
        }

        addEventListener("mousedown", ev => mouseHandler(ev))
        addEventListener("mouseup", ev => mouseHandler(ev))
        addEventListener("mousemove", ev => mouseHandler(ev))
        addEventListener("mouseout", ev => the.inWindow = false)

        addEventListener("keydown", ev => keyHandler(ev))
        addEventListener("keyup", ev => keyHandler(ev))
    }

    /**
     * Gets the distance to a point from the relative mouse position.
     * @param {number} x 
     * @param {number} y 
     * @returns {number}
     */
    distanceTo(x, y) {
        return Math.hypot(this.x - x, this.y - y)
    }

    withinCircle(x, y, radius) {
        return this.distanceTo(x, y) <= radius
    }
}