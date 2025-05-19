const Matter = require("matter-js")
const FileSaver = require("file-saver")

/** @class */
export class Canvas {
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
    element = document.createElement('canvas')

    /**
     * Width of the canvas
     * @type {number}
     */
    get width() { return this.element.width }
    set width(val) { this.element.width = val }

    /**
     * Height of the canvas
     * @type {number}
     */
    get height() { return this.element.height }
    set height(val) { this.element.height = val }

    /** @type {boolean} */
    screenshotMode = false

    /**
     * @param {number} [width=720] - The width of the canvas.
     * @param {number} [height=1280] - The height of the canvas.
     * @param {boolean} [screenshotMode=false] - Screenshot mode
     */
    constructor(width = 1280, height = 720, screenshotMode = false) {
        this.width = width
        this.height = height
        this.screenshotMode = screenshotMode
    }

    /**
     * @type {CanvasRenderingContext2D}
     * @readonly
     */
    get ctx() { return this.element.getContext('2d') }

    /** @param {number} dt */
    tick(dt) {
        let ctx = this.ctx
        ctx.clearRect(0, 0, this.width, this.height)
        ctx.globalAlpha = 1
        ctx.resetTransform()
        ctx.lineJoin = 'round'

        switch(this.mode) {
            case -1: //begin
                const fillAmount = window.game.ResourceManager.loadedResources / window.game.ResourceManager.totalResources

                if (fillAmount == 1) {
                    if (!window.game.TimeManager.timerExists('POSTLOADING')) {window.game.TimeManager.createTimer('POSTLOADING', 1)}

                    const image1 = window.game.ResourceManager.getResource('IMAGE_LOADFINISHED').image
                    
                    const image2 = window.game.ResourceManager.getResource('IMAGE_BLUE_SKIES').image

                    ctx.drawImage(image2, 0, -280, this.width, this.width)
                    ctx.drawImage(image1, 540, 260)

                    let continueButton = new CanvasButton(640, 560, window.game.TextManager.get("BUTTON_CONTINUE"))
                    continueButton.render(ctx)

                    this.renderCursor(ctx)

                    ctx.globalAlpha = Math.max(1-window.game.TimeManager.getTimer('POSTLOADING').timePassed, 0)
                    ctx.fillStyle = 'white'
                    ctx.fillRect(0, 0, this.width, this.height)

                    if (
                        window.game.TimeManager.getTimer('POSTLOADING').finished &&
                        continueButton.clicked &&
                        !this.transition
                    ) {
                        this.playLevel(window.game.arguments.level || "MapWorldView", !window.game.arguments.level)
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

                level.layers.filter(a => a.z < 0).render(this)
                
                const renderPipe = (pipe, state, stretch = 0) => {
                    var image = window.game.ResourceManager.getResource(pipe.states[state]).image
                    var w = image.width
                    var h = image.height
                    var {x, y} = this.toLevelCanvasPos(pipe.x, pipe.y, level, w, h)
                    w *= (this.screenshotMode ? 1 : level.camera.props.zoom)
                    h *= (this.screenshotMode ? 1 : level.camera.props.zoom)
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

                level.layers.filter(a => a.z == 0).render(this)

                level.bodies.forEach(b => b.render(this))

                //gooballs here
                const drawStrand = (type, ball1, ball2, ghost = false) => {
                    let ball = window.game.GooballManager.types[type]

                    var image = window.game.ResourceManager.getResource(ball.strand.img).image

                    let b1 = this.toLevelCanvasPos(ball1.x, ball1.y, level)
                    let b2 = this.toLevelCanvasPos(ball2.x, ball2.y, level)

                    let distance = Math.hypot(b2.x - b1.x, b2.y - b1.y)
                    let angle = Math.atan2(b2.y - b1.y, b2.x - b1.x)

                    ctx.save()
                    ctx.translate(b1.x, b1.y)
                    ctx.rotate(angle)
                    if (ghost) ctx.globalAlpha = 0.5
                    if (applicableStrand == level.strands.find(v => v.ball1 == ball1 && v.ball2 == ball2)) ctx.filter = "brightness(1.5)"

                    ctx.drawImage(image, 0, -image.height / 2 * (this.screenshotMode ? 1 : level.camera.props.zoom), distance, image.height * (this.screenshotMode ? 1 : level.camera.props.zoom))
                    
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
                            if (level.getStrandsOfBall(x).length === 0 && !x.attachment) return
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
                    ball.render(this, 0, 0, (this.screenshotMode ? 1 : level.camera.props.zoom))

                    if (window.game.InputTracker.withinCircle(
                        this.toLevelCanvasPos(ball.x, ball.y, level).x,
                        this.toLevelCanvasPos(ball.x, ball.y, level).y,
                        ball.shape.radius * level.camera.props.zoom + 4
                    ) && (
                        level.getStrandsOfBall(ball).length == 0 ||
                        (ball.strand && ball.strand.detachable)
                    ) && !ball.sleeping && !ball.nodrag && this.mode == 0) {
                        ballToDrag = ball 
                    }
                }

                level.layers.filter(a => a.z > 0).render(this)

                level.levelButtons.forEach(x => {
                    if (level.island && !window.game.IslandManager.levelUnlocked(x.id)) return
                    x.render(level, this)
                    if (x.clicked(level, this) && !this.transition) {
                        this.playLevel(x.id)
                    }
                })

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
                
                if (this.mode === 1 && !this.screenshotMode) {
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
                    ctx.fillText(window.game.TextManager.parseText(level.title), 36, 36)

                    let continueButton = new CanvasButton(136, 200, window.game.TextManager.get("BUTTON_CONTINUE"))
                    continueButton.render(ctx)
                    if (continueButton.clicked && !this.transition) this.togglePause(false)

                    let retryButton = new CanvasButton(136, 200 + 56, window.game.TextManager.get("BUTTON_RETRY"))
                    retryButton.render(ctx)
                    if (retryButton.clicked && !this.transition) this.playLevel(level.id, true)

                    let screenshotButton = new CanvasButton(136, 200 + 56 * 2, window.game.TextManager.get("BUTTON_SCREENSHOT"))
                    screenshotButton.render(ctx)
                    if (screenshotButton.clicked && !this.transition) this.takeScreenshot()

                    let backButton = new CanvasButton(136, 200 + 56 * 3, window.game.TextManager.get("BUTTON_RETURN"))
                    backButton.render(ctx)
                    if (backButton.clicked && !this.transition) this.playLevel(window.game.LevelManager.previousLevel, true)
                } else if (!level.camera.fixed || this.screenshotMode) {
                    let text = ""
                    if (level.debug) {
                        let mousePos = this.fromLevelCanvasPos(window.game.InputTracker.x, window.game.InputTracker.y, level)
                        text = `${window.game.InputTracker.x}, ${window.game.InputTracker.y} => ${mousePos.x.toFixed()}, ${mousePos.y.toFixed()}`
                    } else if (level.goal) {
                        switch (level.goal.type) {
                            case "balls":
                                text = window.game.TextManager.get("GOAL_BALLS", level.goalAmount, level.goal.target)
                                break
                            case "height":
                                text = window.game.TextManager.get("GOAL_HEIGHT", level.goalAmount.toFixed(1), level.goal.target.toFixed(1))
                                break
                        }
                    }

                    ctx.font = '36px "FONT_TCCEB"'
                    ctx.strokeStyle = 'black'
                    ctx.textAlign = 'left'
                    ctx.textBaseline = 'bottom'
                    ctx.lineWidth = 4
                    ctx.strokeText(text, 24, this.height - 16)
                    ctx.lineWidth = 6
                    ctx.strokeText(text, 24, this.height - 16)
                    ctx.fillStyle = 'white'
                    ctx.fillText(text, 24, this.height - 16)

                    if (level.goal && level.goalCompleted && !this.screenshotMode) {
                        let continueButton = new CanvasButton(this.width - 128, this.height - 36, window.game.TextManager.get("BUTTON_CONTINUE"))
                        continueButton.render(ctx)

                        if (continueButton.clicked && !this.transition) {
                            level.complete()
                            this.playLevel(window.game.LevelManager.previousLevel, true)
                        }
                    }
                }
                
                if (level.island && !this.screenshotMode) {
                    let backButton = new CanvasButton(128, this.height - 36, window.game.TextManager.get("BUTTON_GOBACK"))
                    backButton.render(ctx)
                    if (backButton.clicked && !this.transition) this.playLevel(window.game.LevelManager.previousLevel, true)
                }

                if (ballToDrag !== null && window.game.InputTracker.ball == undefined && window.game.InputTracker.leftOnce) {
                    window.game.InputTracker.ball = ballToDrag

                    if (level.getStrandsOfBall(ballToDrag).length > 0) {
                        level.moves += 1
                    }

                    level.deleteStrands(ballToDrag)
                    ballToDrag.getOffStrand(true)

                    window.game.InputTracker.ball.body.collisionFilter.mask = 0b10
                    window.game.InputTracker.ballConstraint = Matter.Constraint.create({
                        pointA: {
                            x: window.game.InputTracker.levelX,
                            y: window.game.InputTracker.levelY
                        },
                        bodyB: window.game.InputTracker.ball.body,
                        stiffness: 0.2,
                        length: 0,
                        damping: 0.01
                    })
                    Matter.Composite.add(window.game.LevelManager.currentLevel.engine.world, window.game.InputTracker.ballConstraint)
                } else if (window.game.InputTracker.ball !== undefined && (!window.game.InputTracker.left || this.mode == 1)) {
                    window.game.InputTracker.ball.body.collisionFilter.mask = 0b11
                    Matter.Composite.remove(window.game.LevelManager.currentLevel.engine.world, window.game.InputTracker.ballConstraint)
                    window.game.InputTracker.ballConstraint = undefined

                    if (canBuild) {
                        if (window.game.InputTracker.shift) {
                            level.createStrand(window.game.InputTracker.ball.type, applicableBalls[0], applicableBalls[1])
                            level.killGooball(window.game.InputTracker.ball)
                        } else {
                            for (let applicableBall of applicableBalls) {
                                level.createStrand(window.game.InputTracker.ball.type, window.game.InputTracker.ball, applicableBall)
                            }
                        }

                        level.createSplats(window.game.InputTracker.ball, 3)
                        level.moves += 1
                    }

                    window.game.InputTracker.ball = undefined
                }

                this.renderCursor(ctx, ballToDrag)

                break
            case 2: //level transition
                ctx.fillStyle = "black"
                ctx.fillRect(0, 0, this.width, this.height)

                if (window.game.TimeManager.getTimer('LEVELTRANSITION').timePassed < 1.5) {
                    ctx.globalAlpha = window.game.TimeManager.getTimer('LEVELTRANSITION').timePassed / 1.5
                } else if (window.game.TimeManager.getTimer('LEVELTRANSITION').timePassed > 6.5) {
                    ctx.globalAlpha = (8-window.game.TimeManager.getTimer('LEVELTRANSITION').timePassed) / 1.5
                }
                
                ctx.textAlign = "left"
                ctx.textBaseline = "top"
                ctx.font = "48px FONT_COOKIES"
                ctx.fillStyle = "#fff"
                ctx.fillText(window.game.TextManager.parseText(window.game.LevelManager.currentLevel.title), 24, 24)
                ctx.font = "24px FONT_COOKIES"
                ctx.fillStyle = "#aaa"
                ctx.fillText(window.game.TextManager.parseText(window.game.LevelManager.currentLevel.desc), 24, 80)

                let doubleease = x => Math.abs((x % 2) - 1)

                for (let i = 0; i < 20; i++) {
                    var x = (((window.game.timePassed * 1.3 / 2) % 2) + (i - 2)) * 72
                    var y = this.height - (36 + window.game.Classes.Easing.easeOut.from(doubleease(window.game.timePassed * 1.3 + i % 2)) * 96)
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
            ctx.fillRect(1 - (window.game.Classes.Easing.easeInOut.from(window.game.TimeManager.getTimer("TRANSITION").timePassed) + this.transitionType - 1) * 1300 - 10, 0, 1300, this.height)
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
                timer.finish.on(resolve)
            })
        }
        callback()
        if (outT) {
            this.transition = true
            this.transitionType = 1
            var timer = window.game.TimeManager.createTimer("TRANSITION", 1)
            await new Promise((resolve) => {
                timer.finish.on(resolve)
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
                window.game.LevelManager.playLevel(id)
                this.mode = 0
                window.game.LevelManager.currentLevel.startCamera()
            }, true, true)
            return
        }
        this.startTransition(() => {
            this.mode = 2
            window.game.LevelManager.playLevel(id)
            var timer = window.game.TimeManager.createTimer("LEVELTRANSITION", 8)
            timer.finish.on(() => {
                this.startTransition(() => {
                    this.mode = 0
                    window.game.LevelManager.currentLevel.startCamera()
                }, false, true)
            })
        }, true, false)
    }

    /**
     * Toggles the pause menu
     * Will only work if you are in a level or you are already paused
     * @param {boolean} override - Forces it to be paused or not
     */
    togglePause(override) {
        if (this.mode != 0 && this.mode != 1) return
        if (window.game.LevelManager.currentLevel.camera.fixed) return
        if (window.game.LevelManager.currentLevel.island) return
        this.mode = Number(override ?? !this.mode)
    }

    /**
     * Renders a cursor on the canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {Gooball?} ballToDrag - gooball hovered over
     */
    renderCursor(ctx, ballToDrag = null) {
        if (this.screenshotMode) return
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
                x = this.toLevelCanvasPos(ballToDrag.x, ballToDrag.y, level).x
                y = this.toLevelCanvasPos(ballToDrag.x, ballToDrag.y, level).y
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
    }

    /**
     * converts a position in the level to a position on the canvas, taking account of the camera
     * @param {number} x - the x position in the level
     * @param {number} y - the y position in the level
     * @param {number} width - the width of the object (for centering)
     * @param {number} height - the height of the object (for centering)
     * @param {Level} level - the level
     * @returns {{x: number, y: number}}
     */
    toLevelCanvasPos(x, y, level, width = 0, height = 0) {
        let zoom = (this.screenshotMode ? 1 : level.camera.props.zoom)
        return {
            x: (x - (this.screenshotMode ? 0 : level.camera.props.x) + this.width / 2 / zoom - width / 2) * zoom,
            y: (-y + (this.screenshotMode ? 0 : level.camera.props.y) + this.height / 2 / zoom - height / 2) * zoom
        }
    }
    
    /**
     * converts a position of the object to a position on the canvas
     * @param {number} x - the x position of the object
     * @param {number} y - the y position of the object
     * @param {number} width - the width of the object (for centering)
     * @param {number} height - the height of the object (for centering)
     * @param {number} zoom - the zoom
     * @returns {{x: number, y: number}}
     */
    toCanvasPos(x, y, width = 0, height = 0, zoom = 1) {
        return {
            x: x + this.width / 2 / zoom - width / 2,
            y: -y + this.height / 2 / zoom - height / 2
        }
    }

    /**
     * converts a position on the canvas to a position in the level, taking account of the camera
     * @param {number} x - the x position on the canvas
     * @param {number} y - the y position on the canvas
     * @param {Level} level - the level
     * @returns {{x: number, y: number}}
     */
    fromLevelCanvasPos(x, y, level) {
        let zoom = (this.screenshotMode ? 1 : level.camera.props.zoom)
        return this.fromCanvasPos(x / zoom + (this.screenshotMode ? 0 : level.camera.props.x), y / zoom - (this.screenshotMode ? 0 : level.camera.props.y), zoom)
    }

    /**
     * converts a position on the canvas to a position in the level
     * @param {number} x - the x position on the canvas
     * @param {number} y - the y position on the canvas
     * @param {number} zoom - the zoom
     * @returns {{x: number, y: number}}
     */
    fromCanvasPos(x, y, zoom = 1) {
        return {
            x: x - this.width / 2 / zoom,
            y: -(y - this.height / 2 / zoom)
        }
    }

    /** Downloads a screenshot of the current level */
    takeScreenshot() {
        let level = window.game.LevelManager.currentLevel
        let screenshotCanvas = new Canvas(level.width, level.height, true)
        screenshotCanvas.mode = 0
        screenshotCanvas.tick()
        
        let date = new Date(Date.now())
        let filename = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.png`

        screenshotCanvas.element.toBlob(blob => {
            FileSaver.saveAs(blob, filename)
        })
    }
}

/**
 * @class
 */
export class CanvasButton {
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
    }

    /** @type {boolean} */
    get hoveredOver() {
        return window.game.InputTracker.withinRect(this.x - this.width / 2, this.y - this.size / 2, this.x + this.width / 2, this.y + this.size / 2)
    }

    /** @type {boolean} */
    get clicked() {
        return window.game.InputTracker.leftOnce && this.hoveredOver
    }
}