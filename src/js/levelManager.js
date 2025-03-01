const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")
const Matter = require("matter-js")

// TODO: support for level.js (custom code for levels)

/** @class */
export class LevelManager {
    /** @type {Object<string, Level>} */
    levels = {}

    /** @type {Level?} */
    currentLevel

    /** @param {string} src */
    async addLevel(src) {
        const id = path.basename(src)

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: "attributes",
            attributeNamePrefix: "",
            allowBooleanAttributes: true,
            parseAttributeValue: true,
            alwaysCreateTextNode: true,
            textNodeName: "value",
            isArray: (tagName) => tagName !== "attributes"
        })

        const xml = parser.parse((await fs.readFile(path.join(src, "level.xml"))).toString())

        this.levels[id] = new Level(xml.level[0], id)
    }

    /**
     * @param {Level | string} v
     * @returns {Level}
     */
    playLevel(v) {
        if (v instanceof Level) this.currentLevel = v.clone()
        else this.currentLevel = this.levels[v].clone()

        this.currentLevel.engine = Matter.Engine.create()
        this.currentLevel.engine.gravity.y = -1
        for (let body of this.currentLevel.bodies) {
            let currentComposite = Matter.Composite.add(this.currentLevel.engine.world, body.body)
            body.body = currentComposite.bodies[currentComposite.bodies.length-1]
        }
        for (let ball of this.currentLevel.balls) {
            let currentComposite = Matter.Composite.add(this.currentLevel.engine.world, ball.body)
            ball.body = currentComposite.bodies[currentComposite.bodies.length-1]
        }
        for (let strand of this.currentLevel.strands) {
            let currentComposite = Matter.Composite.add(this.currentLevel.engine.world, strand.constraint)
            strand.constraint = currentComposite.constraints[currentComposite.constraints.length-1]
            strand.ball1 = this.currentLevel.getGooballFromRef(strand.ball1.ref)
            strand.ball2 = this.currentLevel.getGooballFromRef(strand.ball2.ref)
        }

        return this.currentLevel
    }
}

export class Level {
    /** @type {LayerGroup} */
    layers = new window.game.Classes.Layer.Group

    /** @type {Camera} */
    camera = new Camera

    /**
     * This is only available when the level is being played
     * @type {Matter.Engine}
     * @see {@link https://brm.io/matter-js/docs/classes/Engine.html|Matter.Engine}
     */
    engine

    /** @type {GenericBody[]} */
    bodies = []

    /** @type {Gooball[]} */
    balls = []

    /** @type {Pipe[]} */
    pipes = []

    /** @type {Strand[]} */
    strands = []

    /** @type {LevelButton[]} */
    levelButtons = []

    /** @type {string} */
    id

    /** @type {Object} */
    xml

    /** @type {string} */
    title

    /** @type {string} */
    desc = ""

    /** @type {boolean} */
    debug = false

    /** @type {number} */
    width

    /** @type {number} */
    height

    /** @type {number} */
    timeSpent = 0

    /**
     * conditions to win level
     * @type {Object?}
     * @property {string} type - "balls" for amount of balls, "height" for height of structure, more soon
     * @property {number} target
     * @property {number?} start - for "height", lowest y at where height is measured
     */
    goal

    /**
     * @type {number}
     * @readonly
     */
    get goalAmount() {
        if (!this.goal) return 0

        switch(this.goal.type) {
            case "balls":
                return this.pipes.reduce((v, p) => v + p.ballsSucked, 0)
            case "height":
                return this.balls.reduce((v, b) => 
                    ((b.y - this.goal.start) / 100 > v &&
                    this.getStrandsOfBall(b).length > 0)
                ? (b.y - this.goal.start) / 100 : v , 0)
        }
        
        return 0
    }

    /**
     * @type {boolean}
     * @readonly
     */
    get goalCompleted() {
        return this.goalAmount >= this.goal.target
    }

