import Layer from "./layer.js";
import Easing from "./easing.js";
import InputTracker from "./inputTracker.js";
import TimeManager from "./timeManager.js";
import ResourceManager from "./resourceManager.js";
import MaterialManager from "./materialManager.js";
import AudioManager from "./audioManager.js";
import GooballManager from "./gooballManager.js";
import LevelManager from "./levelManager.js";
import Canvas from "./canvas.js";
import ProfileManager from "./profileManager.js";
const path = require("path")
const fs = require("fs/promises")

/**
 * @property {Layer} Layer - Custom image data for rendering
 * @property {Easing} Easing - Provides easing functions
 * @property {InputTracker} InputTracker - Tracks mouse movements
 * @property {TimeManager} TimeManager - Manages time and timers
 * @property {ResourceManager} ResourceManager - Handles resource loading and management
 * @property {MaterialManager} MaterialManager - Manages materials for physics
 * @property {AudioManager} AudioManager - Play music & SFX
 * @property {AudioManager} GooballManager - Manages gooballs
 * @property {LevelManager} LevelManager - Handles level data, the core of the game
 * @property {Canvas} Canvas - Manages the drawing canvas
 * @property {ProfileManager} ProfileManager - Contains all the player data and settings
 * 
 * @property {number} timePassed - Tracks the time passed in the game
 */
let game = {
    Layer,
    Easing,
    InputTracker: new InputTracker,
    TimeManager: new TimeManager,
    ResourceManager: new ResourceManager,
    MaterialManager: new MaterialManager,
    AudioManager: new AudioManager,
    GooballManager: new GooballManager,
    LevelManager: new LevelManager,
    Canvas: new Canvas,
    ProfileManager: new ProfileManager,

    timePassed: 0
}
window.game = game;

(async () => {
    await game.ResourceManager.addXMLFile(path.join(__dirname, "../data/resources.xml"))
    await game.MaterialManager.addXMLFile(path.join(__dirname, "../data/materials.xml"))

    //balls
    var ballsFolder = (await fs.readdir(path.join(__dirname, "../data/gooballs")))
        .filter(async (src) => (await fs.stat(path.join(__dirname, "../data/gooballs", src))).isDirectory())

    for (const ballFolder of ballsFolder) {
        await game.GooballManager.addType(path.join(__dirname, "../data/gooballs", ballFolder))
    }

    //levels
    var levelsFolder = (await fs.readdir(path.join(__dirname, "../data/levels")))
        .filter(async (src) => (await fs.stat(path.join(__dirname, "../data/levels", src))).isDirectory())

    for (const levelFolder of levelsFolder) {
        await game.LevelManager.addLevel(path.join(__dirname, "../data/levels", levelFolder))
    }

    Object.values(game.ResourceManager.resources).forEach(async resource => {
        resource.load()
    })

    var totalDT = 0
    var lastDT = 0

    function tick(dt) {
        lastDT = totalDT
        totalDT = dt
        dt = totalDT - lastDT
        dt /= 1000
        dt = Math.min(1/60, dt)
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