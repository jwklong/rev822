/** @class */
export default class MouseTracker {
    /** @type {Number} */
    x = 0
    /** @type {Number} */
    y = 0

    /** @type {Boolean} */
    left = false
    /** @type {Boolean} */
    right = false

    /** @type {Boolean} */
    inWindow = true

    constructor() {
        let the = this
        function handler(event) {
            the.x = event.pageX
            the.y = event.pageY
    
            the.left = event.buttons % 2 >= 1
            the.right = event.buttons % 4 >= 2

            the.inWindow = true
        }

        addEventListener("mousedown", ev => handler(ev))
        addEventListener("mouseup", ev => handler(ev))
        addEventListener("mousemove", ev => handler(ev))
        addEventListener("mouseout", ev => the.inWindow = false)
    }
}