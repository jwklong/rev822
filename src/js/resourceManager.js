const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")

export default class ResourceManager {
    /** @type {{[key: string]: GenericResource}} */
    resources = {}

    /**
     * @param {string} type 
     * @param {string} id 
     * @param {string} src 
     */
    addResource(type, id, src) {
        switch (type) {
            case "image":
                this.resources[id] = new ImageResource(id, src)
                break
            case "font":
                this.resources[id] = new FontResource(id, src)
                break
            default:
                this.resources[id] = new GenericResource(id, src)
        }
    }

    /**
     * Extracts resource information from a file (specifically resources.xml)
     * @param {string} src Path to file
     */
    async addXMLFile(src) {
        const output = (await fs.readFile(src)).toString()

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: "attributes",
            attributeNamePrefix: "",
            allowBooleanAttributes: true,
            parseAttributeValue: true,
            alwaysCreateTextNode: true,
            textNodeName: "value",
            isArray: (_, jPath) => /^resources\.[^\.]+$/.test(jPath)
        })
        const xml = parser.parse(output)
        
        for (const [key, value] of Object.entries(xml.resources)) {
            for (const resource of value) {
                this.addResource(key, resource.attributes.id, path.join(__dirname, "../data", resource.attributes.src))
            }
        }
    }

    /** @returns {number} */
    get totalResources() {
        return Object.keys(this.resources).length
    }

    /** @returns {number} */
    get loadedResources() {
        return Object.values(this.resources).filter(resource => resource.loaded).length
    }

    /**
     * @param {string} id
     * @returns {GenericResource?}
     */
    getResource(id) {
        return this.resources[id]
    }
}

class GenericResource {
    /** @type {boolean} */
    loaded = false

    /** @type {string} */
    type = "generic"

    /**
     * @param {string} id
     * @param {string} src
     */
    constructor(id, src) {
        this.id = id
        this.src = src
    }

    load() {
        return new Promise((resolve, reject) => {
            if (this.loaded) reject("Resource is already loaded")

            this.loaded = true
            resolve()
        })
    }
}

class ImageResource extends GenericResource {
    type = "image"

    load() {
        return new Promise((resolve, reject) => {
            if (this.loaded) reject("Resource is already loaded")
            
            const img = new Image()
            img.src = this.src
            img.onload = () => {
                img.remove()
                this.loaded = true
                resolve()
            }
            img.onerror = () => {
                img.remove()
                reject("Failed to load resource")
            }
        })
    }
}

class FontResource extends GenericResource {
    type = "font"

    load() {
        return new Promise((resolve, reject) => {
            if (this.loaded) reject("Resource is already loaded")
            
            const font = new FontFace(this.id, `url(${this.src.replaceAll("\\", "/")})`) //note, this hates backslashes,,, never improving this code ever

            font.load().then(() => {
                document.fonts.add(font)
                this.loaded = true
                resolve()
            }).catch(() => {
                reject("Failed to load resource")
            })
        })
    }
}