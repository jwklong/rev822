/** @class */
export default class Canvas {
    /**
     * - -1 = loading
     * - 0 = playing
     * - 1 = paused
     * - 2 = level transition
     * - 3 = cutscene?
     * @type {number}
     */
    mode = -1

    /** @type {number} */
    transition = false
    /**
     * - 0 = in
     * - 1 = out
     * @type {number}
     */
    transitionType = 0

    /**
     * @type {HTMLCanvasElement}
     */
    element = document.querySelector('canvas')

    /** @param {number} dt */
    tick(dt) {
        const ctx = this.element.getContext('2d')
        ctx.clearRect(0, 0, 1280, 720)
        ctx.globalAlpha = 1
        ctx.resetTransform()

        switch(this.mode) {
            case -1: //begin
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
                    ctx.fillStyle = 'white'
                    ctx.fillRect(0, 0, 1280, 720)

                    if (
                        window.game.TimeManager.getTimer('POSTLOADING').finished &&
                        window.game.MouseTracker.left &&
                        !this.transition
                    ) {
                        this.playLevel("Test")
                    }

                    break
                }

                ctx.beginPath()
                ctx.arc(640, 360, 100, (.5 - fillAmount) * Math.PI, (.5 + fillAmount) * Math.PI)
                ctx.fill()

                break
            case 0: //level
            case 1: //pause
                let level = window.game.LevelManager.currentLevel
                ctx.scale(level.camera.props.zoom, level.camera.props.zoom)

                for (var layer of level.layers.sort((a, b) => a.z - b.z)) {
                    var image = new Image()
                    image.src = window.game.ResourceManager.getResource(layer.img).src
                    var w = image.width * layer.size.x
                    var h = image.height * layer.size.y
                    var x = layer.x + 1280 / 2 / level.camera.props.zoom - w / 2 - level.camera.props.x
                    var y = -layer.y + 720 / 2 / level.camera.props.zoom - h / 2 + level.camera.props.y
                    var rotation = layer.rotation * Math.PI / 180
                    ctx.translate(x + w / 2, y + h / 2)

                    ctx.rotate(rotation)
                    ctx.translate(-(x + w / 2), -(y + h / 2))
                    ctx.drawImage(image, x, y, w, h)
                    ctx.translate(x + w / 2, y + h / 2)
                    ctx.rotate(-rotation)
                    ctx.translate(-(x + w / 2), -(y + h / 2))
                }

                if (level.debug) {
                    for (var body of level.bodies) {
                        switch (body.type) {
                            case "rect":
                                ctx.beginPath()
                                for (var vertex of body.body.vertices) {
                                    if (vertex.index == 0) {
                                        ctx.moveTo(
                                            vertex.x - level.camera.props.x + 1280 / 2 / level.camera.props.zoom,
                                            -vertex.y + level.camera.props.y + 720 / 2 / level.camera.props.zoom
                                        )
                                    }
                                    ctx.lineTo(
                                        vertex.x - level.camera.props.x + 1280 / 2 / level.camera.props.zoom,
                                        -vertex.y + level.camera.props.y + 720 / 2 / level.camera.props.zoom
                                    )
                                }
                                ctx.closePath()
                                break
                            case "circle":
                                ctx.beginPath()
                                ctx.arc(
                                    body.x - level.camera.props.x + 1280 / 2 / level.camera.props.zoom,
                                    -body.y + level.camera.props.y + 720 / 2 / level.camera.props.zoom,
                                    body.radius, 0, 2 * Math.PI
                                )
                        }
                        ctx.fillStyle = "#00f8"
                        ctx.strokeStyle = "#00f"
                        ctx.lineWidth = 4
                        ctx.save()
                        ctx.clip()
                        ctx.lineWidth *= 2
                        ctx.fill()
                        ctx.stroke()
                        ctx.restore()
                    }
                }

                ctx.resetTransform()
                
                if (this.mode === 1) {

                }

                ctx.beginPath()
                ctx.arc(window.game.MouseTracker.x, window.game.MouseTracker.y, 16, 0, 2 * Math.PI)
                ctx.closePath()
                ctx.fillStyle = "#000"
                ctx.fill()
                ctx.strokeStyle = "#fff"
                ctx.lineWidth = 4
                ctx.stroke()

                break
            case 2: //level transition
                ctx.fillStyle = "black"
                ctx.fillRect(0, 0, 1280, 720)

                if (window.game.TimeManager.getTimer('LEVELTRANSITION').timePassed < 1.5) {
                    ctx.globalAlpha = window.game.TimeManager.getTimer('LEVELTRANSITION').timePassed / 1.5
                } else if (window.game.TimeManager.getTimer('LEVELTRANSITION').timePassed > 6.5) {
                    ctx.globalAlpha = (8-window.game.TimeManager.getTimer('LEVELTRANSITION').timePassed) / 1.5
                }
                
                ctx.textAlign = "left"
                ctx.textBaseline = "top"
                ctx.font = "48px FONT_COOKIES"
                ctx.fillStyle = "#fff"
                ctx.fillText(window.game.LevelManager.currentLevel.title, 24, 24)
                ctx.font = "24px FONT_COOKIES"
                ctx.fillStyle = "#aaa"
                ctx.fillText(window.game.LevelManager.currentLevel.desc, 24, 80)

                let doubleease = x => Math.abs((x % 2) - 1)

                for (let i = 0; i < 20; i++) {
                    var x = (((window.game.timePassed * 1.3 / 2) % 2) + (i - 2)) * 72
                    var y = 720 - (36 + window.game.Easing.easeOut.from(doubleease(window.game.timePassed * 1.3 + i % 2)) * 96)
                    ctx.beginPath()
                    ctx.arc(x, y, 12, 0, 2 * Math.PI)
                    ctx.closePath()
                    ctx.fillStyle = "#fff"
                    ctx.fill()
                }

                break
        }
        
        if (this.transition) {
            ctx.globalAlpha = 1
            ctx.fillStyle = "#000"
            ctx.fillRect(1 - (window.game.Easing.easeInOut.from(window.game.TimeManager.getTimer("TRANSITION").timePassed) + this.transitionType - 1) * 1300 - 10, 0, 1300, 720)
        }
    }

    /**
     * @param {function} callback 
     * @param {boolean} inT
     * @param {boolean} outT
     */
    async startTransition(callback, inT = false, outT = false) {
        if (!inT && !outT) console.warn("excuse me your not even using any transitions what are you doing with your life")

        if (inT) {
            this.transition = true
            this.transitionType = 0
            var timer = window.game.TimeManager.createTimer("TRANSITION", 1)
            await new Promise((resolve) => {
                timer.onfinish = resolve
            })
        }
        callback()
        if (outT) {
            this.transition = true
            this.transitionType = 1
            var timer = window.game.TimeManager.createTimer("TRANSITION", 1)
            await new Promise((resolve) => {
                timer.onfinish = resolve
            })
        }
        this.transition = false
    }

    /**
     * Plays the level, includes transitions
     * @param {string} id - Level ID
     * @param {boolean} skip - Skips the midway section
     */
    playLevel(id, skip = false) {
        if (skip) {
            this.startTransition(() => {
                window.game.LevelManager.currentLevel = id
                this.mode = 0
            }, true, true)
            return
        }
        this.startTransition(() => {
            this.mode = 2
            window.game.LevelManager.currentLevel = id
            var timer = window.game.TimeManager.createTimer("LEVELTRANSITION", 8)
            timer.onfinish = () => {
                this.startTransition(() => {
                    this.mode = 0
                }, false, true)
            }
        }, true, false)
    }
}