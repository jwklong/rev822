const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")

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
            isArray: (_, jPath) => /^level.resources\.[^\.]+$/.test(jPath)
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
        this.#currentLevel = Object.assign(Level.prototype, this.levels[id])
    }
}

class Level {
    /** @type {Layer[]} */
    layers = []

    /**
     * @param {Object} xml
     * @param {string} id 
     */
    constructor(xml, id) {
        this.id = id
        this.title = xml.head.title.value
        this.desc = xml.head.desc.value

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
                    this.layers.push(new Layer(value))
                    break
            }
        }
    }
}

class Layer {
    /** @param {Object} xml */
    constructor(xml) {
        this.img = xml.attributes.img
        this.x = xml.attributes.x
        this.y = xml.attributes.y
    }
}