    /**
     * @type {LevelProfile}
     * @readonly
     */
    get profileData() {
        return window.game.ProfileManager.currentProfile.getLevel(this.id)
    }

    /**
     * @type {Island?}
     * @readonly
     */
    get island() {
        return window.game.IslandManager.islands[this.id]
    }

    /**
     * @param {Object} xml
     * @param {string} id 
     * @param {boolean} [clone=false]
     */
    constructor(xml, id, clone = false) {
        this.id = id
        this.xml = xml
        this.title = xml.head[0].title ? xml.head[0].title[0].value : ""
        this.desc = xml.head[0].desc ? xml.head[0].desc[0].value : ""
        this.debug = xml.attributes ? xml.attributes.debug : false

        this.width = xml.head[0].camera[0].attributes.width
        this.height = xml.head[0].camera[0].attributes.height

        //parse dem resources
        if (!clone) {
            for (const [key, value] of Object.entries(xml.resources[0])) {
                for (const resource of value) {
                    window.game.ResourceManager.addResource(key, resource.attributes.id, path.join(__dirname, "../data", resource.attributes.src))
                }
            }
        }

        //goal
        if (xml.head[0].goal) {
            this.goal = {
                type: xml.head[0].goal[0].attributes.type,
                target: xml.head[0].goal[0].attributes.target
            }
            if (this.goal.type == "height") {
                this.goal.start = xml.head[0].goal[0].attributes.start
            }
        }

        //camera
        if (xml.head[0].camera && xml.head[0].camera[0].keyframe) {
            for (let [i, v] of Object.entries(xml.head[0].camera[0].keyframe)) {
                let keyframe = new CameraKeyframe
                keyframe.x = window.game.Utils.parseAttribute(v.attributes.x, 0)
                keyframe.y = window.game.Utils.parseAttribute(v.attributes.y, 0)
                keyframe.zoom = window.game.Utils.parseAttribute(v.attributes.zoom, 0)
                keyframe.duration = window.game.Utils.parseAttribute(v.attributes.duration, 0)
                keyframe.pause = window.game.Utils.parseAttribute(v.attributes.pause, 0) + (i == 1 ? 1 : 0)
                this.camera.keyframes.push(keyframe)
            }
        }

        //parse dem everythinjg else
        for (const [key, value] of Object.entries(xml.scene[0])) {
            switch (key) {
                case "layer":
                    for (let v of value) {
                        this.layers.push(window.game.Classes.Layer.fromXML(v.attributes))
                    }
                    break
                case "rect":
                    for (let v of value) {
                        this.bodies.push(new RectBody(v.attributes))
                    }
                    break
                case "circle":
                    for (let v of value) {
                        this.bodies.push(new CircleBody(v.attributes))
                    }
                    break
                case "ball":
                    for (let v of value) {
                        let ball = window.game.GooballManager.types[v.attributes.type].clone()
                        ball.x = window.game.Utils.parseAttribute(v.attributes.x)
                        ball.y = window.game.Utils.parseAttribute(v.attributes.y)
                        ball.ref = String(v.attributes.ref)
                        ball.sleeping = v.attributes.sleeping ?? false
                        this.balls.push(ball)
                    }
                    break
                case "strand":
                    for (let v of value) {
                        let type = v.attributes.type
                        let ball1 = this.getGooballFromRef(String(v.attributes.from))
                        let ball2 = this.getGooballFromRef(String(v.attributes.to))
                        this.createStrand(type, ball1, ball2)
                    }
                    break
                case "pipe":
                    for (let v of value) {
                        let pipe = window.game.PipeManager.types[v.attributes.type].clone()
                        pipe.x = window.game.Utils.parseAttribute(v.attributes.x)
                        pipe.y = window.game.Utils.parseAttribute(v.attributes.y)
                        pipe.direction = window.game.Utils.parseAttribute(v.attributes.direction, 0)
                        pipe.radius = window.game.Utils.parseAttribute(v.attributes.radius, 80)
                        pipe.length = window.game.Utils.parseAttribute(v.attributes.length, 65535)
                        pipe.ref = String(v.attributes.ref)
                        this.pipes.push(pipe)
                    }
                    break
                case "levelbutton":
                    for (let v of value) {
                        let button = new LevelButton()
                        button.x = window.game.Utils.parseAttribute(v.attributes.x, 0)
                        button.y = window.game.Utils.parseAttribute(v.attributes.y, 0)
                        button.id = String(v.attributes.id)
                        this.levelButtons.push(button)
                    }
                    break
                default:
                    console.warn(`unknown object '${key}' in level ${this.id}`)
            }
        }
    }

