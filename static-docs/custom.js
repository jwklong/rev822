addEventListener("load", () => {
    document.querySelectorAll(".member-item-container").forEach(e => {
        if (e.textContent.startsWith("Type:")) {
            e.remove()
        }
    })
})