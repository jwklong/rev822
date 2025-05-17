const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")

/** @class */
export class ResourceManager {
    /** @type {Object<string, GenericResource>} */
    resources = {}

    /**
     * @param {string} type 
     * @param {string} id 
     * @param {string} src
     * @returns {AnyResource}
     */
    addResource(type, id, src) {
        switch (type) {
            case "image":
                this.resources[id] = new ImageResource(id, src)
                break
            case "audio":
                this.resources[id] = new AudioResource(id, src)
                break
            case "font":
                this.resources[id] = new FontResource(id, src)
                break
            default:
                this.resources[id] = new GenericResource(id, src)
        }
        return this.resources[id]
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
     * @returns {AnyResource?}
     */
    getResource(id) {
        return this.resources[id]
    }
}

/**
 * @typedef {GenericResource | ImageResource | AudioResource | FontResource} AnyResource - type for a resource that could be any form of media
 */

export class GenericResource {
    /** @type {boolean} */
    loaded = false

    /**
     * @type {string}
     * @readonly
     */
    type = "generic"

    /** @type {string} */
    id

    /** @type {string} */
    src

    /**
     * @param {string} id
     * @param {string} src
     */
    constructor(id, src) {
        this.id = id
        this.src = src
    }

    /**
     * Loads the resource
     */
    load() {
        return new Promise((resolve, reject) => {
            if (this.loaded) reject("Resource is already loaded")

            this.loaded = true
            resolve()
        })
    }
}

/** @extends GenericResource */
export class ImageResource extends GenericResource {
    type = "image"

    /**
     * @type {HTMLImageElement}
     */
    image

    constructor(id, src) {
        super(id, src)
        this.image = new Image()
        this.image.src = this.src
    }

    load() {
        let the = this
        return new Promise((resolve, reject) => {
            if (the.loaded) reject("Resource is already loaded")
            
            const img = new Image()
            img.src = the.src
            img.onload = () => {
                the.image = img
                the.loaded = true
                resolve()
            }
            img.onerror = e => {
                img.remove()
                reject("Failed to load image resource", e)
            }
        })
    }
}

/** @extends GenericResource */
export class AudioResource extends GenericResource {
    type = "audio"

    /**
     * @type {HTMLAudioElement}
     */
    audio

    constructor(id, src) {
        super(id, src)
        this.audio = new Audio(this.src)
    }

    load() {
        let the = this
        return new Promise((resolve, reject) => {
            if (the.loaded) reject("Resource is already loaded")
            
            const aud = new Audio(this.src)
            aud.oncanplaythrough = () => {
                the.audio = aud
                the.loaded = true
                resolve()
            }
            aud.onerror = e => {
                aud.remove()
                reject("Failed to load audio resource", e)
            }
        })
    }
}

/** @extends GenericResource */
export class FontResource extends GenericResource {
    type = "font"

    load() {
        return new Promise((resolve, reject) => {
            if (this.loaded) reject("Resource is already loaded")
            
            const font = new FontFace(this.id, `url("${this.src.replaceAll("\\", "/")}")`) //note, this hates backslashes,,, never improving this code ever

            font.load().then(() => {
                document.fonts.add(font)
                this.loaded = true
                resolve()
            }).catch(e => {
                reject("Failed to load font resource", e)
            })
        })
    }
}