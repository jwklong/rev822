const { XMLParser } = require("fast-xml-parser")
const fs = require("fs/promises")
const path = require("path")
const Matter = require("matter-js")

/** @class */
export default class GooballManager {
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
class Gooball {
    /** @type {Object} */
    xml

    /** @type {string} */
    type

    /** @type {string?} */
    ref

    /** @type {LayerGroup} */
    layers = new window.game.Layer.Group

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
     * Stops gooballs from building on this gooball
     * @type {string}
     */
    nobuild = false

    /**
     * Stops gooballs from climbing on this gooball + does not trigger pipes
     * @type {string}
     */
    noclimb = false

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

        if (xml.attributes) {
            this.mass = xml.attributes.mass ?? 30
            this.antigrav = xml.attributes.antigrav ?? false
            this.nobuild = xml.attributes.nobuild ?? false
            this.noclimb = xml.attributes.noclimb ?? false
            this.intelligence = xml.attributes.intelligence ?? 0.9
            this.climbspeed = xml.attributes.climbspeed ?? 45
        }

        for (const [key, value] of Object.entries(xml.body)) {
            switch (key) {
                case "layer":
                    for (let v of value) {
                        this.layers.push(window.game.Layer.fromXML(v.attributes))
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
        this.body.collisionFilter.mask = 0b11  

        return true
    }

    render(ctx, ox = 0, oy = 0, zoom = 1) {
        this.layers.render(ctx, ox - this.x, oy - this.y, 1, 1, zoom)

        const level = window.game.LevelManager.currentLevel

        if (window.game.InputTracker.distanceTo(
            this.x + 1280 / 2 - level.camera.props.x,
            -this.y + 720 / 2 + level.camera.props.y,
        ) < 320 && (
            level.getStrandsOfBall(this).length == 0 ||
            (this.strand && this.strand.detachable)
        ) && !this.sleeping) {
            for (let eye of this.eyes) {
                ctx.fillStyle = "#fff"
                ctx.strokeStyle = "#000"
                ctx.lineWidth = 1

                ctx.beginPath()
                ctx.arc(
                    window.game.Utils.toCanvasPos(this.x + eye.x - ox, this.y + eye.y - oy, 0, 0, zoom).x,
                    window.game.Utils.toCanvasPos(this.x + eye.x - ox, this.y + eye.y - oy, 0, 0, zoom).y,
                    eye.radius, 0, 2 * Math.PI
                )
                ctx.closePath()
                ctx.fill()
                ctx.stroke()

                ctx.fillStyle = "#000"
                
                ctx.beginPath()
                ctx.arc(
                    window.game.Utils.toCanvasPos(this.x + eye.x - ox, this.y + eye.y - oy, 0, 0, zoom).x,
                    window.game.Utils.toCanvasPos(this.x + eye.x - ox, this.y + eye.y - oy, 0, 0, zoom).y,
                    eye.radius / 4, 0, 2 * Math.PI
                )
                ctx.closePath()
                ctx.fill()
                ctx.stroke()
            }
        }
    }

    tick(dt) {
        this.layers.tick(dt)
        this.timeSpent += dt

        if (this.sleeping && this.lastSlept + 2 < this.timeSpent) {
            this.lastSlept = this.timeSpent

            this.createSleepParticle()
        }
    }

    createSleepParticle() {
        const particle = new window.game.Layer
        particle.img = "IMAGE_SLEEPZ"
        particle.x = this.shape.radius / 2
        particle.y = this.shape.radius / 2
        particle.size = {x: 0.5, y: 0.5}
        particle.transparency = 1
        particle.rotation = Math.random() * 40 - 20

        const xMovement = 5 + Math.random() * 5
        const yMovement = 5 + Math.random() * 5

        particle.effect = function (dt) {
            this.x += dt * xMovement
            this.y += dt * yMovement

            if (this.timeSpent <= 1.5) {
                this.transparency = 1 - window.game.Easing.easeOut.from(this.timeSpent / 1.5)
            } else {
                this.transparency = window.game.Easing.easeIn.from(this.timeSpent / 1.5 - 1)
            }

            if (this.timeSpent > 3) {
                this.remove()
            }
        }

        this.layers.push(particle)
    }
}

/** @class */
class GooballEye {
    /** @type {number} */
    x

    /** @type {number} */
    y

    /** @type {number} */
    radius

    constructor(xml) {
        this.x = xml.attributes.x
        this.y = xml.attributes.y
        this.radius = xml.attributes.radius
    }
}