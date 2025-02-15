const Matter = require("matter-js")

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

    /** @type {boolean} */
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

    get ctx() { return this.element.getContext('2d') }

    /** @param {number} dt */
    tick(dt) {
        let ctx = this.ctx
        ctx.clearRect(0, 0, 1280, 720)
        ctx.globalAlpha = 1
        ctx.resetTransform()
        ctx.lineJoin = 'round'

        let { toCanvasPos, toLevelCanvasPos } = window.game.Utils

        switch(this.mode) {
            case -1: //begin
                const fillAmount = window.game.ResourceManager.loadedResources / window.game.ResourceManager.totalResources

                if (fillAmount == 1) {
                    if (!window.game.TimeManager.timerExists('POSTLOADING')) {window.game.TimeManager.createTimer('POSTLOADING', 1)}

                    const image1 = window.game.ResourceManager.getResource('IMAGE_LOADFINISHED').image
                    
                    const image2 = window.game.ResourceManager.getResource('IMAGE_BLUE_SKIES').image

                    ctx.drawImage(image2, 0, -280, 1280, 1280)
                    ctx.drawImage(image1, 540, 260)

                    let continueButton = new CanvasButton(640, 560, 'continue')
                    ctx = continueButton.render(ctx)

                    ctx = this.renderCursor(ctx)

                    ctx.globalAlpha = Math.max(1-window.game.TimeManager.getTimer('POSTLOADING').timePassed, 0)
                    ctx.fillStyle = 'white'
                    ctx.fillRect(0, 0, 1280, 720)

                    if (
                        window.game.TimeManager.getTimer('POSTLOADING').finished &&
                        continueButton.clicked &&
                        !this.transition
                    ) {
                        this.playLevel("GoingUp")
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

                ctx = level.layers.filter(a => a.z < 0).render(ctx, level.camera.props.x, level.camera.props.y, 1, 1, level.camera.props.zoom)
                
                function renderPipe(pipe, state, stretch = 0) {
                    var image = window.game.ResourceManager.getResource(pipe.states[state]).image
                    var w = image.width
                    var h = image.height
                    var x = pipe.x + 1280 / 2 / level.camera.props.zoom - w / 2 - level.camera.props.x
                    var y = -pipe.y + 720 / 2 / level.camera.props.zoom - h / 2 + level.camera.props.y
                    var rotation = pipe.direction * Math.PI / 180
                    ctx.translate(x + w / 2, y + h / 2)

                    ctx.rotate(rotation)
                    ctx.translate(-(x + w / 2), -(y + h / 2))
                    ctx.drawImage(image, x, y - stretch, w, h + stretch)
                    ctx.translate(x + w / 2, y + h / 2)
                    ctx.rotate(-rotation)
                    ctx.translate(-(x + w / 2), -(y + h / 2))
                }
                //pipes here
                for (let pipe of level.pipes) {
                    renderPipe(pipe, "pipe", pipe.length)
                    renderPipe(pipe, pipe.isActive(level) ? "capopen" : "cap")
                }

                ctx = level.layers.filter(a => a.z == 0).render(ctx, level.camera.props.x, level.camera.props.y, 1, 1, level.camera.props.zoom)

                //gooballs here
                function drawStrand(type, ball1, ball2, ghost = false) {
                    let ball = window.game.GooballManager.types[type]

                    var image = window.game.ResourceManager.getResource(ball.strand.img).image

                    let b1 = toLevelCanvasPos(ball1.x, ball1.y, level)
                    let b2 = toLevelCanvasPos(ball2.x, ball2.y, level)

                    let distance = Math.hypot(b2.x - b1.x, b2.y - b1.y)
                    let angle = Math.atan2(b2.y - b1.y, b2.x - b1.x)

                    ctx.save()
                    ctx.translate(b1.x, b1.y)
                    ctx.rotate(angle)
                    if (ghost) ctx.globalAlpha = 0.5
                    if (applicableStrand == level.strands.find(v => v.ball1 == ball1 && v.ball2 == ball2)) ctx.filter = "brightness(1.5)"

                    ctx.drawImage(image, 0, -image.height / 2, distance, image.height)
                    
                    ctx.restore()
                    if (ghost) ctx.globalAlpha = 1
                    if (applicableStrand == level.strands.find(v => v.ball1 == ball1 && v.ball2 == ball2)) ctx.filter = ""
                }
                let applicableBalls = []
                let applicableStrand = null
                let canBuild = false
                if (window.game.InputTracker.ball && this.mode == 0) {
                    for (let strand of level.strands) {
                        if (window.game.Utils.intersectsLine(
                            window.game.InputTracker.ball.x, window.game.InputTracker.ball.y,
                            strand.ball1.x, strand.ball1.y,
                            strand.ball2.x, strand.ball2.y,
                            window.game.InputTracker.ball.shape.radius / 1.5,
                        ) && !window.game.GooballManager.types[strand.type].noclimb) {
                            applicableStrand = strand
                            break
                        }
                    }

                    (() => {
                        if (applicableStrand) return
                        level.balls.forEach(x => {
                            if (x === window.game.InputTracker.ball) return
                            if (x.nobuild) return
                            if (x.sleeping) return
                            if (level.getStrandsOfBall(x).length === 0) return
                            if (!window.game.InputTracker.shift) {
                                if (Math.hypot(x.x - window.game.InputTracker.ball.x, x.y - window.game.InputTracker.ball.y) < window.game.InputTracker.ball.strand.length - window.game.InputTracker.ball.strand.range) return
                            }
                            if (Math.hypot(x.x - window.game.InputTracker.ball.x, x.y - window.game.InputTracker.ball.y) > window.game.InputTracker.ball.strand.length + window.game.InputTracker.ball.strand.range) return
                            applicableBalls.push(x)
                        })
                        
                        if (!window.game.InputTracker.ball.strand) return
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
                            if (level.getStrandFromBalls(ball1, ball2) !== undefined) return
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
                    })()
                }
                for (let strand of level.strands) {
                    drawStrand(strand.type, strand.ball1, strand.ball2)
                }
                let ballToDrag = null
                for (
                    let ball of level.balls
                    .sort((a, b) => !b.strandOn - !a.strandOn)
                    .sort((a, b) => (a === window.game.InputTracker.ball) - (b === window.game.InputTracker.ball))
                ) {
                    ball.render(ctx, level.camera.props.x, level.camera.props.y, level.camera.props.zoom)

                    if (window.game.InputTracker.withinCircle(
                        toLevelCanvasPos(ball.x, ball.y, level).x,
                        toLevelCanvasPos(ball.x, ball.y, level).y,
                        ball.shape.radius * level.camera.props.zoom + 4
                    ) && (
                        level.getStrandsOfBall(ball).length == 0 ||
                        ball.strand.detachable
                    ) && !ball.sleeping && this.mode == 0) {
                        ballToDrag = ball 
                    }
                }

                ctx = level.layers.filter(a => a.z > 0).render(ctx, level.camera.props.x, level.camera.props.y, 1, 1, level.camera.props.zoom)

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

                                break
                        }
                        ctx.fillStyle = "#3338"
                        ctx.strokeStyle = "#333"
                        if (ball == window.game.InputTracker.ball || ball == ballToDrag) {
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

                    for (var pipe of level.pipes) {
                        ctx.beginPath()
                        ctx.arc(
                            pipe.x - level.camera.props.x + 1280 / 2 / level.camera.props.zoom,
                            -pipe.y + level.camera.props.y + 720 / 2 / level.camera.props.zoom,
                            pipe.radius, 0, 2 * Math.PI
                        )
                        ctx.closePath()
                        ctx.fillStyle = "#0f08"
                        ctx.strokeStyle = "#0f0"
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
                    ctx.translate(1280 / 2, 720 / 2)
                    ctx.rotate(-0.1)

                    ctx.fillStyle = "#000"
                    ctx.fillRect(-1000, -750, 2000, 500)
                    ctx.fillRect(-1000, 250, 2000, 500)

                    ctx.resetTransform()

                    ctx.font = '48px "FONT_COOKIES"'
                    ctx.fillStyle = "#fff"
                    ctx.textAlign = 'left'
                    ctx.textBaseline = 'top'
                    ctx.fillText(level.title, 36, 36)

                    let continueButton = new CanvasButton(136, 200, 'continue')
                    ctx = continueButton.render(ctx)
                    if (continueButton.clicked) this.togglePause(false)

                    let retryButton = new CanvasButton(136, 256, 'retry')
                    ctx = retryButton.render(ctx)
                    if (retryButton.clicked && !this.transition) this.playLevel(level.id, true)
                } else if (!level.camera.props.fixed) {
                    let text = ""
                    if (level.debug) {
                        let mousePos = window.game.Utils.fromLevelCanvasPos(window.game.InputTracker.x, window.game.InputTracker.y, level)
                        text = `${mousePos.x.toFixed()}, ${mousePos.y.toFixed()}`
                    } else if (level.goal) {
                        switch (level.goal.type) {
                            case "balls":
                                text = `${level.goalAmount} of ${level.goal.target} balls collected`
                        }
                    }

                    ctx.font = '36px "FONT_TCCEB"'
                    ctx.strokeStyle = 'black'
                    ctx.textAlign = 'left'
                    ctx.textBaseline = 'bottom'
                    ctx.lineWidth = 4
                    ctx.strokeText(text, 24, 720 - 16)
                    ctx.lineWidth = 6
                    ctx.strokeText(text, 24, 720 - 16)
                    ctx.fillStyle = 'white'
                    ctx.fillText(text, 24, 720 - 16)

                    if (level.goalCompleted) {
                        let continueButton = new CanvasButton(1280 - 128, 720 - 36, 'continue')
                        ctx = continueButton.render(ctx)
                    }
                }

                if (ballToDrag !== null && window.game.InputTracker.ball == undefined && window.game.InputTracker.leftOnce) {
                    window.game.InputTracker.ball = ballToDrag

                    level.deleteStrands(ballToDrag)
                    ballToDrag.getOffStrand(true)

                    Matter.Body.setStatic(window.game.InputTracker.ball.body, true)
                    window.game.InputTracker.ball.body.collisionFilter.mask = 0b10
                    
                } else if (window.game.InputTracker.ball !== undefined && (!window.game.InputTracker.left || this.mode == 1)) {
                    Matter.Body.setStatic(window.game.InputTracker.ball.body, false)
                    window.game.InputTracker.ball.body.collisionFilter.mask = 0b11

                    if (canBuild) {
                        if (window.game.InputTracker.shift) {
                            level.createStrand(window.game.InputTracker.ball.type, applicableBalls[0], applicableBalls[1])
                            level.killGooball(window.game.InputTracker.ball)
                        } else {
                            for (let applicableBall of applicableBalls) {
                                level.createStrand(window.game.InputTracker.ball.type, window.game.InputTracker.ball, applicableBall)
                            }
                        }
                    } else if (applicableStrand) {
                        window.game.InputTracker.ball.putOnStrand(
                            applicableStrand,
                            window.game.Utils.intersectsLineProgress(
                                window.game.InputTracker.ball.x, window.game.InputTracker.ball.y,
                                applicableStrand.ball1.x, applicableStrand.ball1.y,
                                applicableStrand.ball2.x, applicableStrand.ball2.y,
                            )
                        )
                    }

                    window.game.InputTracker.ball = undefined
                }

                ctx = this.renderCursor(ctx, ballToDrag)

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

    /**
     * Toggles the pause menu
     * Will only work if you are in a level or you are already paused
     * @argument {boolean} override - Forces it to be paused or not
     */
    togglePause(override) {
        if (this.mode != 0 && this.mode != 1) return
        this.mode = Number(override ?? !this.mode)
    }

    /**
     * Renders a cursor on the canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {Gooball?} ballToDrag - gooball hovered over
     * @returns {CanvasRenderingContext2D}
     */
    renderCursor(ctx, ballToDrag = null) {
        let { toCanvasPos, toLevelCanvasPos } = window.game.Utils
        let level = window.game.LevelManager.currentLevel

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
                x = toLevelCanvasPos(ballToDrag.x, ballToDrag.y, level).x
                y = toLevelCanvasPos(ballToDrag.x, ballToDrag.y, level).y
                dist = ballToDrag.shape.radius * level.camera.props.zoom + 8
            } else {
                x = window.game.InputTracker.x
                y = window.game.InputTracker.y
                dist = window.game.InputTracker.ball.shape.radius * level.camera.props.zoom + 4
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

        return ctx
    }
}

/**
 * @class
 */
class CanvasButton {
    /** @type {number} */
    x = 0

    /** @type {number} */
    y = 0

    /** @type {number} */
    width = 0

    /** @type {number} */
    size = 16

    /** @type {string} */
    text = ""

    constructor(x, y, text = "", width = 216, size = 40) {
        this.x = x
        this.y = y
        this.width = width
        this.size = size
        this.text = text
    }

    /**
     * Renders the button
     * @param {CanvasRenderingContext2D} ctx
     * @returns {CanvasRenderingContext2D}
     */
    render(ctx) {
        ctx.beginPath()
        ctx.roundRect(this.x - this.width / 2, this.y - this.size / 2, this.width, this.size, 8)
        ctx.closePath()
        ctx.fillStyle = "#000"
        if (this.hoveredOver) ctx.fillStyle = "#222"
        ctx.fill()

        ctx.textBaseline = "middle"
        ctx.textAlign = "center"
        ctx.font = `${this.size*0.8}px FONT_TCCEB`
        ctx.fillStyle = "#fff"
        ctx.fillText(this.text, this.x, this.y)

        return ctx
    }

    get hoveredOver() {
        return window.game.InputTracker.withinRect(this.x - this.width / 2, this.y - this.size / 2, this.x + this.width / 2, this.y + this.size / 2)
    }

    get clicked() {
        return window.game.InputTracker.leftOnce && this.hoveredOver
    }
}