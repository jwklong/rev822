const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")

/** @class */
export class PipeManager {
    /** @type {Object<string, Gooball>} */
    types = {}

    async addType(src) {
        const id = path.basename(src)

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: "attributes",
            attributeNamePrefix: "",
            allowBooleanAttributes: true,
            parseAttributeValue: true,
            alwaysCreateTextNode: true,
            textNodeName: "value",
            isArray: (_, jPath) => /^pipe\.resources\.[^\.]+$/.test(jPath)
        })

        const xml = parser.parse((await fs.readFile(path.join(src, "pipe.xml"))).toString())

        this.types[id] = new Pipe(xml.pipe, id)
    }
}

/** @class */
export class Pipe {
    /**
     * images to be used when rendering pipe
     * @type {Object}
     * @property {string} pipe - the pipe itself
     * @property {string} cap - closed cap
     * @property {string} capopen - open cap (when sucking gooballs)
     */
    states = {
        pipe: "",
        cap: "",
        capopen: ""
    }

    /** @type {number} */
    ballsSucked = 0

    /** @type {number} */
    x = 0

    /** @type {number} */
    y = 0

    /** @type {number} */
    direction = 0

    /** @type {number} */
    radius = 80

    /**
     * Length of pipe, defaults to cover the level
     * @type {number}
     */
    length = 65535

    /** @type {string} */
    ref

    /**
     * @param {Object} xml 
     * @param {string} type 
     * @param {boolean} clone
     */
    constructor(xml, id, clone = false) {
        this.id = id
        this.xml = xml

        //parse dem resources
        if (!clone) {
            for (const [key, value] of Object.entries(xml.resources)) {
                for (const resource of value) {
                    window.game.ResourceManager.addResource(key, resource.attributes.id, path.join(__dirname, "../data", resource.attributes.src))
                }
            }
        }

        this.states = {
            pipe: xml.state.attributes.pipe,
            cap: xml.state.attributes.cap,
            capopen: xml.state.attributes.capopen
        }
    }

    /** @returns {Pipe} */
    clone() {
        return new Pipe(this.xml, this.type, true)
    }

    /**
     * balls in range of pipe
     * @param {Gooball[]} balls
     * @param {number} padding - decreases range
     * @returns {Gooball[]}
     */
    ballsInRange(balls, padding = 0) {
        return balls.filter(ball => window.game.Utils.withinCircle(ball.x, ball.y, this.x, this.y, this.radius - padding))
    }

    /**
     * @param {Level} level
     * @returns {boolean}
     */
    isActive(level) {
        return this.ballsInRange(level.balls).filter(ball => level.getStrandsOfBall(ball).length > 0).length > 0
    }
}