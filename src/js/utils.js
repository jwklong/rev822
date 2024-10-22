/** @namespace */
let Utils = {
    /**
     * parses attributes from xml,
     * if the input is something like "1-10" it will pick a random integer between those numbers
     * @param {*} input
     * @param {*?} or - the default
     * @returns {*}
     */
    parseAttribute: (input, or = undefined) => {
        if ((input == undefined || input == "" || input == NaN) && or !== undefined) return or

        if (typeof input == "string") {
            var randomTest = /^(-?\d+)-(-?\d+)$/g.exec(input)
            if (randomTest) {
                return Math.floor(Math.random() * (Number(randomTest[2]) - Number(randomTest[1]) + 1) + Number(randomTest[1]))
            }
        }

        return input
    }
}

export default Utils