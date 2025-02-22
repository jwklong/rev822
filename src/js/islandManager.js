const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")

export class IslandManager {
    /** @type {Object<string, Island>} */
    islands = {}

    /** @param {string} src */
    async addIsland(src) {
        const id = path.basename(src, ".xml")

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

        const xml = parser.parse((await fs.readFile(src)).toString())

        this.islands[id] = new Island(xml.island[0], id)
    }

    /** @returns {IslandLevel[]} */
    allLevels() {
        return Object.values(this.islands).flatMap(island => Object.values(island.levels))
    }

    /** @returns {IslandLevel?} */
    getLevel(id) {
        return this.allLevels().find(level => level.id == id)
    }

    levelUnlocked(id) {
        let level = this.getLevel(id)
        if (!level) return false

        for (let req of level.requires) {
            let level2 = this.getLevel(req)
            if (!level2 || !level2.completed) return false
        }

        return true
    }
}

export class Island {
    /** @type {string} */
    id = ""

    /** @type {Object<string, IslandLevel>} */
    levels = {}

    constructor(xml, id) {
        this.id = id

        for (const level of xml.level) {
            this.levels[level.attributes.id] = IslandLevel.fromAttributes(level.attributes)
        }
    }
}

export class IslandLevel {
    /** @type {string} */
    id = ""

    /** @type {string[]} */
    requires = []

    /**
     * @type {Level}
     * @readonly
     */
    get level() {
        return window.game.LevelManager.levels[this.id]
    }

    /**
     * @param {Object} attributes
     */
    static fromAttributes(attributes) {
        const level = new IslandLevel
        level.id = attributes.id
        if (attributes.requires) level.requires = attributes.requires.split(",")
        return level
    }

    get completed() {
        return this.level.profileData.completed
    }
}