import { Utils } from "./utils.js";
import { Layer } from "./layer.js";
import { Easing } from "./easing.js";
import { InputTracker } from "./inputTracker.js";
import { TimeManager, Timer } from "./timeManager.js";
import { TextManager } from "./textManager.js";
import { ResourceManager, GenericResource, ImageResource, AudioResource, FontResource } from "./resourceManager.js";
import { MaterialManager, Material } from "./materialManager.js";
import { AudioManager, Sound } from "./audioManager.js";
import { GooballManager, Gooball, GooballEye } from "./gooballManager.js";
import { PipeManager, Pipe } from "./pipeManager.js"
import { IslandManager, Island, IslandLevel } from "./islandManager.js";
import { LevelManager, Level, Camera, CameraKeyframe, GenericBody, RectBody, CircleBody, Strand } from "./levelManager.js";
import { Canvas, CanvasButton } from "./canvas.js";
import { ProfileManager, Profile, LevelProfile } from "./profileManager.js";
const path = require("path")
const fs = require("fs/promises")

/**
 * @property {Object} Classes - contains all classes that can be init'd
 * @property {Utils} Utils - Provides utility functions
 * @property {Layer} Layer - Custom image data for rendering
 * @property {Easing} Easing - Provides easing functions
 * @property {InputTracker} InputTracker - Tracks mouse movements
 * @property {TimeManager} TimeManager - Manages time and timers
 * @property {TextManager} TextManager - Text + translations
 * @property {ResourceManager} ResourceManager - Handles resource loading and management
 * @property {MaterialManager} MaterialManager - Manages materials for physics
 * @property {AudioManager} AudioManager - Play music & SFX
 * @property {GooballManager} GooballManager - Manages gooballs
 * @property {PipeManager} PipeManager - Manages all types of pipes
 * @property {IslandManager} IslandManager - Manages all islands
 * @property {LevelManager} LevelManager - Handles level data, the core of the game
 * @property {Canvas} Canvas - Manages the drawing canvas
 * @property {ProfileManager} ProfileManager - Contains all the player data and settings
 * 
 * @property {number} timePassed - Tracks the time passed in the game
 */
let game = {
    Classes: {
        Layer,
        Easing,

        InputTracker,
        TimeManager, Timer,
        TextManager,
        ResourceManager, GenericResource, ImageResource, AudioResource, FontResource,
        MaterialManager, Material,
        AudioManager, Sound,
        GooballManager, Gooball, GooballEye,
        PipeManager, Pipe,
        IslandManager, Island, IslandLevel,
        LevelManager, Level, Camera, CameraKeyframe, GenericBody, RectBody, CircleBody, Strand,
        Canvas, CanvasButton,
        ProfileManager, Profile, LevelProfile
    },
    Utils,
    InputTracker: new InputTracker,
    TimeManager: new TimeManager,
    TextManager: new TextManager,
    ResourceManager: new ResourceManager,
    MaterialManager: new MaterialManager,
    AudioManager: new AudioManager,
    GooballManager: new GooballManager,
    PipeManager: new PipeManager,
    IslandManager: new IslandManager,
    LevelManager: new LevelManager,
    Canvas: new Canvas,
    ProfileManager: new ProfileManager,

    timePassed: 0
}
window.game = game;

(async () => {
    await game.ResourceManager.addXMLFile(path.join(__dirname, "../data/resources.xml"))
    await game.MaterialManager.addXMLFile(path.join(__dirname, "../data/materials.xml"))

    //text
    var textFolder = (await fs.readdir(path.join(__dirname, "../data/text")))
        .filter(async (src) => !(await fs.stat(path.join(__dirname, "../data/text", src))).isDirectory())

    for (const textFile of textFolder) {
        await game.TextManager.importJSON(path.join(__dirname, "../data/text", textFile))
    }

    //balls
    var ballsFolder = (await fs.readdir(path.join(__dirname, "../data/gooballs")))
        .filter(async (src) => (await fs.stat(path.join(__dirname, "../data/gooballs", src))).isDirectory())

    for (const ballFolder of ballsFolder) {
        await game.GooballManager.addType(path.join(__dirname, "../data/gooballs", ballFolder))
    }

    //pipes
    var pipesFolder = (await fs.readdir(path.join(__dirname, "../data/pipes")))
        .filter(async (src) => (await fs.stat(path.join(__dirname, "../data/pipes", src))).isDirectory())

    for (const pipeFolder of pipesFolder) {
        await game.PipeManager.addType(path.join(__dirname, "../data/pipes", pipeFolder))
    }

    //islands
    var islandsFolder = (await fs.readdir(path.join(__dirname, "../data/islands")))
        .filter(async (src) => !(await fs.stat(path.join(__dirname, "../data/islands", src))).isDirectory())
    
    for (const islandFile of islandsFolder) {
        await game.IslandManager.addIsland(path.join(__dirname, "../data/islands", islandFile))
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

        game.InputTracker.resetOnce()

        requestAnimationFrame(tick)
    }

    addEventListener('keyup', event => {
        if (event.key == 'Escape') {
            game.Canvas.togglePause()
        }
    })

    requestAnimationFrame(tick)
})()