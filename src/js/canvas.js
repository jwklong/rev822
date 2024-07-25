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
        ctx.globalAlpha = 1

        switch(this.mode) {
            case -1:
                const fillAmount = window.game.ResourceManager.loadedResources / window.game.ResourceManager.totalResources

                if (fillAmount == 1) {
                    if (!window.game.TimeManager.timerExists('POSTLOADING')) {window.game.TimeManager.createTimer('POSTLOADING', 1)}

                    const image1 = new Image()
                    image1.src = window.game.ResourceManager.getResource('IMAGE_LOADFINISHED').src
                    
                    const image2 = new Image()
                    image2.src = window.game.ResourceManager.getResource('IMAGE_TEMP_BACKGROUND').src

                    ctx.drawImage(image2, 0, 0, 1280, 720)
                    ctx.drawImage(image1, 540, 260)

                    ctx.lineJoin = 'round'

                    ctx.font = '48px "FONT_COOKIES"'
                    ctx.strokeStyle = 'black'
                    ctx.lineWidth = 8
                    ctx.strokeText('Click to continue', 640, 560)
                    ctx.lineWidth = 4
                    ctx.strokeText('Click to continue', 640, 560)
                    ctx.textAlign = 'center'
                    ctx.fillStyle = 'white'
                    ctx.fillText('Click to continue', 640, 560)

                    ctx.globalAlpha = Math.max(1-window.game.TimeManager.getTimer('POSTLOADING').timePassed, 0)
                    console.log(window.game.TimeManager.getTimer('POSTLOADING').timePassed)
                    ctx.fillStyle = 'white'
                    ctx.fillRect(0, 0, 1280, 720)

                    break
                }

                ctx.beginPath()
                ctx.arc(640, 360, 100, (.5 - fillAmount) * Math.PI, (.5 + fillAmount) * Math.PI)
                ctx.fill()

                break
        }
    }
}