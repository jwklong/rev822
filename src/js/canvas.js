export default class Canvas {
    /**
     * @type {number}
     * -1 = loading
     * 0 = playing
     * 1 = level transition
     * 2 = paused
     * 3 = cutscene?
     */
    mode = -1

    /**
     * @type {HTMLCanvasElement}
     */
    element = document.querySelector('canvas')

    /** @param {number} dt */
    tick(dt) {
        const ctx = this.element.getContext('2d')
        ctx.clearRect(0, 0, 1280, 720)

        switch(this.mode) {
            case -1:
                var fillAmount = window.game.ResourceManager.loadedResources / window.game.ResourceManager.totalResources

                ctx.beginPath()
                ctx.arc(640, 360, 100, 0, 2 * Math.PI)
                ctx.stroke()

                ctx.beginPath()
                ctx.arc(640, 360, 100, (.5 - fillAmount) * Math.PI, (.5 + fillAmount) * Math.PI)
                ctx.fill()

                break
        }
    }
}