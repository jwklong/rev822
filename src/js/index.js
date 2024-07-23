import ResourceManager from "./resourceManager.js";
import LevelManager from "./levelManager.js";
import Easing from "./easing.js";
import Canvas from "./canvas.js";
const path = require("path")
const fs = require("fs/promises")

let game = {
    ResourceManager: new ResourceManager,
    LevelManager: new LevelManager,
    Easing,
    Canvas: new Canvas
}
window.game = game;

(async () => {
    await game.ResourceManager.addXMLFile(path.join(__dirname, "../data/resources.xml"))

    var levelsFolder = (await fs.readdir(path.join(__dirname, "../data/levels")))
        .filter(async (src) => (await fs.stat(path.join(__dirname, "../data/levels", src))).isDirectory())

    for (const levelFolder of levelsFolder) {
        await game.LevelManager.addLevel(path.join(__dirname, "../data/levels", levelFolder))
    }

    Object.values(game.ResourceManager.resources).forEach(async resource => {
        await resource.load()
    })

    function tick(dt) {
        game.Canvas.tick(dt)

        requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
})()