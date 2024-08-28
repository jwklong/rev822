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
            isArray: (_, jPath) => /^level.(resources|scene)\.[^\.]+$/.test(jPath)
        })

        const xml = parser.parse((await fs.readFile(path.join(src, "level.xml"))).toString())

        this.levels[id] = new Level(xml.level, id)
    }

    /**
     * To set this value, you MUST use a string of the level ID
     * @type {Level?}
     * @returns {Level?}
     * @example
     * game.LevelManager.currentLevel = "Test" // sets with a string
     * game.LevelManager.currentLevel // returns a Level
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
     */
    deleteStrand(a, b) {
        for (let i in this.strands) {
            let strand = this.strands[i]
            if ((strand.ball1 === a && strand.ball2 === b) || (strand.ball1 === b && strand.ball2 === a)) {
                strand.constraint.bodyA = undefined
                strand.constraint.bodyB = undefined
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
     * @param {Matter.Engine?} engine
     * @see {@link https://brm.io/matter-js/docs/classes/Engine.html|Matter.Engine}
     */
    createStrand(type, a, b, engine) {
        let strand = new Strand(type, a, b)
        if (engine) Matter.Composite.add(engine.world, strand.constraint)
        this.strands.push(strand)
    }

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
            Matter.Body.setVelocity(window.game.InputTracker.ball.body, Matter.Vector.create(
                nextx - window.game.InputTracker.ball.x,
                nexty - window.game.InputTracker.ball.y
            ))
            window.game.InputTracker.ball.x = nextx
            window.game.InputTracker.ball.y = nexty
        }

        for (let ball of this.balls) {
            if (ball.antigrav) ball.body.gravityScale = this.getStrandsOfBall(ball).length >= 1 ? -1 : 1

            for (let body of this.bodies) {
                if (Matter.Query.collides(body.body, [ball.body]).length > 0) {
                    if (body.sticky && this.getStrandsOfBall(ball).length > 0) ball.body.isStatic = true
                    if (body.detaches && this.getStrandsOfBall(ball).length > 0) this.deleteStrands(ball)
                }
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