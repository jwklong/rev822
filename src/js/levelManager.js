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

        new Level(xml.level)
    }

    /** @returns {Level?} */
    get currentLevel() {
        return this.levels[this.#currentLevel]
    }
}

class Level {
    /** @param {} xml  */
    constructor(xml) {
        //parse dem resources
        for (const [key, value] of Object.entries(xml.resources)) {
            for (const resource of value) {
                this.addResource(key, resource.attributes.id, path.join(__dirname, "../data", resource.attributes.src))
            }
        }
    }
}