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
        return Intl.DateTimeFormat().resolvedOptions().locale
    }

    /**
     * @type {Object.<string, Object.<string, string>>}
     */
    languages = {}

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
        let string = (this.languages[this.language] && this.languages[this.language][key]) || this.languages[this.defaultLang][key]
        if (string === undefined) throw `key "${key}" does not exist`

        let regex = /%(\d+)[a-z]/g
        let result
        while ((result = regex.exec(string)) !== null) {
            console.log(result[0])
            string = string.replace(result[0], args[Number(result[1]) - 1] ?? "?")
        }

        return string
    }

    parseText(string) {
        let regex = /{{[(A-Z_)]}}/g
        let result
        while ((result = regex.exec(string)) !== null) {
            string = string.replace(result[0], this.get(result[1]))
        }

        return string
    }
}