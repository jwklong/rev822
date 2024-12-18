/** @class */
export default class Layer {
    /** @type {LayerGroup} */
    static Group

    /** @type {Effect} */
    static Effect

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

        return layer
    }

    /** @param {number} dt */
    tick(dt) {
        this.rotation += this.rotspeed * dt
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number?} ox
     * @param {number?} oy
     * @param {number?} osx
     * @param {number?} osy
     * @returns {CanvasRenderingContext2D}
     */
    render(ctx, ox = 0, oy = 0, osx = 1, osy = 1) {
        const image = window.game.ResourceManager.getResource(this.img).image
        const w = image.width * this.size.x * osx
        const h = image.height * this.size.y * osy
        const x = this.x - ox + 1280 / 2 / osx - w / 2
        const y = -(this.y - oy) + 720 / 2 / osy - h / 2
        const rotation = this.rotation * Math.PI / 180
        ctx.translate(x + w / 2, y + h / 2)

        ctx.rotate(rotation)
        ctx.translate(-(x + w / 2), -(y + h / 2))
        ctx.drawImage(image, x, y, w, h)
        ctx.translate(x + w / 2, y + h / 2)
        ctx.rotate(-rotation)
        ctx.translate(-(x + w / 2), -(y + h / 2))

        return ctx
    }
}

class LayerGroup {
    /** @type {Array<Layer | Effect | LayerGroup>} */
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
     * @param {Layer | Effect | LayerGroup} layer
     */
    push(layer) { this.children.push(layer) }

    /**
     * @param {function(Layer | Effect | LayerGroup): boolean}
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
     * @returns {CanvasRenderingContext2D}
     */
    render(ctx, ox = 0, oy = 0, osx = 1, osy = 1) {
        for (let child of this.children.sort((a, b) => a.z - b.z)) {
            ctx = child.render(ctx,
                ox + this.x, oy + this.y,
                osx, osy,
            )
        }
        return ctx
    }
}

class Effect extends Layer {
    /** @type {number} */
    startX

    /** @type {number} */
    startY

    /** @param {Object} xml */
    static fromXML(xml) {
        let effect = super.fromXML(xml)
        effect.startX = effect.x
        effect.startY = effect.y
        return effect
    }
}

Layer.Group = LayerGroup
Layer.Effect = Effect