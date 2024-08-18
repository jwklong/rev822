const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")

export default class MaterialManager {
    /** @type {Materials[]} */
    materials = {}

    /** @param {string} src */
    async addXMLFile(src) {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: "attributes",
            attributeNamePrefix: "",
            allowBooleanAttributes: true,
            parseAttributeValue: true,
            alwaysCreateTextNode: true,
            textNodeName: "value",
            isArray: (_, jPath) => /^materials\.[^\.]+$/.test(jPath)
        })

        const xml = parser.parse((await fs.readFile(src)).toString())

        for (let v of xml.materials.material) {
            let material = new Material
            material.name = v.attributes.name
            material.friction = v.attributes.friction
            material.bounciness = v.attributes.bounciness
            this.materials[material.name] = material
        }
    }

    /**
     * @param {string} name
     * @returns {Material} if cannot find material, will return the default material
     */
    getMaterial(name) {
        return this.materials[name] || this.materials["default"]
    }
}

class Material {
    /** @type {string} */
    name

    /** @type {number} */
    friction

    /** @type {number} */
    bounciness
}