    /**
     * Creates a exact clone of itself
     * @returns {Level}
     */
    clone() {
        return new Level(this.xml, this.id, true)
    }

    /**
     * @param {string} ref
     * @returns {Layer?}
     */
    getLayerFromRef(ref) {
        return this.layers.find(layer => layer.ref === ref)
    }

    /**
     * @param {string} ref
     * @returns {GenericBody?}
     */
    getBodyFromRef(ref) {
        return this.bodies.find(body => body.ref === ref)
    }

    /**
     * @param {string} ref
     * @returns {Gooball?}
     */
    getGooballFromRef(ref) {
        return this.balls.find(ball => ball.ref === ref)
    }

    /**
     * @param {Gooball} ball
     * @returns {Strand[]}
     */
    getStrandsOfBall(ball) {
        return this.strands.filter(strand => strand.ball1 === ball || strand.ball2 === ball)
    }

    /**
     * @param {Gooball} a
     * @param {Gooball} b
     * @returns {Strand?}
     */
    getStrandFromBalls(a, b) {
        return this.strands.find(strand => (strand.ball1 === a && strand.ball2 === b) || (strand.ball1 === b && strand.ball2 === a))
    }

    /** 
     * @param {Strand} strand
     * @returns {Gooball[]}
     */
    getBallsOnStrand(strand) {
        return this.balls.filter(ball => ball.strandOn && ball.strandOn.strand === strand)
    }

    /** @param {Gooball} gooball */
    killGooball(gooball) {
        this.deleteStrands(gooball)
        this.balls = this.balls.filter(v => v !== gooball)
        Matter.Composite.remove(this.engine.world, gooball.body)
        this.createSplats(gooball, 5)
    }

    /**
     * @param {Gooball} ball 
     * @param {number} amount 
     */
    createSplats(ball, amount = 1) {
        for (let i = 0; i < amount; i++) {
            let splat = ball.createSplat()
            this.layers.push(splat)
        }
    }

    /**
     * @param {Gooball} a
     * @param {Gooball} b
     */
    deleteStrand(a, b) {
        //NOTE: i cant use getStrandFromBalls cus i need the index
        for (let i in this.strands) {
            let strand = this.strands[i]
            if ((strand.ball1 === a && strand.ball2 === b) || (strand.ball1 === b && strand.ball2 === a)) {
                Matter.Composite.remove(this.engine.world, strand.constraint)

                this.getBallsOnStrand(strand).forEach(v => v.getOffStrand())
                this.strands.splice(i,1)

                for (let ball of [a, b]) {
                    if (this.getStrandsOfBall(ball).length == 0 && ball !== window.game.InputTracker.ball) {
                        ball.body.collisionFilter.mask = 0b11
                        Matter.Body.setStatic(ball.body, false)

                        for (let pipe of this.pipes) { //leap bog wog1 thing
                            if (pipe.ballsInRange([ball], 16).length > 0) {
                                this.killGooball(ball)
                                pipe.ballsSucked += 1
                                break
                            }
                        }
                    }
                }

                return
            }
        }
    }

