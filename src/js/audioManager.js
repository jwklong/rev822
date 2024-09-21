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
     * @param {boolean} [options.loops=false]
     * @param {number} [options.volume=1]
     * @returns {Sound}
     */
    createSound(id, src, options = {}) {
        var sound = new Sound(id, src, options)
        this.sounds[id] = sound
        return sound
    }

    /**
     * Generates a temporary name of `temp-X`, where X is a number.
     * X will increment until the name is not in a sound ID. This only applies to sounds still playing.
     * @example
     * let name = AudioManager.generateTemporaryName() // temp-0
     * let sound = AudioManager.createSound(name, ...)
     * sound.play()
     * console.log(AudioManager.generateTemporaryName()) // temp-1
     * sound.pause()
     * console.log(AudioManager.generateTemporaryName()) // temp-0
     * @returns {string}
     */
    generateTemporaryName() {
        var i = 0
        while (
            this.getSound(`temp-${i}`) !== undefined &&
            this.getSound(`temp-${i}`).playing
        ) i++
        return `temp-${i}`
    }
}

/** @see {@link AudioManager#createSound} */
class Sound {
    /**
     * @type {string}
     * @readonly
     */
    id

    /**
     * @type {string}
     * @readonly
     */
    src

    /**
     * @type {HTMLAudioElement}
     * @readonly
     */
    audio

    /** @type {boolean} */
    get playing() {
        return !this.audio.paused
    }

    /** @type {boolean} */
    get loops() {
        return this.audio.loops
    }
    set loops(x) {
        this.audio.loops = x
    }

    /** @type {number} */
    get length() {
        return this.audio.duration
    }

    /** @type {number} */
    get position() {
        return this.audio.currentTime
    }
    set position(x) {
        this.audio.currentTime = x
    }

    /** @type {number} */
    get volume() {
        return this.audio.volume
    }
    set volume(x) {
        this.audio.volume = x
    }

    /**
     * @param {string} id
     * @param {string} src
     * @param {Object} options
     * @param {boolean} [options.loops=false]
     * @param {number} [options.volume=1]
     */
    constructor(id, src, options = {}) {
        this.id = id
        this.src = src
        this.audio = window.game.ResourceManager.getResource(this.src).audio.cloneNode()

        this.loops = options.loops || false
        this.volume = options.volume || 1
    }

    /** Plays the audio */
    play() {
        this.audio.play()
    }

    /** Stops the audio */
    pause() {
        this.audio.pause()
    }
}