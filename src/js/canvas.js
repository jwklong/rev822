export default class Canvas {
    /**
     * -1 = loading
     * 0 = playing
     * 1 = level transition
     * 2 = paused
     * 3 = cutscene?
     */
    mode = -1

    element = document.querySelector('canvas')

    tick(dt, game) {
        const ctx = this.element.getContext('2d')
        ctx.clearRect(0, 0, 1280, 720)

        switch(this.mode) {
            case -1:
                ctx.arc(640, 360, 100, 0, 2 * Math.PI)
                ctx.stroke()

                break
        }
    }
}