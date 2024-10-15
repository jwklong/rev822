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
     * @param {number} cx - Replaces mouse X
     * @param {number} cy - Replaces mouse Y
     * @returns {number}
     */
    distanceTo(x, y, cx = this.x, cy = this.y) {
        return Math.hypot(cx - x, cy - y)
    }
    
    /**
     * checks if the mouse is inside a circle
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {number} cx - Replaces mouse X
     * @param {number} cy - Replaces mouse Y
     * @returns {boolean}
     */
    withinCircle(x, y, radius, cx = this.x, cy = this.y) {
        return this.distanceTo(x, y, cx, cy) <= radius
    }

    /**
     * Checks if a line between two points intersects the cursor + radius for margin of error
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {number} radius 
     * @param {number} cx - Replaces mouse X
     * @param {number} cy - Replaces mouse Y
     * @returns {boolean}
     */
    cursorIntersectsLine(x1, y1, x2, y2, radius, cx = this.x, cy = this.y) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        const t = this.cursorIntersectsLineProgress(x1, y1, x2, y2, cx, cy)
      
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
      
        return this.withinCircle(closestX, closestY, radius, cx, cy);
    }

    /**
     * Gets distance from cursor to closest point on line
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2
     * @param {number} cx - Replaces mouse X
     * @param {number} cy - Replaces mouse Y
     * @returns {number}
     */
    cursorIntersectsLineDistance(x1, y1, x2, y2, cx = this.x, cy = this.y) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        const t = this.cursorIntersectsLineProgress(x1, y1, x2, y2, cx, cy)
      
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
      
        return this.distanceTo(closestX, closestY, cx, cy)
    }

    /**
     * Gets progress on a line from cursor
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2
     * @param {number} cx - Replaces mouse X
     * @param {number} cy - Replaces mouse Y
     * @returns {number}
     */
    cursorIntersectsLineProgress(x1, y1, x2, y2, cx = this.x, cy = this.y) {
        const dx = x2 - x1;
        const dy = y2 - y1;
      
        const t = ((cx - x1) * dx + (cy- y1) * dy) / (dx * dx + dy * dy);
      
        return Math.max(0, Math.min(1, t));
    }
}