const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")
const Matter = require("matter-js")

/** @class */
export class GooballManager {
    /** @type {Object<string, Gooball>} */
    types = {}

    async addType(src) {
        const id = path.basename(src)

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: "attributes",
            attributeNamePrefix: "",
            allowBooleanAttributes: true,
            parseAttributeValue: true,
            alwaysCreateTextNode: true,
            textNodeName: "value",
            isArray: (_, jPath) => /^ball\.(resources|body)\.[^\.]+$/.test(jPath)
        })

        const xml = parser.parse((await fs.readFile(path.join(src, "ball.xml"))).toString())

        this.types[id] = new Gooball(xml.ball, id)
    }
}

/** @class */
export class Gooball {
    /** @type {Object} */
    xml

    /** @type {string} */
    type

    /** @type {string?} */
    ref

    /** @type {LayerGroup} */
    layers = new window.game.Classes.LayerGroup

    /** @type {GooballEye[]} */
    eyes = []

    /**
     * @type {Matter.Body}
     * @see {@link https://brm.io/matter-js/docs/classes/Body.html|Matter.Body}
     */
    body

    /**
     * @type {Object}
     * @property {string} type
     * @property {number?} radius - Only when type = "circle"
     */
    shape = {}

    /** @type {Material} */
    #material
    /** @type {string} */
    get material() { return this.#material.name }
    set material(val) {
        this.#material = window.game.MaterialManager.getMaterial(val)
        this.body.friction = this.#material.friction
        this.body.restitution = this.#material.bounciness
    }

    /**
     * @type {Object?}
     * @property {string} img
     * @property {number} length - Natural length of strand
     * @property {number} range - Distance of acceptable strand length from natural
     * @property {number} amount - Max strands creatable from placing gooball
     * @property {boolean} detachable - Can be detached from structure
     * @property {boolean} single - Allows 1 strand
     */
    strand

    /**
     * What strand it is on when climbing
     * @type {Object?}
     * @property {Strand} strand
     * @property {number} progress - A value from 0 - 1, meaning left to right
     * @property {boolean} reverse - Reversed direction
     */
    strandOn

    /**
     * @type {boolean}
     * @readonly
     */
    get isOnStrand() { return this.strandOn !== undefined }

    /**
     * what body it is stuck to
     * @type {GenericBody?}
     */
    stuckTo

    /**
     * Stops gooballs from building on this gooball
     * @type {boolean}
     */
    nobuild = false

    /**
     * Stops gooballs from climbing on this gooball + does not trigger pipes
     * @type {boolean}
     */
    noclimb = false

    /**
     * Prevents gooballs from sticking on sticky surfaces
     * @type {boolean}
     */
    nostick = false

    /**
     * Prevents dragging gooball
     */
    nodrag = false

    /**
     * Sticks to all surfaces
     * @type {boolean}
     */
    sticky = false

    /**
     * Sticks to surfaces at the start of the level & lets gooballs connect strands to it even when it is on its own
     * @type {boolean}
     */
    attachment = false

    /**
     * @type {boolean}
     * @readonly
     */
    antigrav = false

    /**
     * value from 0 - 1, example being 0.5 means half of the time it will be random and half of the time it will choose the quickest path
     */
    intelligence = 0.9

    /**
     * how fast the gooball climbs strands. measured in px/s
     * @type {number}
     */
    climbspeed = 45

    /** @type {number} */
    timeSpent = 0

    /** @type {boolean} */
    sleeping = false

    /** @type {number}*/
    lastSlept = Math.random()

    /**
     * Color of goo splats
     * @type {string}
     */
    splatColor = "#fff"

    /** @type {number} */
    get x() { return this.body.position.x }
    set x(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(val, this.y)) }

    /** @type {number} */
    get y() { return this.body.position.y }
    set y(val) { Matter.Body.setPosition(this.body, Matter.Vector.create(this.x, val)) }

    /**
     * x velocity
     * @type {number}
     */
    get vx() { return this.body.velocity.x }
    set vx(val) { Matter.Body.setVelocity(this.body, Matter.Vector.create(val, this.vy)) }

    /**
     * y velocity
     * @type {number}
     */
    get vy() { return this.body.velocity.y }
    set vy(val) { Matter.Body.setVelocity(this.body, Matter.Vector.create(this.vx, val)) }


    /**
     * total velocity
     * modify vx and vy instead of this
     * @type {number}
     * @readonly
     */
    get velocity() { return Math.hypot(this.vx, this.vy) }

