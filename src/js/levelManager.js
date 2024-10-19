const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")
const Matter = require("matter-js")

// TODO: support for level.js (custom code for levels)

/** @class */
export default class LevelManager {
    /** @type {Object<string, Level>} */
    levels = {}

    /** @type {string?} */
    #currentLevel = null

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
            isArray: (_, jPath) => /^level\.(resources|scene)\.[^\.]+$/.test(jPath)
        })

        const xml = parser.parse((await fs.readFile(path.join(src, "level.xml"))).toString())

        this.levels[id] = new Level(xml.level, id)
    }

    /**
     * To set this value, you MUST use a string of the level ID
     * @type {Level?}
     * @returns {Level?}
     * @example
     * LevelManager.currentLevel = "Test" // sets with a string
     * LevelManager.currentLevel // returns a Level
     */
    get currentLevel() {
        return this.#currentLevel
    }
    set currentLevel(id) {
        this.#currentLevel = this.levels[id].clone()
        this.#currentLevel.engine = Matter.Engine.create()
        this.#currentLevel.engine.gravity.y = -1
        for (let body of this.#currentLevel.bodies) {
            let currentComposite = Matter.Composite.add(this.#currentLevel.engine.world, body.body)
            body.body = currentComposite.bodies[currentComposite.bodies.length-1]
        }
        for (let ball of this.#currentLevel.balls) {
            let currentComposite = Matter.Composite.add(this.#currentLevel.engine.world, ball.body)
            ball.body = currentComposite.bodies[currentComposite.bodies.length-1]
        }
        for (let strand of this.#currentLevel.strands) {
            let currentComposite = Matter.Composite.add(this.#currentLevel.engine.world, strand.constraint)
            strand.constraint = currentComposite.constraints[currentComposite.constraints.length-1]
            strand.ball1 = this.#currentLevel.getGooballFromRef(strand.ball1.ref)
            strand.ball2 = this.#currentLevel.getGooballFromRef(strand.ball2.ref)
        }
    }
}

class Level {
    /** @type {Layer[]} */
    layers = []

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

    /** @type {string} */
    id

    /** @type {Object} */
    xml

    /** @type {string} */
    title

    /** @type {string} */
    desc

    /** @type {boolean} */
    debug

    /** @type {number} */
    width

    /** @type {number} */
    height

    /**
     * conditions to win level
     * @type {Object?}
     * @property {string} type - "balls" for amount of balls, more soon
     * @property {number} target
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
        }
        
        return 0
    }

    /**
     * @param {Object} xml
     * @param {string} id 
     * @param {boolean} [clone=false]
     */
    constructor(xml, id, clone = false) {
        this.id = id
        this.xml = xml
        this.title = xml.head.title.value
        this.desc = xml.head.desc.value
        this.debug = xml.attributes ? xml.attributes.debug : false

        this.width = xml.head.camera.attributes.width
        this.height = xml.head.camera.attributes.height

        //parse dem resources
        if (!clone) {
            for (const [key, value] of Object.entries(xml.resources)) {
                for (const resource of value) {
                    window.game.ResourceManager.addResource(key, resource.attributes.id, path.join(__dirname, "../data", resource.attributes.src))
                }
            }
        }

        //goal
        if (xml.head.goal) {
            this.goal = {
                type: xml.head.goal.attributes.type,
                target: xml.head.goal.attributes.target
            }
        }

        //parse dem everythinjg else
        for (const [key, value] of Object.entries(xml.scene)) {
            switch (key) {
                case "layer":
                    for (let v of value) {
                        this.layers.push(new window.game.Layer(v))
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
                        ball.x = v.attributes.x
                        ball.y = v.attributes.y
                        ball.ref = String(v.attributes.ref)
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
                        pipe.x = v.attributes.x
                        pipe.y = v.attributes.y
                        pipe.direction = v.attributes.direction
                        pipe.radius = v.attributes.radius || 80
                        pipe.ref = String(v.attributes.ref)
                        this.pipes.push(pipe)
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

                if (this.getStrandsOfBall(a).length == 0) a.body.collisionFilter.mask = 0b11
                if (this.getStrandsOfBall(b).length == 0) b.body.collisionFilter.mask = 0b11

                this.getBallsOnStrand(strand).forEach(v => v.getOffStrand())

                this.strands.splice(i,1)
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
        if (this.camera.props.fixed == false && window.game.InputTracker.inWindow) {
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

        for (let layer of this.layers) {
            layer.tick(dt)
        }

        if (window.game.InputTracker.ball != undefined) {
            let nextx = window.game.InputTracker.x + this.camera.props.x - 1280 / 2 / this.camera.props.zoom
            let nexty = -window.game.InputTracker.y + this.camera.props.y + 720 / 2 / this.camera.props.zoom

            window.game.InputTracker.ball.vx = nextx - window.game.InputTracker.ball.x
            window.game.InputTracker.ball.vy = nexty - window.game.InputTracker.ball.y

            window.game.InputTracker.ball.x = nextx
            window.game.InputTracker.ball.y = nexty
        }

        for (let ball of this.balls) {
            if (ball.antigrav) ball.body.gravityScale = this.getStrandsOfBall(ball).length >= 1 ? -1 : 1

            for (let body of this.bodies) {
                if (Matter.Query.collides(body.body, [ball.body]).length > 0) {
                    if (body.sticky && this.getStrandsOfBall(ball).length > 0) Matter.Body.setStatic(ball.body, true)
                    if (body.detaches && this.getStrandsOfBall(ball).length > 0) this.deleteStrands(ball)
                }
            }

            for (let strand of this.strands) {
                if (
                    window.game.InputTracker.cursorIntersectsLine(
                        strand.ball1.x, strand.ball1.y,
                        strand.ball2.x, strand.ball2.y,
                        ball.shape.radius / 1.5,
                        ball.x, ball.y
                    ) &&
                    !ball.strandOn &&
                    !window.game.GooballManager.types[strand.type].noclimb &&
                    window.game.InputTracker.ball != ball &&
                    this.getStrandsOfBall(ball).length == 0 &&
                    this.pipes.filter(v => v.isActive(this)).reduce((p, v) => {
                        return p && v.ballsInRange([ball]).length == 0
                    }, true)
                ) {
                    let progress = window.game.InputTracker.cursorIntersectsLineProgress(
                        strand.ball1.x, strand.ball1.y,
                        strand.ball2.x, strand.ball2.y,
                        ball.x, ball.y
                    )

                    strand.ball1.vx = ball.vx * progress / 2
                    strand.ball1.vy = ball.vy * progress / 2
                    strand.ball2.vx = ball.vx * (1 - progress) / 2
                    strand.ball2.vy = ball.vy * (1 - progress) / 2

                    ball.putOnStrand(strand, progress)
                }
            }

            if (ball.strandOn) {
                ball.strandOn.progress += (
                    ball.climbspeed *
                    dt /
                    ball.strandOn.strand.length *
                    (ball.strandOn.reverse ? -1 : 1) *
                    (this.pipes.find(pipe => pipe.isActive(this)) ? 3 : 1)
                )

                if (ball.strandOn.progress <= 0 || ball.strandOn.progress >= 1) {
                    let choiceball = ball.strandOn.progress <= 0 ? ball.strandOn.strand.ball1 : ball.strandOn.strand.ball2
                    let choicestrands = this.getStrandsOfBall(choiceball)

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

                if (pipe.ballsInRange([ball], pipe.radius - 16).length > 0) {
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
                    directionToPipe.x * 0.1,
                    directionToPipe.y * 0.1
                ))
            }
        }

        Matter.Engine.update(this.engine, dt * 1000)
    }
}

/** @class */
class Camera {
    /**
     * @type {Object}
     * @property {number} x
     * @property {number} y
     * @property {number} zoom
     * @property {boolean} fixed
     */
    props = {
        x: 0,
        y: 0,
        zoom: 1,
        fixed: false
    }

    /**
     * get distance from point to camera
     * @param {number} x
     * @param {number} y
     * @return {number}
     */
    distanceFromCamera(x, y) {
        return Math.hypot(x - this.props.x, y - this.props.y)
    }

    // TODO: animate camera
}

class GenericBody {
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

    /** @type {number} */
    get x() { return this.body.position.x }
    set x(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(val, this.y)) }

    /** @type {number} */
    get y() { return this.body.position.y }
    set y(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(this.x, val)) }

    /** @type {number} */
    get rotation() { return this.body.angle * 180 / Math.PI}
    set rotation(val) { Matter.Body.rotate(this.body, val / 180 * Math.PI) }

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

    /** @param {Object} attributes */
    constructor(attributes, body) {
        this.body = body || Matter.Body.Create()
        this.body.collisionFilter.category = 0b10
        this.body.collisionFilter.mask = 0b11

        this.ref = String(attributes.ref) || null

        this.x = attributes.x
        this.y = attributes.y

        this.rotation = attributes.rotation || 0

        this.static = attributes.static || false

        this.material = attributes.material || "default"

        this.sticky = attributes.sticky
        this.detaches = attributes.detaches
    }
}

/** @extends GenericBody */
class RectBody extends GenericBody {
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
        super(attributes, Matter.Bodies.rectangle(0, 0, attributes.width, attributes.height))

        this.width = attributes.width
        this.height = attributes.height
    }
}

/** @extends GenericBody */
class CircleBody extends GenericBody {
    type = "circle"

    /**
     * @type {number}
     * @readonly
     */
    radius

    constructor(attributes) {
        super(attributes, Matter.Bodies.circle(0, 0, attributes.radius))

        this.radius = attributes.radius
    }
}

/** @class */
class Strand {
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
            dampening: 0.005,
            stiffness: 0.04,
            bodyA: ball1.body,
            bodyB: ball2.body
        })

       this.ball1 = ball1
       this.ball2 = ball2
    }
}