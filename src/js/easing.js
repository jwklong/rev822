const bezierEasing = require("bezier-easing")

export default class Easing {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
    }

    /**
     * Gets the Y from the bezier curve
     * @param {number} x
     * @returns {number}
     */
    from(x) {
        return bezierEasing(this.x1, this.y1, this.x2, this.y2)(x)
    }

    static linear =     new Easing(0.0, 0.0, 1.0, 1.0)
    static easeIn =     new Easing(0.4, 0.0, 1.0, 1.0)
    static easeOut =    new Easing(0.0, 0.0, 0.6, 1.0)
    static easeInOut =  new Easing(0.4, 0.0, 0.6, 1.0)
    static easeOutIn =  new Easing(0.0, 0.4, 1.0, 0.6)
}