    /** @param {Gooball} a */
    deleteStrands(a) {
        this.getStrandsOfBall(a).forEach(v => this.deleteStrand(v.ball1, v.ball2))
    }

    /**
     * @param {string} type
     * @param {Gooball} a
     * @param {Gooball} b
     */
    createStrand(type, a, b) {
        let strand = new Strand(type, a, b)
        if (this.engine) Matter.Composite.add(this.engine.world, strand.constraint)
        a.body.collisionFilter.mask = 0b10
        b.body.collisionFilter.mask = 0b10
        this.strands.push(strand)
    }

    /** @param {number} dt */
    tick(dt) {
        this.timeSpent += dt

        if (this.camera.fixed == false && window.game.InputTracker.inWindow) {
            if (100 - window.game.InputTracker.x > 0) {
                this.camera.props.x -= (100 - window.game.InputTracker.x) * dt * 12 / this.camera.props.zoom
            } else if (-1180 + window.game.InputTracker.x > 0) {
                this.camera.props.x += (-1180 + window.game.InputTracker.x) * dt * 12 / this.camera.props.zoom
            }

            if (100 - window.game.InputTracker.y > 0) {
                this.camera.props.y += (100 - window.game.InputTracker.y) * dt * 12 / this.camera.props.zoom
            } else if (-620 + window.game.InputTracker.y > 0) {
                this.camera.props.y -= (-620 + window.game.InputTracker.y) * dt * 12 / this.camera.props.zoom
            }
        }

        const clamp = (a, b, c) => Math.min(c, Math.max(b, a))

        this.camera.props.x = clamp(
            -((this.width - 1280 / this.camera.props.zoom) / 2),
            this.camera.props.x,
            (this.width - 1280 / this.camera.props.zoom) / 2
        )

        this.camera.props.y = clamp(
            -((this.height - 720/ this.camera.props.zoom) / 2),
            this.camera.props.y,
            (this.height - 720 / this.camera.props.zoom) / 2
        )

        this.layers.tick(dt)

        if (window.game.InputTracker.ball != undefined) {
            let nextx = window.game.Utils.fromLevelCanvasPos(window.game.InputTracker.x, window.game.InputTracker.y, this).x
            let nexty = window.game.Utils.fromLevelCanvasPos(window.game.InputTracker.x, window.game.InputTracker.y, this).y

            window.game.InputTracker.ball.vx = nextx - window.game.InputTracker.ball.x
            window.game.InputTracker.ball.vy = nexty - window.game.InputTracker.ball.y

            window.game.InputTracker.ball.x = nextx
            window.game.InputTracker.ball.y = nexty
        }

        for (let ball of this.balls) {
            ball.tick(dt)

            if (ball.antigrav) ball.body.gravityScale = this.getStrandsOfBall(ball).length > 0 ? -1 : 1

            if (ball.sleeping) {
                for (let ball2 of this.balls) {
                    if (
                        ball2 != ball &&
                        !ball2.sleeping &&
                        this.getStrandsOfBall(ball2).length > 0 &&
                        window.game.Utils.withinCircle(
                            ball.x, ball.y,
                            ball2.x, ball2.y,
                            ball2.strand.length
                        )
                    ) {
                        ball.sleeping = false
                    }
                }

                if (this.balls.find(
                    v => v !== ball &&
                    this.getStrandFromBalls(ball, v) !== undefined &&
                    !v.sleeping
                )) ball.sleeping = false
            }

            for (let body of this.bodies) {
                if (ball != window.game.InputTracker.ball && Matter.Query.collides(body.body, [ball.body]).length > 0) {
                    if (!ball.nostick && (body.sticky || ball.sticky) && this.getStrandsOfBall(ball).length > 0) Matter.Body.setStatic(ball.body, true)
                    if (body.detaches && this.getStrandsOfBall(ball).length > 0) this.deleteStrands(ball)
                    if (body.deadly) this.killGooball(ball)
                }
            }

            for (let strand of this.strands) {
                if (
                    window.game.Utils.intersectsLine(
                        ball.x, ball.y,
                        strand.ball1.x, strand.ball1.y,
                        strand.ball2.x, strand.ball2.y,
                        ball.shape.radius / 1.5
                    ) &&
                    !ball.strandOn &&
                    !window.game.GooballManager.types[strand.type].noclimb &&
                    window.game.InputTracker.ball != ball &&
                    this.getStrandsOfBall(ball).length == 0 &&
                    this.pipes.filter(v => v.isActive(this)).reduce((p, v) => {
                        return p && v.ballsInRange([ball]).length == 0
                    }, true)
                ) {
                    let progress = window.game.Utils.intersectsLineProgress(
                        ball.x, ball.y,
                        strand.ball1.x, strand.ball1.y,
                        strand.ball2.x, strand.ball2.y
                    )

                    strand.ball1.vx += ball.vx * progress / 2
                    strand.ball1.vy += ball.vy * progress / 2
                    strand.ball2.vx += ball.vx * (1 - progress) / 2
                    strand.ball2.vy += ball.vy * (1 - progress) / 2

                    ball.putOnStrand(strand, progress)
                }
            }

            if (ball.strandOn) {
                ball.strandOn.progress += (
                    ball.climbspeed *
                    dt /
                    ball.strandOn.strand.length *
                    (ball.strandOn.reverse ? -1 : 1) *
                    (this.pipes.find(pipe => pipe.isActive(this)) ? 4 : 1) *
                    !ball.sleeping
                )

                if (ball.strandOn.progress <= 0 || ball.strandOn.progress >= 1) {
                    let choiceball = ball.strandOn.progress <= 0 ? ball.strandOn.strand.ball1 : ball.strandOn.strand.ball2
                    let choicestrands = this.getStrandsOfBall(choiceball).filter(v =>
                        !(v.ball1.noclimb || v.ball2.noclimb)
                    )

                    let choicestrand = choicestrands[Math.floor(Math.random() * choicestrands.length)]

                    if (Math.random() < ball.intelligence) {
                        let newchoicestrand = choicestrands.sort((a, b) => {
                            let ballA = choiceball == a.ball1 ? a.ball2 : a.ball1
                            let ballB = choiceball == b.ball1 ? b.ball2 : b.ball1

                            let activePipes = this.pipes.filter(pipe => pipe.isActive(this))
                                .sort((a, b) => {
                                    return Math.hypot(a.x - ballA.x, a.y - ballA.y) - Math.hypot(b.x - ballA.x, b.y - ballA.y)
                                })

                            if (activePipes[0]) {
                                return Math.hypot(activePipes[0].x - ballA.x, activePipes[0].y - ballA.y) - Math.hypot(activePipes[0].x - ballB.x, activePipes[0].y - ballB.y)
                            } 

                            return this.camera.distanceFromCamera(ballA.x, ballA.y) - this.camera.distanceFromCamera(ballB.x, ballB.y)
                        })[0]

                        if (newchoicestrand != ball.strandOn.strand) choicestrand = newchoicestrand
                    }

                    let choiceIsFirst = choiceball == choicestrand.ball1
                    let diffProgress = ball.strandOn.progress <= 0 ? -ball.strandOn.progress : 1 - ball.strandOn.progress

                    ball.putOnStrand(choicestrand, (!choiceIsFirst ? 1 - diffProgress : diffProgress), !choiceIsFirst)
                }

                let point = ball.strandOn.strand.pointOnStrand(ball.strandOn.progress)

                Matter.Body.setPosition(ball.body, Matter.Vector.create(point.x, point.y))

                if (
                    !this.pipes.filter(v => v.isActive(this)).reduce((p, v) => {
                        return p && v.ballsInRange([ball]).length == 0
                    }, true)
                ) {
                    ball.getOffStrand()
                }
            }

            for (let pipe of this.pipes.filter(pipe => pipe.isActive(this))) {
                if (pipe.ballsInRange([ball]).length == 0) continue

                if (pipe.ballsInRange([ball], pipe.radius - 16).length > 0 && this.getStrandsOfBall(ball).length == 0 && ball !== window.game.InputTracker.ball) {
                    this.killGooball(ball)
                    pipe.ballsSucked += 1
                    continue
                }

                let directionToPipe = {
                    x: pipe.x - ball.x,
                    y: pipe.y - ball.y
                }

                let distance = Math.hypot(directionToPipe.x, directionToPipe.y)
                directionToPipe.x /= distance
                directionToPipe.y /= distance

                Matter.Body.applyForce(ball.body, ball.body.position, Matter.Vector.create(
                    directionToPipe.x * ball.body.mass * 0.004,
                    directionToPipe.y * ball.body.mass * 0.004
                ))
            }
        }

        Matter.Engine.update(this.engine, dt * 1000)
    }

