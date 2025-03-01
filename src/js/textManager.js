const fs = require("fs/promises")
const path = require("path")

/** @class */
export class TextManager {
    /**
     * @type {string}
     * @readonly
     */
    defaultLang = "en-GB"

    get language() {
        return this.languageOverride ?? Intl.DateTimeFormat().resolvedOptions().locale
    }

    /**
     * @type {Object.<string, Object.<string, string>>}
     */
    languages = {}

    /**
     * forces a language
     * @type {string?}
     */
    languageOverride

    /**
     * when enabled, does not render translated text but its id instead
     * @type {boolean}
     */
    debug = false

    /**
     * @param {string} src - directory
     */
    async importJSON(src) {
        let json = JSON.parse((await fs.readFile(src)).toString())
        let lang = path.basename(src, ".json")

        this.languages[lang] = json
    }

    /**
     * @param {string} key - key to translate
     * @param {...string} [args] - arguments to replace in the translated string
     * @returns {string} translated string, or throws if key does not exist
     */
    get(key, ...args) {
        if (this.debug) return [key].concat(args).join(", ")
        let string = (this.languages[this.language] && this.languages[this.language][key]) || this.languages[this.defaultLang][key]
        if (string === undefined) throw `key "${key}" does not exist`

        let regex = /%(\d+)[a-z]/g
        let result
        while ((result = regex.exec(string)) !== null) {
            string = string.replace(result[0], args[Number(result[1]) - 1] ?? "?")
        }

        return string
    }

    /**
     * parses text, replacing stuff like {{TEXT_ID}} with the corresponding translation
     * @param {string} string 
     * @returns {string}
     */
    parseText(string) {
        if (this.debug) return string
        let regex = /{{([A-Z0-9_]+)}}/g
        let result
        while ((result = regex.exec(string)) !== null) {
            string = string.replace(result[0], this.get(result[1]))
        }

        return string
    }
}