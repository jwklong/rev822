const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")

/** @class */
export default class PipeManager {
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
}