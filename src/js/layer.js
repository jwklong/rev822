/** @class */
export default class Layer {
    /** @type {string} */
    img

    /** @type {string?} */
    ref

    /** @type {number} */
    x

    /** @type {number} */
    y

    /**
     * @type {Object}
     * @property {number} x
     * @property {number} y
     */
    size = {
        x: 1,
        y: 1
    }

    /** @type {number} */
    z

    /** @type {number} */
    rotation

    /** @type {number} */
    rotspeed

    /** @param {Object} xml */
    constructor(xml) {
        this.img = xml.attributes.img
        this.ref = String(xml.attributes.ref) || null
        this.x = xml.attributes.x
        this.y = xml.attributes.y
        if (xml.attributes.size) {
            if (typeof xml.attributes.size === "string") {
                this.size = {x: Number(xml.attributes.size.split(",")[0]), y: Number(xml.attributes.size.split(",")[1])}
            } else {
                this.size = {x: xml.attributes.size, y: xml.attributes.size}
            }
        }
        this.z = xml.attributes.z || 0
        this.rotation = xml.attributes.rotation || 0
        this.rotspeed = xml.attributes.rotspeed || 0
    }

    /** @param {number} dt */
    tick(dt) {
        this.rotation += this.rotspeed * dt
    }
}