    /** @type {number} */
    get mass() { return this.body.mass }
    set mass(val) { Matter.Body.setMass(this.body, val) }

    /** @type {number} */
    get rotation() { return -this.body.angle * 180 / Math.PI }
    set rotation(val) { Matter.Body.setAngle(this.body, -val * Math.PI / 180) }

    /**
     * @param {Object} xml 
     * @param {string} type 
     * @param {boolean} clone
     */
    constructor(xml, type, clone = false) {
        this.xml = xml
        this.type = type

        //parse dem resources
        if (!clone) {
            for (const [key, value] of Object.entries(xml.resources)) {
                for (const resource of value) {
                    window.game.ResourceManager.addResource(key, resource.attributes.id, path.join(__dirname, "../data", resource.attributes.src))
                }
            }
        }

        if (xml.head.strand) {
            this.strand = {
                img: xml.head.strand.attributes.img,
                length: xml.head.strand.attributes.length,
                range: xml.head.strand.attributes.range || 0,
                amount: xml.head.strand.attributes.amount || 0,
                detachable: Boolean(xml.head.strand.attributes.detachable),
                single: xml.head.strand.attributes.single || xml.head.strand.attributes.amount == 1
            }
        }

        switch (xml.head.shape.attributes.type) {
            case "circle":
                this.shape.type = "circle"
                this.shape.radius = xml.head.shape.attributes.radius
                this.body = Matter.Bodies.circle(0, 0, xml.head.shape.attributes.radius)
                break
            default:
                throw "i dunno what gooball shape u want!!! :("
        }
        this.body.collisionFilter.category = 0b01
        this.body.collisionFilter.mask = 0b11

        if (xml.head.attributes && xml.head.attributes.material) {
            this.material = xml.head.attributes.material
        } else {
            this.material = "rock"
        }

        if (xml.attributes) {
            this.mass = xml.attributes.mass ?? 30
            this.antigrav = xml.attributes.antigrav ?? false
            this.nobuild = xml.attributes.nobuild ?? false
            this.noclimb = xml.attributes.noclimb ?? false
            this.nostick = xml.attributes.nostick ?? false
            this.nodrag = xml.attributes.nodrag ?? false
            this.sticky = xml.attributes.sticky ?? false
            this.attachment = xml.attributes.attachment ?? false
            this.intelligence = xml.attributes.intelligence ?? 0.9
            this.climbspeed = xml.attributes.climbspeed ?? 45
            this.splatColor = xml.attributes.splatcolor ?? "#fff"
        }

        this.blinkCycle = [Math.random() * 1 + 1, Math.random() * 0.2 + 0.1]

        for (const [key, value] of Object.entries(xml.body)) {
            switch (key) {
                case "layer":
                    for (let v of value) {
                        this.layers.push(window.game.Classes.Layer.fromXML(v.attributes))
                    }
                    break
                case "eye":
                    for (let v of value) {
                        this.eyes.push(new GooballEye(v))
                    }
                    break
                default:
                    console.warn(`unknown object '${key}' in gooball ${this.type}`)
            }
        }
    }

    clone() {
        return new Gooball(this.xml, this.type, true)
    }

