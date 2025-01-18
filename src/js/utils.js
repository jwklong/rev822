/** @namespace */
let Utils = {
    /**
     * parses attributes from xml,
     * if the input is something like "1-10" it will pick a random integer between those numbers
     * @param {*} input
     * @param {*?} or - the default
     * @returns {*}
     */
    parseAttribute: (input, or = undefined) => {
        if ((input == undefined || input == "" || input == NaN) && or !== undefined) return or

        if (typeof input == "string") {
            var randomTest = /^(-?\d+)-(-?\d+)$/g.exec(input)
            if (randomTest) {
                return Math.floor(Math.random() * (Number(randomTest[2]) - Number(randomTest[1]) + 1) + Number(randomTest[1]))
            }
        }

        return input
    },
    
    /**
     * converts a position in the level to a position on the canvas, taking account of the camera
     * @param {number} x - the x position in the level
     * @param {number} y - the y position in the level
     * @param {Level} level - the level
     * @returns {{x: number, y: number}}
     */
    toLevelCanvasPos(x, y, level) {
        return Utils.toCanvasPos(x - level.camera.props.x, y - level.camera.props.y, 0, 0, level.camera.props.zoom)
    },
    
    /**
     * converts a position of the object to a position on the canvas
     * @param {number} x - the x position of the object
     * @param {number} y - the y position of the object
     * @param {number} width - the width of the object (for centering)
     * @param {number} height - the height of the object (for centering)
     * @param {number} zoom - the zoom
     * @returns {{x: number, y: number}}
     */
    toCanvasPos(x, y, width = 0, height = 0, zoom = 1) {
        return {
            x: x + 1280 / 2 / zoom - width / 2,
            y: -y + 720 / 2 / zoom - height / 2
        }
    },

    /**
     * converts a position on the canvas to a position in the level, taking account of the camera
     * @param {number} x - the x position on the canvas
     * @param {number} y - the y position on the canvas
     * @param {Level} level - the level
     * @returns {{x: number, y: number}}
     */
    fromLevelCanvasPos(x, y, level) {
        let zoom = level.camera.props.zoom
        return Utils.fromCanvasPos(x / zoom + level.camera.props.x, y / zoom - level.camera.props.y, zoom)
    },

    /**
     * converts a position on the canvas to a position in the level
     * @param {number} x - the x position on the canvas
     * @param {number} y - the y position on the canvas
     * @param {number} zoom - the zoom
     * @returns {{x: number, y: number}}
     */
    fromCanvasPos(x, y, zoom = 1) {
        return {
            x: x - 1280 / 2 / zoom,
            y: -(y - 720 / 2 / zoom)
        }
    }
}

export default Utils