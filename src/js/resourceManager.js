const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")

export default class ResourceManager {
    /** @type {{[key: string]: GenericResource}} */
    resources = {}

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

    async addXMLFile(src) {
        const output = (await fs.readFile(src)).toString()

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: "attributes",
            attributeNamePrefix: "",
            allowBooleanAttributes: true,
            parseAttributeValue: true,
            alwaysCreateTextNode: true,
            textNodeName: "value"
        })
        const xml = parser.parse(output)
        console.log(xml)
        
        for (const [key, value] of Object.entries(xml.resources)) {
            console.log(key, value)
            this.addResource(key, value.attributes.id, path.join(__dirname, "../data", value.attributes.src))
        }
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