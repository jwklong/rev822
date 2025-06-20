/** @class */
export class Layer {
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
    depth = 1

    /** @type {number} */
    rotation = 0

    /**
     * When true rotation is not affected by the parent
     * @type {boolean}
     */
    staticrot = false

    /** @type {number} */
    rotspeed = 0

    /** @type {number} */
    transparency = 0

    /** @type {number} */
    timeSpent = 0

    /**
     * Mixes layer with color
     * @type {string}
     */
    color

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
        layer.depth = window.game.Utils.parseAttribute(xml.depth, 1)
        layer.rotation = window.game.Utils.parseAttribute(xml.rotation, 0)
        layer.staticrot = Boolean(xml.staticrot)
        layer.rotspeed = window.game.Utils.parseAttribute(xml.rotspeed, 0)
        layer.transparency = window.game.Utils.parseAttribute(xml.transparency, 0)
        layer.color = window.game.Utils.parseAttribute(xml.color)

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
     * @param {Canvas} canvas
     * @param {number?} ox
     * @param {number?} oy
     * @param {number?} osx
     * @param {number?} osy
     * @param {number?} rot
     */
    render(canvas, ox = 0, oy = 0, osx = 1, osy = 1, rot = 0) {
        let ctx = canvas.ctx
        const level = window.game.LevelManager.currentLevel
        let image = window.game.ResourceManager.getResource(this.img).image
        let w = image.width * this.size.x * osx
        let h = image.height * this.size.y * osy
        let {x, y} = canvas.toLevelCanvasPos(this.x - ox, this.y - oy, level, w, h, this.depth)
        let rotation = this.rotation * Math.PI / 180
        if (!this.staticrot) rotation += rot * Math.PI / 180
        let zoom = (canvas.screenshotMode ? 1 : level.camera.props.zoom)
        w *= (zoom - 1) * this.depth + 1
        h *= (zoom - 1) * this.depth + 1

        if (this.color) {
            let tempCanvas = document.createElement('canvas')
            tempCanvas.width = image.width
            tempCanvas.height = image.height 
            let tempCtx = tempCanvas.getContext('2d')
            tempCtx.drawImage(image, 0, 0)
            tempCtx.globalCompositeOperation = 'multiply'
            tempCtx.fillStyle = this.color
            tempCtx.fillRect(0, 0, image.width, image.height)
            tempCtx.globalCompositeOperation = 'destination-atop'
            tempCtx.drawImage(image, 0, 0)
            image = tempCanvas
        }

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
    }

    /**
     * Removes this layer.
     */
    remove() {
        this.parent.children.splice(this.parent.children.indexOf(this), 1)
    }
}

/** @class */
export class LayerGroup {
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

    /** @type {number} */
    rotation = 0

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
     * @param {function((Layer | LayerGroup), number, Array<(Layer | LayerGroup)>): boolean} func
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
     * @param {Canvas} canvas
     * @param {number?} ox
     * @param {number?} oy
     * @param {number?} osx
     * @param {number?} osy
     * @param {number?} rot
     */
    render(canvas, ox = 0, oy = 0, osx = 1, osy = 1, rot = 0) {
        for (let child of this.children.sort((a, b) => a.z - b.z)) {
            child.render(canvas,
                ox + this.x, oy + this.y,
                osx * this.size.x, osy * this.size.y,
                rot + this.rotation
            )
        }
    }
}