    /**
     * Plays the camera's keyframes
     */
    startCamera() {
        this.camera.playKeyframes()
    }

    /**
     * Finish the level
     */
    complete() {
        let data = this.profileData
        data.completed = true
        switch (this.goal.type) {
            case "balls":
                data.balls = Math.max(data.balls, this.goalAmount)
                break
            case "height":
                data.height = Math.max(data.height, this.goalAmount)
                break
        }
        data.time = Math.min(data.time, this.timeSpent)
        //TODO: moves
    }
}

/** @class */
export class Camera {
    /**
     * @type {Object}
     * @property {number} x
     * @property {number} y
     * @property {number} zoom
     */
    props = {
        x: 0,
        y: 0,
        zoom: 1
    }

    /**
     * Keyframes to play when the level starts.
     * @type {Keyframe[]}
     */
    keyframes = []

    /**
     * Stops player from moving camera around
     * @type {boolean}
     */
    fixed = false

    /**
     * get distance from point to camera
     * @param {number} x
     * @param {number} y
     * @return {number}
     */
    distanceFromCamera(x, y) {
        return Math.hypot(x - this.props.x, y - this.props.y)
    }

    /**
     * Plays a keyframe
     * @param {CameraKeyframe} keyframe
     * @returns {Timer}
     */
    playKeyframe(keyframe) {
        let timer = window.game.TimeManager.createTimer('CAMERA_KEYFRAME', Math.max(keyframe.duration + keyframe.pause, 0.001))
        const originalProps = this.props

        this.fixed = true

        timer.while = (timePassed) => {
            let progress = Math.min((timePassed - keyframe.pause) / keyframe.duration, 1)
            if (progress > 0) {
                this.props = {
                    x: keyframe.easing.from(progress) * (keyframe.x - originalProps.x) + originalProps.x,
                    y: keyframe.easing.from(progress) * (keyframe.y - originalProps.y) + originalProps.y,
                    zoom: keyframe.easing.from(progress) * (keyframe.zoom - originalProps.zoom) + originalProps.zoom
                }
            }
        }
        timer.onfinish = () => { this.fixed = false }

        return timer
    }

