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
                        window.game.InputTracker.left &&
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

                function renderImage(layer, ox = 0, oy = 0) {
                    var image = new Image()
                    image.src = window.game.ResourceManager.getResource(layer.img).src
                    var w = image.width * layer.size.x
                    var h = image.height * layer.size.y
                    var x = layer.x + ox + 1280 / 2 / level.camera.props.zoom - w / 2 - level.camera.props.x
                    var y = -(layer.y + oy) + 720 / 2 / level.camera.props.zoom - h / 2 + level.camera.props.y
                    var rotation = layer.rotation * Math.PI / 180
                    ctx.translate(x + w / 2, y + h / 2)

                    ctx.rotate(rotation)
                    ctx.translate(-(x + w / 2), -(y + h / 2))
                    ctx.drawImage(image, x, y, w, h)
                    ctx.translate(x + w / 2, y + h / 2)
                    ctx.rotate(-rotation)
                    ctx.translate(-(x + w / 2), -(y + h / 2))
                }

                for (let layer of level.layers.sort((a, b) => a.z - b.z).filter(a => a.z <= 0)) {
                    renderImage(layer)
                }

                //gooballs here
                function drawStrand(type, ball1, ball2, ghost = false) {
                    let ball = window.game.GooballManager.types[type]

                    var image = new Image()
                    image.src = window.game.ResourceManager.getResource(ball.strand.img).src

                    let x1 = ball1.x + 1280 / 2 / level.camera.props.zoom - level.camera.props.x
                    let y1 = -ball1.y + 720 / 2 / level.camera.props.zoom + level.camera.props.y
                    let x2 = ball2.x + 1280 / 2 / level.camera.props.zoom - level.camera.props.x
                    let y2 = -ball2.y + 720 / 2 / level.camera.props.zoom + level.camera.props.y

                    let distance = Math.hypot(x2 - x1, y2 - y1)
                    let angle = Math.atan2(y2 - y1, x2 - x1)

                    ctx.save()
                    ctx.translate(x1, y1)
                    ctx.rotate(angle)
                    if (ghost) ctx.globalAlpha = 0.5

                    ctx.drawImage(image, 0, -image.height / 2, distance, image.height)
                    
                    ctx.restore()
                    if (ghost) ctx.globalAlpha = 1
                }
                let applicableBalls = []
                let canBuild = false
                if (window.game.InputTracker.ball) {(() => {
                    window.game.LevelManager.currentLevel.balls.forEach(x => {
                        if (x === window.game.InputTracker.ball) return
                        if (x.nobuild) return
                        if (window.game.LevelManager.currentLevel.getStrandsOfBall(x).length === 0) return
                        if (!window.game.InputTracker.shift) {
                            if (Math.hypot(x.x - window.game.InputTracker.ball.x, x.y - window.game.InputTracker.ball.y) < window.game.InputTracker.ball.strand.length - window.game.InputTracker.ball.strand.range) return
                        }
                        if (Math.hypot(x.x - window.game.InputTracker.ball.x, x.y - window.game.InputTracker.ball.y) > window.game.InputTracker.ball.strand.length + window.game.InputTracker.ball.strand.range) return
                        applicableBalls.push(x)
                    })
                    
                    applicableBalls = applicableBalls.sort((a, b) => { 
                        let distanceA = Math.hypot(a.x - window.game.InputTracker.ball.x, a.y - window.game.InputTracker.ball.y)
                        let distanceB = Math.hypot(b.x - window.game.InputTracker.ball.x, b.y - window.game.InputTracker.ball.y)
                        return distanceA - distanceB
                    })
                    if (window.game.InputTracker.shift) {
                        applicableBalls = applicableBalls.sort((a, b) => {
                            let distanceA = Math.hypot(a.x - applicableBalls[0].x, a.y - applicableBalls[0].y)
                            let distanceB = Math.hypot(b.x - applicableBalls[0].x, b.y - applicableBalls[0].y)
                            return distanceA - distanceB
                        })

                        let ball1 = applicableBalls[0]
                        let ball2 = applicableBalls[1]

                        if (ball1 == undefined || ball2 == undefined) return
                        if (window.game.InputTracker.ball.nobuild) return
                        if (window.game.LevelManager.currentLevel.getStrandFromBalls(ball1, ball2) !== undefined) return
                        if (Math.hypot(ball1.x - ball2.x, ball1.y - ball2.y) < window.game.InputTracker.ball.strand.length - window.game.InputTracker.ball.strand.range) return
                        if (Math.hypot(ball1.x - ball2.x, ball1.y - ball2.y) > window.game.InputTracker.ball.strand.length + window.game.InputTracker.ball.strand.range) return

                        canBuild = true

                        drawStrand(window.game.InputTracker.ball.type, ball1, ball2, true)
                    } else {
                        applicableBalls = applicableBalls.slice(0, window.game.InputTracker.ball.strand.amount)
                        if (applicableBalls.length < (window.game.InputTracker.ball.strand.single ? 1 : 2)) return

                        canBuild = true

                        for (let applicableBall of applicableBalls) {
                            drawStrand(window.game.InputTracker.ball.type, window.game.InputTracker.ball, applicableBall, true)
                        }
                    }
                })()}
                for (let strand of level.strands) {
                    drawStrand(strand.type, strand.ball1, strand.ball2)
                }
                let ballToDrag = null
                for (let ball of level.balls) {
                    for (let layer of ball.layers.sort((a, b) => a.z - b.z)) {
                        renderImage(layer, ball.x, ball.y)
                    }

                    if (window.game.InputTracker.distanceTo(
                        ball.x + 1280 / 2 - level.camera.props.x,
                        -ball.y + 720 / 2 + level.camera.props.y,
                    ) < 320 && (
                        window.game.LevelManager.currentLevel.getStrandsOfBall(ball).length == 0 ||
                        (ball.strand && ball.strand.detachable)
                    )) {
                        for (let eye of ball.eyes) {
                            ctx.fillStyle = "#fff"
                            ctx.strokeStyle = "#000"
                            ctx.lineWidth = 1
                            
                            ctx.beginPath()
                            ctx.arc(
                                ball.x + eye.x + 1280 / 2 / level.camera.props.zoom - level.camera.props.x,
                                -(ball.y + eye.y) + 720 / 2 / level.camera.props.zoom + level.camera.props.y,
                                eye.radius, 0, 2 * Math.PI
                            )
                            ctx.closePath()
                            ctx.fill()
                            ctx.stroke()
    
                            ctx.fillStyle = "#000"
                            
                            ctx.beginPath()
                            ctx.arc(
                                ball.x + eye.x + 1280 / 2 / level.camera.props.zoom - level.camera.props.x,
                                -(ball.y + eye.y) + 720 / 2 / level.camera.props.zoom + level.camera.props.y,
                                eye.radius / 4, 0, 2 * Math.PI
                            )
                            ctx.closePath()
                            ctx.fill()
                            ctx.stroke()
                        }
                    }

                    if (window.game.InputTracker.withinCircle(
                        ball.x - level.camera.props.x + 1280 / 2 / level.camera.props.zoom,
                        -ball.y + level.camera.props.y + 720 / 2 / level.camera.props.zoom,
                        ball.shape.radius + 4
                    ) && (
                        window.game.LevelManager.currentLevel.getStrandsOfBall(ball).length == 0 ||
                        ball.strand.detachable
                    )) {
                        if (ballToDrag == null) ballToDrag = ball 
                    }
                }

                for (let layer of level.layers.sort((a, b) => a.z - b.z).filter(a => a.z > 0)) {
                    renderImage(layer)
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
                                ctx.closePath()
                                break
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

                    for (var ball of level.balls) {
                        let selected = false
                        switch (ball.shape.type) {
                            case "circle":
                                ctx.beginPath()
                                ctx.arc(
                                    ball.x - level.camera.props.x + 1280 / 2 / level.camera.props.zoom,
                                    -ball.y + level.camera.props.y + 720 / 2 / level.camera.props.zoom,
                                    ball.shape.radius, 0, 2 * Math.PI
                                )
                                ctx.closePath()

                                if (window.game.InputTracker.withinCircle(
                                    ball.x - level.camera.props.x + 1280 / 2 / level.camera.props.zoom,
                                    -ball.y + level.camera.props.y + 720 / 2 / level.camera.props.zoom,
                                    ball.shape.radius + 4
                                )) selected = true

                                break
                        }
                        ctx.fillStyle = "#3338"
                        ctx.strokeStyle = "#333"
                        if (selected) {
                            ctx.fillStyle = "#0f08"
                            ctx.strokeStyle = "#0f0"
                        }
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

                if (ballToDrag !== null && window.game.InputTracker.ball == undefined && window.game.InputTracker.left) {
                    window.game.InputTracker.ball = ballToDrag
                    window.game.InputTracker.ball.body.isStatic = true
                    window.game.InputTracker.ball.body.collisionFilter.mask = 0b10
                    window.game.LevelManager.currentLevel.deleteStrands(ballToDrag)
                    
                } else if (window.game.InputTracker.ball !== undefined && !window.game.InputTracker.left) {
                    window.game.InputTracker.ball.body.isStatic = false
                    window.game.InputTracker.ball.body.collisionFilter.mask = 0b11

                    if (canBuild) {
                        if (window.game.InputTracker.shift) {
                            window.game.LevelManager.currentLevel.createStrand(window.game.InputTracker.ball.type, applicableBalls[0], applicableBalls[1])
                            window.game.LevelManager.currentLevel.killGooball(window.game.InputTracker.ball)
                        } else {
                            for (let applicableBall of applicableBalls) {
                                window.game.LevelManager.currentLevel.createStrand(window.game.InputTracker.ball.type, window.game.InputTracker.ball, applicableBall)
                            }
                        }
                    }

                    window.game.InputTracker.ball = undefined
                }

                if (ballToDrag === null && window.game.InputTracker.ball == undefined) {
                    ctx.beginPath()
                    ctx.arc(window.game.InputTracker.x, window.game.InputTracker.y, 16, 0, 2 * Math.PI)
                    ctx.closePath()
                    ctx.fillStyle = "#000"
                    ctx.fill()
                    ctx.strokeStyle = "#fff"
                    ctx.lineWidth = 4
                    ctx.stroke()
                } else {
                    let x
                    let y
                    let dist
                    if (window.game.InputTracker.ball == undefined) {
                        x = ballToDrag.x - level.camera.props.x + 1280 / 2 / level.camera.props.zoom
                        y = -ballToDrag.y + level.camera.props.y + 720 / 2 / level.camera.props.zoom
                        dist = ballToDrag.shape.radius + 8
                    } else {
                        x = window.game.InputTracker.x
                        y = window.game.InputTracker.y
                        dist = window.game.InputTracker.ball.shape.radius + 4
                    }

                    function makeCircle(x2, y2) {
                        ctx.beginPath()
                        ctx.arc(x2, y2, 8, 0, 2 * Math.PI)
                        ctx.closePath()
                        ctx.fillStyle = "#000"
                        ctx.fill()
                        ctx.strokeStyle = "#fff"
                        ctx.lineWidth = 4
                        ctx.stroke()
                    }

                    makeCircle(x - dist, y - dist)
                    makeCircle(x + dist, y - dist)
                    makeCircle(x - dist, y + dist)
                    makeCircle(x + dist, y + dist)
                }

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