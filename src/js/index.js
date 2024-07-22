import ResourceManager from "./resourceManager.js";
const path = require("path")

let game = {
    ResourceManager: new ResourceManager()
}
window.game = game

game.ResourceManager.addXMLFile(path.join(__dirname, "../data/resources.xml"))

/* Object.values(game.ResourceManager.resources).forEach(async resource => {
    await resource.load()
    console.log(resource.id, "loaded")
}) */