    /**
     * Plays keyframes in order
     * @param {CameraKeyframe[]} keyframes - By default will play from the preset keyframes property of the camera
     */
    playKeyframes(keyframes = this.keyframes) {
        if (keyframes.length == 0) return

        const doKeyframe = (i) => {
            let keyframe = keyframes[i]
            let timer = this.playKeyframe(keyframe)

            if (i < keyframes.length - 1) {
                timer.onfinish = () => {
                    doKeyframe(i + 1)
                }
            }
        }

        doKeyframe(0)
    }
}

/** @class */
export class CameraKeyframe {
    /** @type {number} */
    x = 0

    /** @type {number} */
    y = 0

    /** @type {number} */
    zoom = 1

    /** @type {Easing} */
    easing

    /** @type {number} */
    duration = 0

    /**
     * pause BEFORE the keyframe
     * @type {number}
     */
    pause = 0

    constructor() {
        this.easing = window.game.Classes.Easing.easeInOut //default
    }
}

export class GenericBody {
    /**
     * @type {string}
     * @readonly\ 
     */
    type = "generic"

    /**
     * @type {Matter.Body}
     * @see {@link https://brm.io/matter-js/docs/classes/Body.html|Matter.Body}
     */
    body

    /** @type {string?} */
    ref

    /**
     * Detaches gooballs from their strands on touch
     * @type {boolean}
     */
    detaches = false

