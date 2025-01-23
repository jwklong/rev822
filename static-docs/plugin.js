exports.handlers = {
    processingComplete(e) {
        const classMap = {}

        e.doclets.forEach((doclet) => {
            if (doclet.kind === 'class' && doclet.augments) {
                doclet.augments.forEach((parent) => {
                    if (!classMap[parent]) {
                        classMap[parent] = []
                    }
                    if (!classMap[parent].includes(doclet.longname)) {
                        classMap[parent].push(doclet.longname)
                    }
                })
            }
        })

        for (let parent of Object.keys(classMap)) {
            classMap[parent].sort()
        }

        e.doclets.forEach((doclet) => {
            if (classMap[doclet.longname]) {
                doclet.description = doclet.description || ''
                const subclassList = classMap[doclet.longname]
                    .map((subclass) => `<li>{@link ${subclass}}</li>`)
                    .join('')
                doclet.description += `
                    <strong>Subclasses:</strong>
                    <ul>
                    ${subclassList}
                    </ul>
                `
            }
        })
    }
}