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
            isArray: (_, jPath) => /^level.resources\.[^\.]+$/.test(jPath) || /^level.scene\.[^\.]+$/.test(jPath)
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

    /**
     * @param {Object} xml
     * @param {string} id 
     */
    constructor(xml, id) {
        this.id = id
        this.xml = xml
        this.title = xml.head.title.value
        this.desc = xml.head.desc.value
        this.debug = xml.attributes.debug || false

        //parse dem resources
        for (const [key, value] of Object.entries(xml.resources)) {
            for (const resource of value) {
                this.addResource(key, resource.attributes.id, path.join(__dirname, "../data", resource.attributes.src))
            }
        }

        //parse dem everythinjg else
        for (const [key, value] of Object.entries(xml.scene)) {
            switch (key) {
                case "layer":
                    for (let v of value) {
                        this.layers.push(new Layer(v))
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
        return new Level(this.xml, this.id)
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

    tick(dt) {
        if (this.camera.props.fixed == false && window.game.MouseTracker.inWindow) {
            if (100 - window.game.MouseTracker.x > 0) {
                this.camera.props.x -= (100 - window.game.MouseTracker.x) * dt * 12 / this.camera.props.zoom
            } else if (-1180 + window.game.MouseTracker.x > 0) {
                this.camera.props.x += (-1180 + window.game.MouseTracker.x) * dt * 12 / this.camera.props.zoom
            }

            if (100 - window.game.MouseTracker.y > 0) {
                this.camera.props.y -= (100 - window.game.MouseTracker.y) * dt * 12 / this.camera.props.zoom
            } else if (-620 + window.game.MouseTracker.y > 0) {
                this.camera.props.y += (-620 + window.game.MouseTracker.y) * dt * 12 / this.camera.props.zoom
            }
        }

        for (const layer of this.layers) {
            layer.tick(dt)
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

class Layer {
    /** @type {string} */
    img

    /** @type {string?} */
    ref

    /** @type {number} */
    x

    /** @type {number} */
    y

    /**
     * @type {Object}
     * @property {number} x
     * @property {number} y
     */
    size = {
        x: 1,
        y: 1
    }

    /** @type {number} */
    z

    /** @type {number} */
    rotation

    /** @type {number} */
    rotspeed

    /** @param {Object} xml */
    constructor(xml) {
        this.img = xml.attributes.img
        this.ref = String(xml.attributes.ref) || null
        this.x = xml.attributes.x
        this.y = xml.attributes.y
        if (xml.attributes.size) {
            if (typeof xml.attributes.size === "string") {
                this.size = {x: Number(xml.attributes.size.split(",")[0]), y: Number(xml.attributes.size.split(",")[1])}
            } else {
                this.size = {x: xml.attributes.size, y: xml.attributes.size}
            }
        }
        this.z = xml.attributes.z || 0
        this.rotation = xml.attributes.rotation || 0
        this.rotspeed = xml.attributes.rotspeed || 0
    }

    /** @param {number} dt */
    tick(dt) {
        this.rotation += this.rotspeed * dt
    }
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

    /** @type {number} */
    get x() { return this.body.position.x }
    set x(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(val, this.y)) }

    /** @type {number} */
    get y() { return this.body.position.y }
    set y(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(this.x, val)) }

    /** @type {number} */
    get rotation() { return this.body.angle * 180 / Math.PI}
    set rotation(val) { Matter.Body.rotate(this.body, val / 180 * Math.PI) }

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

        this.ref = String(attributes.ref) || null

        this.x = attributes.x
        this.y = attributes.y

        this.rotation = attributes.rotation || 0

        this.static = attributes.static || false

        this.material = attributes.material || "default"
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