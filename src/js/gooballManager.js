const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")
const Matter = require("matter-js")

/** @class */
export default class GooballManager {
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
            isArray: (_, jPath) => /^ball.(resources|body)\.[^\.]+$/.test(jPath)
        })

        const xml = parser.parse((await fs.readFile(path.join(src, "ball.xml"))).toString())

        this.types[id] = new Gooball(xml.ball, id)
    }
}

/** @class */
class Gooball {
    /** @type {Object} */
    xml

    /** @type {string} */
    type

    /** @type {string?} */
    ref

    /** @type {Layer[]} */
    layers = []

    /** @type {GooballEye[]} */
    eyes = []

    /**
     * @type {Matter.Body}
     * @see {@link https://brm.io/matter-js/docs/classes/Body.html|Matter.Body}
     */
    body

    /**
     * @type {Object}
     * @property {string} type
     * @property {number?} radius - Only when type = "circle"
     */
    shape = {}

    /**
     * @type {Object?}
     * @property {string} img
     * @property {number} length - Natural length of strand
     * @property {number} range - Distance of acceptable strand length from natural
     * @property {number} amount - Max strands creatable from placing gooball
     * @property {boolean} detachable - Can be detached from structure
     * @property {boolean} single - Allows 1 strand
     */
    strand

    /**
     * Stops gooballs from building on this gooball
     * @type {string}
     */
    nobuild = false

    /**
     * @type {boolean}
     * @readonly
     */
    antigrav = false

    /** @type {number} */
    get x() { return this.body.position.x }
    set x(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(val, this.y)) }

    /** @type {number} */
    get y() { return this.body.position.y }
    set y(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(this.x, val)) }

    /** @type {number} */
    get mass() { return this.body.mass }
    set mass(val) { Matter.Body.setMass(this.body, val) }

    /**
     * @param {Object} xml 
     * @param {string} type 
     * @param {boolean} [clone=false]
     */
    constructor(xml, type, clone = false) {
        this.xml = xml
        this.type = type

        //parse dem resources
        if (!clone) {
            for (const [key, value] of Object.entries(xml.resources)) {
                for (const resource of value) {
                    window.game.ResourceManager.addResource(key, resource.attributes.id, path.join(__dirname, "../data", resource.attributes.src))
                }
            }
        }

        if (xml.head.strand) {
            this.strand = {
                img: xml.head.strand.attributes.img,
                length: xml.head.strand.attributes.length,
                range: xml.head.strand.attributes.range || 0,
                amount: xml.head.strand.attributes.amount || 0,
                detachable: Boolean(xml.head.strand.attributes.detachable),
                single: xml.head.strand.attributes.single || xml.head.strand.attributes.amount == 1
            }
        }

        switch (xml.head.shape.attributes.type) {
            case "circle":
                this.shape.type = "circle"
                this.shape.radius = xml.head.shape.attributes.radius
                this.body = Matter.Bodies.circle(0, 0, xml.head.shape.attributes.radius)
                break
            default:
                throw "i dunno what gooball shape u want!!! :("
        }
        this.body.collisionFilter.category = 0b01
        this.body.collisionFilter.mask = 0b11

        if (xml.attributes) {
            if (xml.attributes.mass) this.mass = xml.attributes.mass || 30
            if (xml.attributes.antigrav) this.antigrav = true
            if (xml.attributes.nobuild) this.nobuild = true
        }

        for (const [key, value] of Object.entries(xml.body)) {
            switch (key) {
                case "layer":
                    for (let v of value) {
                        this.layers.push(new window.game.Layer(v))
                    }
                    break
                case "eye":
                    for (let v of value) {
                        this.eyes.push(new GooballEye(v))
                    }
                    break
                default:
                    console.warn(`unknown object '${key}' in gooball ${this.type}`)
            }
        }
    }

    clone() {
        return new Gooball(this.xml, this.type)
    }
}

/** @class */
class GooballEye {
    /** @type {number} */
    x

    /** @type {number} */
    y

    /** @type {number} */
    radius

    constructor(xml) {
        this.x = xml.attributes.x
        this.y = xml.attributes.y
        this.radius = xml.attributes.radius
    }
}