import MouseTracker from "./mouseTracker.js";
import TimeManager from "./timeManager.js";
import ResourceManager from "./resourceManager.js";
import MaterialManager from "./materialManager.js";
import LevelManager from "./levelManager.js";
import Easing from "./easing.js";
import Canvas from "./canvas.js";
const path = require("path")
const fs = require("fs/promises")

/**
 * @property {MouseTracker} MouseTracker - Tracks mouse movements.
 * @property {TimeManager} TimeManager - Manages time and timers.
 * @property {ResourceManager} ResourceManager - Handles resource loading and management.
 * @property {MaterialManager} MaterialManager - Manages materials.
 * @property {LevelManager} LevelManager - Handles level data, the core of the game
 * @property {Easing} Easing - Provides easing functions.
 * @property {Canvas} Canvas - Manages the drawing canvas.
 * @property {number} timePassed - Tracks the time passed in the game.
 */
let game = {
    MouseTracker: new MouseTracker,
    TimeManager: new TimeManager,
    ResourceManager: new ResourceManager,
    MaterialManager: new MaterialManager,
    LevelManager: new LevelManager,
    Easing,
    Canvas: new Canvas,

    timePassed: 0
}
window.game = game;

(async () => {
    await game.ResourceManager.addXMLFile(path.join(__dirname, "../data/resources.xml"))
    await game.MaterialManager.addXMLFile(path.join(__dirname, "../data/materials.xml"))

    var levelsFolder = (await fs.readdir(path.join(__dirname, "../data/levels")))
        .filter(async (src) => (await fs.stat(path.join(__dirname, "../data/levels", src))).isDirectory())

    for (const levelFolder of levelsFolder) {
        await game.LevelManager.addLevel(path.join(__dirname, "../data/levels", levelFolder))
    }

    Object.values(game.ResourceManager.resources).forEach(async resource => {
        await resource.load()
    })

    var totalDT = 0
    var lastDT = 0

    function tick(dt) {
        lastDT = totalDT
        totalDT = dt
        dt = totalDT - lastDT
        dt /= 1000
        dt = Math.min(0.1, dt)
        game.timePassed = totalDT / 1000

        game.TimeManager.tick(dt)

        if (game.Canvas.mode == 0) {
            game.LevelManager.currentLevel.tick(dt)
        }

        game.Canvas.tick(dt)

        requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
})()