export default class MouseTracker {
    x = 0
    y = 0

    left = false
    right = false

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