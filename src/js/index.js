import ResourceManager from "./resourceManager.js";
import Easing from "./easing.js";
import Canvas from "./canvas.js";
const path = require("path")

let game = {
    ResourceManager: new ResourceManager(),
    Easing,
    Canvas: new Canvas()
}
window.game = game;

(async () => {
    await game.ResourceManager.addXMLFile(path.join(__dirname, "../data/resources.xml"))

    Object.values(game.ResourceManager.resources).forEach(async resource => {
        await resource.load()
    })

    function tick(dt) {
        game.Canvas.tick(dt)

        requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
})()