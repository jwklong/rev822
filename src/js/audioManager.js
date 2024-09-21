/** @class */
export default class AudioManager {
    /** @type {Object<string, Sound>} */
    sounds = {}

    /**
     * @param {string} id
     * @returns {Sound?}
     */
    getSound(id) {
        return this.sounds[id]
    }

    /**
     * @param {string} id
     * @param {string} src
     * @param {Object} options
     * @returns {Sound}
     */
    createSound(id, src, options = {}) {
        var sound = new Sound(id, src, options)
        this.sounds[id] = sound
        return sound
    }
}

class Sound {
    /** @type {string} */
    id

    /** @type {string} */
    src

    /** @type {HTMLAudioElement} */
    audio

    /**
     * @param {string} id
     * @param {string} src
     * @param {Object} options
     */
    constructor(id, src, options = {}) {
        this.id = id
        this.src = src
        this.audio = window.game.ResourceManager.getResource(this.src).audio.cloneNode()
    }

    play() {
        this.audio.play()
    }
}