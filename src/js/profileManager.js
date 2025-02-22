/** @class */
export class ProfileManager {
    constructor() {
        //TODO: load and save profiles n stuff
        //for now im gonna just set a default profile to current profile
        this.currentProfile = new Profile
    }

    /** @type {Profile[]} */
    profiles = []

    /** @type {Profile} */
    currentProfile
}

/** @class */
export class Profile {
    /** @type {Object<string, LevelProfile>} */
    levels = {}

    /** @param {string} id */
    getLevel(id) {
        this.levels[id] = this.levels[id] ?? new LevelProfile
        return this.levels[id]
    }
}

export class LevelProfile {
    /** @type {boolean} */
    completed = false

    /** @type {number} */
    balls = 0

    /** @type {number} */
    height = 0

    /** @type {number} */
    time = 0

    /** @type {number} */
    moves = 0
}