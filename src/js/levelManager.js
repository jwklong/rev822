const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")
const Matter = require("matter-js")

const cloneObj = (x, loop1 = 0) => {
    if (loop1 > 10) {
        return
    }
    let clone = {}
    for (let attr of Object.keys(x)) {
        if (x.hasOwnProperty(attr)) {
            function processor(input, name, loop2 = 0) {
                if (loop2 > 50) {
                    return
                }
                if (input instanceof Array) {
                    let array = []
                    for (let value in input) {
                        array[value] = processor(input[value], loop2+1)
                    }
                    return array
                }
                if (input instanceof Object) {
                    return cloneObj(input, loop1+1)
                }
                return input
            }
            clone[attr] = processor(x[attr], attr, 0)
        }
    }
    clone = Object.assign(Object.create(Object.getPrototypeOf(x)), clone)
    return clone
}

// TODO: support for level.js (custom code for levels)

export default class LevelManager {
    /** @type {{[key: string]: Level}} */
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

    /** @returns {Level?} */
    get currentLevel() {
        return this.#currentLevel
    }

    /** @param {string} id */
    set currentLevel(id) {
        this.#currentLevel = this.levels[id]
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

    engine

    /** @type {GenericBody[]} */
    bodies = []

    /**
     * @param {Object} xml
     * @param {string} id 
     */
    constructor(xml, id) {
        this.id = id
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
                default:
                    console.warn(`unknown object '${key}' in level ${this.id}`)
            }
        }
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

class Camera {
    props = {
        x: 0,
        y: 0,
        zoom: 1,
        fixed: false
    }

    // TODO: animate camera
}

class Layer {
    /** @param {Object} xml */
    constructor(xml) {
        this.img = xml.attributes.img
        this.x = xml.attributes.x
        this.y = xml.attributes.y
        this.size = {x: 1, y: 1}
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

    tick(dt) {
        this.rotation += this.rotspeed * dt
    }
}

class GenericBody {
    /** @type {string} */
    type = "generic"

    /** @type {number} */
    get x() { return this.body.position.x }
    set x(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(val, this.y)) }

    /** @type {number} */
    get y() { return this.body.position.y }
    set y(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(this.x, val)) }

    /** @type {boolean} */
    get static() { return this.body.isStatic }
    set static(val) { Matter.Body.setStatic(this.body, val) }

    /** @param {Object} attributes */
    constructor(attributes, body) {
        this.body = body || Matter.Body.Create()

        this.x = attributes.x
        this.y = attributes.y

        this.startx = attributes.x
        this.starty = attributes.y

        this.static = attributes.static || false
    }
}

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