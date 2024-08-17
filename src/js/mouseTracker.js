export default class MouseTracker {
    x = 0
    y = 0

    left = false
    right = false

    constructor() {
        let the = this
        function handler(event) {
            the.x = event.pageX
            the.y = event.pageY
    
            the.left = event.buttons % 2 >= 1
            the.right = event.buttons % 4 >= 2

            console.log(80-the.x, -1200+the.x)
        }

        addEventListener("mousedown", ev => handler(ev))
        addEventListener("mouseup", ev => handler(ev))
        addEventListener("mousemove", ev => handler(ev))
    }
}