    /**
     * Makes gooballs stick to the body
     * @type {boolean}
     */
    sticky = false

    /**
     * Kills gooballs on touch
     * @type {boolean}
     */
    deadly = false

    /** @type {number} */
    get x() { return this.body.position.x }
    set x(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(val, this.y)) }

    /** @type {number} */
    get y() { return this.body.position.y }
    set y(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(this.x, val)) }

    /** @type {number} */
    get rotation() { return -this.body.angle * 180 / Math.PI}
    set rotation(val) { Matter.Body.rotate(this.body, (this.rotation-val) / 180 * Math.PI) }

    /** @type {number} */
    get mass() { return this.body.mass }
    set mass(val) { Matter.Body.setMass(this.body, val) }

    /** @type {boolean} */
    get static() { return this.body.isStatic }
    set static(val) { Matter.Body.setStatic(this.body, val) }

    /** @type {Material} */
    #material
    /** @type {string} */
    get material() { return this.#material.name }
    set material(val) {
        this.#material = window.game.MaterialManager.getMaterial(val)
        this.body.friction = this.#material.friction
        this.body.restitution = this.#material.bounciness
    }

    /** @type {Array<{x: number, y: number}>} */
    get vertices() { return this.body.vertices }
    set vertices(x) {
        Matter.Body.setVertices(this.body, x)
    }

    /** @param {Object} attributes */
    constructor(attributes, body) {
        this.body = body || Matter.Body.Create()
        this.body.collisionFilter.category = 0b10
        this.body.collisionFilter.mask = 0b11

        this.ref = String(attributes.ref) || null

        this.x = window.game.Utils.parseAttribute(attributes.x)
        this.y = window.game.Utils.parseAttribute(attributes.y)

        this.rotation = window.game.Utils.parseAttribute(attributes.rotation, 0)

        this.static = window.game.Utils.parseAttribute(attributes.static, false)

        this.material = window.game.Utils.parseAttribute(attributes.material, "default")

        this.sticky = window.game.Utils.parseAttribute(attributes.sticky, false)
        this.detaches = window.game.Utils.parseAttribute(attributes.detaches, false)
        this.deadly = window.game.Utils.parseAttribute(attributes.deadly, false)
    }

    /**
     * Gets if a point is inside a body
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    pointInsideBody(x, y) {
        return window.game.Utils.withinPolygon(x, y, this.vertices)
    }

    /**
     * Checks if the body is being clicked on
     * @returns {boolean}
     */
    clickedOn() {
        return this.pointInsideBody(window.game.InputTracker.x, window.game.InputTracker.y) && window.game.InputTracker.leftOnce
    }
}

/** @extends GenericBody */
export class RectBody extends GenericBody {
    type = "rect"

    /**
     * @type {number}
     * @readonly
     */
    width

    /**
     * @type {number}
     * @readonly
     */
    height

    constructor(attributes) {
        super(attributes, Matter.Bodies.rectangle(0, 0, window.game.Utils.parseAttribute(attributes.width), window.game.Utils.parseAttribute(attributes.height)))

        this.width = window.game.Utils.parseAttribute(attributes.width)
        this.height = window.game.Utils.parseAttribute(attributes.height)
    }
}

/** @extends GenericBody */
export class CircleBody extends GenericBody {
    type = "circle"

