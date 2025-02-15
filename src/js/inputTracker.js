/** @class */
export class InputTracker {
    /** @type {Number} */
    x = 0
    /** @type {Number} */
    y = 0

    /** @type {Boolean} */
    left = false
    /** @type {Boolean} */
    right = false

    /** @type {Boolean} */
    leftOnce = false
    /** @type {Boolean} */
    rightOnce = false

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
        function mouseHandler(event, buttonRelated = false) {
            the.x = clamp(0, event.pageX, 1280)
            the.y = clamp(0, event.pageY, 720)
    
            the.leftOnce = !the.left && buttonRelated
            the.left = event.buttons % 2 >= 1
            the.rightOnce = !the.right && buttonRelated
            the.right = event.buttons % 4 >= 2

            the.inWindow = true
        }

        /** @param {KeyboardEvent} event */
        function keyHandler(event) {
            the.shift = event.shiftKey
        }

        addEventListener("mousedown", ev => mouseHandler(ev, true))
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
        return window.game.Utils.distanceTo(this.x, this.y, x, y)
    }
    
    /**
     * checks if the mouse is inside a circle
     * @param {number} cx
     * @param {number} cy
     * @param {number} radius
     * @returns {boolean}
     */
    withinCircle(cx, cy, radius) {
        return window.game.Utils.withinCircle(this.x, this.y, cx, cy, radius)
    }

    /**
     * Checks if a line between two points intersects the cursor + radius for margin of error
     * @param {number} lx1 
     * @param {number} ly1 
     * @param {number} lx2 
     * @param {number} ly2 
     * @param {number} radius
     * @returns {boolean}
     */
    cursorIntersectsLine(lx1, ly1, lx2, ly2, radius) {
        return window.game.Utils.intersectsLine(this.x, this.y, lx1, ly1, lx2, ly2, radius)
    }

    /**
     * Gets distance from cursor to closest point on line
     * @param {number} lx1
     * @param {number} ly1
     * @param {number} lx2
     * @param {number} ly2
     * @returns {number}
     */
    cursorIntersectsLineDistance(lx1, ly1, lx2, ly2) {
        return window.game.Utils.intersectsLineDistance(this.x, this.y, lx1, ly1, lx2, ly2)
    }

    /**
     * Gets progress on a line from cursor
     * @param {number} lx1 
     * @param {number} ly1 
     * @param {number} lx2 
     * @param {number} ly2
     * @returns {number}
     */
    cursorIntersectsLineProgress(lx1, ly1, lx2, ly2) {
        return window.game.Utils.intersectsLineProgress(this.x, this.y, lx1, ly1, lx2, ly2)
    }

    /**
     * Checks if the cursor is inside a box
     * @param {number} rx1 
     * @param {number} ry1 
     * @param {number} rx2 
     * @param {number} ry2
     * @returns {boolean}
     */
    withinRect(rx1, ry1, rx2, ry2) {
        return window.game.Utils.withinRect(this.x, this.y, rx1, ry1, rx2, ry2)
    }

    resetOnce() {
        this.leftOnce = false
        this.rightOnce = false
    }
}