    /**
     * put ball on strand
     * @param {Strand} strand 
     * @param {number} progress 
     * @param {boolean} reverse
     */
    putOnStrand(strand, progress, reverse = Math.random() > 0.5) {
        this.strandOn = {
            strand: strand,
            progress: progress,
            reverse: reverse
        }

        Matter.Body.setStatic(this.body, true)
        this.body.collisionFilter.mask = 0b00
    }

    
    /**
     * remove ball from strand
     * @param {boolean} expectError - if false will error if not on a strand
     * @returns {boolean} true, but if expect error is enabled then not being on a strand will return false
     */
    getOffStrand(expectError = false) {
        if (!this.strandOn) {
            if (!expectError) throw "gooball is not on a strand"
            return false
        }

        this.strandOn = null

        Matter.Body.setStatic(this.body, false)
        Matter.Body.setAngularSpeed(this.body, 0)
        this.body.collisionFilter.mask = 0b11  

        return true
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} ox 
     * @param {number} oy 
     * @param {number} zoom 
     */
    render(ctx, ox = 0, oy = 0) {
        this.layers.render(ctx, ox - this.x, oy - this.y, 1, 1, this.rotation + (this.stuckTo ? this.stuckTo.rotation : 0))

        const level = window.game.LevelManager.currentLevel
        let zoom = level.camera.props.zoom

        let ballOnCanvas = window.game.Utils.toLevelCanvasPos(this.x - ox, this.y - oy, level)
        if (window.game.InputTracker.withinCircle(
            ballOnCanvas.x,
            ballOnCanvas.y,
            280 * zoom + this.shape.radius
        ) && (
            level.getStrandsOfBall(this).length == 0 ||
            (this.strand && this.strand.detachable)
        ) && !this.sleeping) {
            for (let eye of this.eyes) {
                if (this.timeSpent % (this.blinkCycle[0] + this.blinkCycle[1]) > this.blinkCycle[0]) continue
                
                ctx.fillStyle = "#fff"
                ctx.strokeStyle = "#000"
                ctx.lineWidth = zoom

                let [bx, by] = Object.values(window.game.Utils.toLevelCanvasPos(this.x - ox, this.y - oy, level))
                let [ex, ey] = Object.values(window.game.Utils.toLevelCanvasPos(this.x + eye.x - ox, this.y + eye.y - oy, level))

                ctx.save()
                ctx.translate(bx, by)
                ctx.rotate((this.rotation + (this.stuckTo ? this.stuckTo.rotation : 0)) * Math.PI / 180)
                ctx.translate(-bx, -by)

                ctx.beginPath()
                ctx.arc(ex, ey, eye.radius * zoom, 0, 2 * Math.PI)
                ctx.closePath()
                ctx.fill()
                ctx.stroke()

                ctx.fillStyle = "#000"
                
                ctx.beginPath()
                ctx.arc(ex, ey, eye.radius / 4 * zoom, 0, 2 * Math.PI)
                ctx.closePath()
                ctx.fill()
                ctx.stroke()

                ctx.restore()
            }
        }
    }

    /** @param {number} dt */
    tick(dt) {
        this.layers.tick(dt)
        this.timeSpent += dt

        if (this.sleeping && this.lastSlept + 2 < this.timeSpent) {
            this.lastSlept = this.timeSpent

            this.createSleepParticle()
        }
    }

    /**
     * Creates sleep particle
     */
    createSleepParticle() {
        const particle = new window.game.Classes.Layer
        particle.img = "IMAGE_SLEEPZ"
        particle.x = this.shape.radius / 2
        particle.y = this.shape.radius / 2
        particle.z = 999
        particle.size = {x: 0.5, y: 0.5}
        particle.transparency = 1
        particle.rotation = Math.random() * 40 - 20
	particle.staticrot = true

        const xMovement = 5 + Math.random() * 5
        const yMovement = 5 + Math.random() * 5

        particle.effect = function (dt) {
            this.x += dt * xMovement
            this.y += dt * yMovement

            if (this.timeSpent <= 1.5) {
                this.transparency = 1 - window.game.Classes.Easing.easeOut.from(this.timeSpent / 1.5)
            } else {
                this.transparency = window.game.Classes.Easing.easeIn.from(this.timeSpent / 1.5 - 1)
            }

            if (this.timeSpent > 3) {
                this.remove()
            }
        }

        this.layers.push(particle)
    }

    /**
     * @returns {Layer}
     */
    createSplat() {
        const splat = new window.game.Classes.Layer
        splat.img = "IMAGE_GOOSPLAT"
        splat.x = this.x
        splat.y = this.y
        splat.z = 999
        splat.rotation = Math.random() * 360
        splat.color = this.splatColor

        const oldX = this.x
        const oldY = this.y
        const distance = Math.random() * 32 + 64
        const time = Math.random() * 0.25 + 0.5

        splat.effect = function() {
            let progress = window.game.Classes.Easing.easeOut.from(1 / time * this.timeSpent)
            this.x = oldX + Math.cos((this.rotation + 90) * Math.PI / 180) * distance * progress
            this.y = oldY + Math.sin(-(this.rotation + 90) * Math.PI / 180) * distance * progress

            if (this.timeSpent > time) {
                this.remove()
            }
        }

        return splat
    }

    /**
     * First number is non-blinking, second is blinking
     * @type {[number, number]}
     */
    blinkCycle = [0, 0]
}

/** @class */
export class GooballEye {
    /** @type {number} */
    x

    /** @type {number} */
    y

    /** @type {number} */
    radius

    constructor(xml) {
        this.x = window.game.Utils.parseAttribute(xml.attributes.x)
        this.y = window.game.Utils.parseAttribute(xml.attributes.y)
        this.radius = window.game.Utils.parseAttribute(xml.attributes.radius)
    }
}
