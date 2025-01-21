/** @class */
export default class Layer {
    /** @type {LayerGroup} */
    static Group

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
    z = 0

    /** @type {number} */
    rotation = 0

    /** @type {number} */
    rotspeed = 0

    /** @type {number} */
    transparency = 0

    /** @type {number} */
    timeSpent = 0

    /** @type {LayerGroup?} */
    parent

    /** @param {Object} xml */
    static fromXML(xml) {
        let layer = new Layer

        layer.img = xml.img
        layer.ref = String(xml.ref || "")
        layer.x = window.game.Utils.parseAttribute(xml.x)
        layer.y = window.game.Utils.parseAttribute(xml.y)
        if (xml.size) {
            if (typeof xml.size === "string") {
                layer.size = {x: Number(xml.size.split(",")[0]), y: Number(xml.size.split(",")[1])}
            } else {
                layer.size = {x: xml.size, y: xml.size}
            }
        }
        layer.z = window.game.Utils.parseAttribute(xml.z, 0)
        layer.rotation = window.game.Utils.parseAttribute(xml.rotation, 0)
        layer.rotspeed = window.game.Utils.parseAttribute(xml.rotspeed, 0)
        layer.transparency = window.game.Utils.parseAttribute(xml.transparency, 0)

        return layer
    }

    /** @param {number} dt */
    tick(dt) {
        this.rotation += this.rotspeed * dt
        this.timeSpent += dt
        this.effect(dt)
    }

    /**
     * Runs every tick to update values manually.
     * Meant to be overriden when creating layer.
     * @param {number} dt
     */
    effect(dt) {}

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number?} ox
     * @param {number?} oy
     * @param {number?} osx
     * @param {number?} osy
     * @param {number?} zoom
     * @returns {CanvasRenderingContext2D}
     */
    render(ctx, ox = 0, oy = 0, osx = 1, osy = 1, zoom = 1) {
        const image = window.game.ResourceManager.getResource(this.img).image
        const w = image.width * this.size.x * osx
        const h = image.height * this.size.y * osy
        const {x, y} = window.game.Utils.toCanvasPos(this.x - ox, this.y - oy, w, h, zoom)
        const rotation = this.rotation * Math.PI / 180

        const oldAlpha = ctx.globalAlpha
        ctx.globalAlpha = ctx.globalAlpha * (1 - this.transparency)
        
        ctx.translate(x + w / 2, y + h / 2)
        ctx.scale(Math.sign(osx * this.size.x), Math.sign(osx * this.size.y))
        ctx.rotate(rotation)
        ctx.translate(-(x + w / 2), -(y + h / 2))
        ctx.drawImage(image, x, y, w, h)
        ctx.translate(x + w / 2, y + h / 2)
        ctx.rotate(-rotation)
        ctx.scale(Math.sign(osx * this.size.x), Math.sign(osx * this.size.y))
        ctx.translate(-(x + w / 2), -(y + h / 2))

        ctx.globalAlpha = oldAlpha

        return ctx
    }

    /**
     * Removes this layer.
     */
    remove() {
        this.parent.children.splice(this.parent.children.indexOf(this), 1)
    }
}

/** @class */
class LayerGroup {
    /** @type {LayerGroup?} */
    parent

    /** @type {Array<(Layer | LayerGroup)>} */
    children = []

    /** @type {number} */
    x = 0

    /** @type {number} */
    y = 0

    /** @type {number} */
    z = 0

    /**
     * @type {Object}
     * @property {number} x
     * @property {number} y
     */
    size = {
        x: 1,
        y: 1
    }

    /**
     * @param {boolean} propsOnly
     * @returns {LayerGroup}
     * @private
     */
    _copy(propsOnly = false) {
        let newGroup = new LayerGroup

        newGroup.x = this.x
        newGroup.y = this.y
        newGroup.z = this.z
        
        if (!propsOnly) newGroup.children = this.children

        return newGroup
    }

    /**
     * @param {(Layer | LayerGroup)} layer
     */
    push(layer) {
        layer.parent = this
        this.children.push(layer)
    }

    /**
     * @typedef {function} LayerGroupFilterInput
     * @param {Layer | LayerGroup} v
     */

    /**
     * @param {LayerGroupFilterInput} func
     * @returns {LayerGroup}
     */
    filter(func) {
        let newGroup = this._copy(true)
        newGroup.children = this.children.filter(func)
        return newGroup
    }

    /** @param {number} dt */
    tick(dt) {
        this.children.forEach(child => child.tick(dt))
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number?} ox
     * @param {number?} oy
     * @param {number?} osx
     * @param {number?} osy
     * @param {number?} zoom
     * @returns {CanvasRenderingContext2D}
     */
    render(ctx, ox = 0, oy = 0, osx = 1, osy = 1, zoom = 1) {
        for (let child of this.children.sort((a, b) => a.z - b.z)) {
            ctx = child.render(ctx,
                ox + this.x, oy + this.y,
                osx * this.size.x, osy * this.size.y, zoom
            )
        }
        return ctx
    }
}

Layer.Group = LayerGroup