    /**
     * @type {number}
     * @readonly
     */
    radius

    constructor(attributes) {
        super(attributes, Matter.Bodies.circle(0, 0, attributes.radius))

        this.radius = window.game.Utils.parseAttribute(attributes.radius)
    }
}

/** @class */
export class Strand {
    /**
     * @type {Matter.Constraint}
     * @see {@link https://brm.io/matter-js/docs/classes/Constraint.html|Matter.Constraint}
     * @readonly
     */
    constraint

    /** @type {string} */
    type

    #ball1
    /** @type {Gooball} */
    get ball1() { return this.#ball1 }
    set ball1(val) {
        this.#ball1 = val
        this.constraint.bodyA = this.#ball1.body
    }

    #ball2
    /** @type {Gooball} */
    get ball2() { return this.#ball2 }
    set ball2(val) {
        this.#ball2 = val
        this.constraint.bodyB = this.#ball2.body
    }

    /** 
     * distance between the two balls
     * @type {number}
     * @readonly
     */
    get length() {
        return Matter.Constraint.currentLength(this.constraint)
    }

    /**
     * get a point on the strand
     * @param {number} progress - where on the strand, example is 0.5 being the middle
     * @returns {{x: number, y: number}}
     */
    pointOnStrand(progress) {
        let x = this.ball1.x + (this.ball2.x - this.ball1.x) * progress
        let y = this.ball1.y + (this.ball2.y - this.ball1.y) * progress

        return {x, y}
    }

    /**
     * @param {string} type
     * @param {Gooball} ball1
     * @param {Gooball} ball2
     */
    constructor(type, ball1, ball2) {
        this.type = type
        let options = window.game.GooballManager.types[this.type].strand
        this.constraint = Matter.Constraint.create({
            length: (options.length + Math.hypot(ball2.x - ball1.x, ball2.y - ball1.y) * 2) / 3,
            damping: 0.008,
            stiffness: 0.1,
            bodyA: ball1.body,
            bodyB: ball2.body
        })

       this.ball1 = ball1
       this.ball2 = ball2
    }
}

export class LevelButton {
    /**
     * level id
     * @type {string}
     */
    id = ""

    /** @type {number} */
    x = 0

    /** @type {number} */
    y = 0

    /**
     * @param {Level} level 
     * @param {boolean} zoom
     * @returns {{x: number, y: number}}
     */
    levelCoords(level, zoom = false) {
        return window.game.Utils.toLevelCanvasPos(this.x, this.y, level, 0, 0, zoom)
    }

    /**
     * @type {Level}
     * @readonly
     */
    get level() {
        return window.game.LevelManager.levels[this.id]
    }

    /**
     * @type {string}
     * @readonly
     */
    get title() {
        return this.level.title
    }

    /**
     * @param {Level} level
     * @param {CanvasRenderingContext2D} ctx
     */
    render(level, ctx) {
        let image = window.game.ResourceManager.getResource(this.level.profileData.completed ? "IMAGE_LEVELBUTTON_COMPLETE" : "IMAGE_LEVELBUTTON").image
        let {x, y} = this.levelCoords(level)
        ctx.drawImage(image, x - 30, y - 30, 60, 60)

        if (!this.hovered(level)) return

        let text = window.game.TextManager.parseText(this.title)
        ctx.font = '36px "FONT_COOKIES"'
        ctx.strokeStyle = 'black'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 4
        ctx.strokeText(text, x, y - 56)
        ctx.lineWidth = 6
        ctx.strokeText(text, x, y - 56)
        ctx.fillStyle = 'white'
        ctx.fillText(text, x, y - 56)
    }

    hovered(level) {
        let {x, y} = this.levelCoords(level, true)
        return window.game.InputTracker.withinCircle(x, y, 30)
    }

    clicked(level) {
        return this.hovered(level) && window.game.InputTracker.leftOnce
    }
}