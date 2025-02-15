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
    },

    /**
     * Gets the distance between two points
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @returns {number}
     */
    distanceTo(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1)
    },
    
    /**
     * checks if a point is inside a circle
     * @param {number} x
     * @param {number} y
     * @param {number} cx
     * @param {number} cy
     * @param {number} radius
     * @returns {boolean}
     */
    withinCircle(x, y, cx, cy, radius) {
        return Utils.distanceTo(x, y, cx, cy) <= radius
    },

    /**
     * Gets progress on a line from point
     * @param {number} x 
     * @param {number} y
     * @param {number} lx1 
     * @param {number} ly1 
     * @param {number} lx2 
     * @param {number} ly2
     * @returns {number}
     */
    intersectsLineProgress(x, y, lx1, ly1, lx2, ly2) {
        const dx = lx2 - lx1;
        const dy = ly2 - ly1;
      
        const t = ((x - lx1) * dx + (y - ly1) * dy) / (dx * dx + dy * dy);
      
        return Math.max(0, Math.min(1, t));
    },

    /**
     * Checks if a line between two points intersects a point + radius for margin of error
     * @param {number} x 
     * @param {number} y
     * @param {number} lx1 
     * @param {number} ly1 
     * @param {number} lx2 
     * @param {number} ly2
     * @param {number} radius
     * @returns {boolean}
     */
    intersectsLine(x, y, lx1, ly1, lx2, ly2, radius) {
        const dx = lx2 - lx1;
        const dy = ly2 - ly1;

        const t = Utils.intersectsLineProgress(x, y, lx1, ly1, lx2, ly2)
      
        const closestX = lx1 + t * dx;
        const closestY = ly1 + t * dy;
      
        return Utils.withinCircle(x, y, closestX, closestY, radius);
    },

    /**
     * Gets distance from a point to closest point on line
     * @param {number} x
     * @param {number} y
     * @param {number} lx1 
     * @param {number} ly1 
     * @param {number} lx2 
     * @param {number} ly2
     * @returns {boolean}
     */
    intersectsLineDistance(x, y, lx1, ly1, lx2, ly2) {
        const dx = lx2 - lx1;
        const dy = ly2 - ly1;

        const t = Utils.intersectsLineProgress(x, y, lx1, ly1, lx2, ly2)
      
        const closestX = lx1 + t * dx;
        const closestY = ly1 + t * dy;
      
        return Utils.withinCircle(x, y, closestX, closestY, radius);
    },

    /**
     * Checks if a point is inside a rectangle
     * @param {number} x 
     * @param {number} y
     * @param {number} rx1 
     * @param {number} ry1 
     * @param {number} rx2 
     * @param {number} ry2
     * @returns {boolean}
     */
    withinRect(x, y, rx1, ry1, rx2, ry2) {
        return x >= rx1 && x <= rx2 && y >= ry1 && y <= ry2
    },

    /**
     * Checks if a point is inside a polygon
     * @param {number} x 
     * @param {number} y
     * @param {Array<{x: number, y: number}>} vertices
     * @returns {boolean}
     */
    withinPolygon(x, y, vertices) {
        let inside = false
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x
            const yi = vertices[i].y
            const xj = vertices[j].x
            const yj = vertices[j].y
            const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
            if (intersect) inside = !inside
        }
        return inside
    }
}

export default Utils