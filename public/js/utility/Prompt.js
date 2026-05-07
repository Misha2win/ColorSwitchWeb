/**
 * helper function for making dialogs to display information
 */
export function dialog(title, text) {
    const dialog = document.createElement('dialog')
    dialog.classList.add('dialog')
    dialog.innerHTML = `
        <div class="dialog-title"></div>
        <form method="dialog" class="form">
            <div class="dialog-description"></div>
            <menu>
                <button value="ok">OK</button>
            </menu>
        </form>`
    document.body.appendChild(dialog)

    dialog.querySelector('.dialog-title').innerHTML = title
    dialog.querySelector('.dialog-description').innerHTML = text

    dialog.showModal()

    dialog.addEventListener('close', () => {
        dialog.remove()
    })
}

/**
 * Helper function for showing larger copyable text, such as generated JSON.
 */
export function copyableDialog(title, text) {
    const dialog = document.createElement('dialog')
    dialog.classList.add('dialog', 'copyable-dialog')
    dialog.innerHTML = `
        <div class="dialog-title"></div>
        <form method="dialog" class="form">
            <textarea class="dialog-copy-text" readonly spellcheck="false"></textarea>
            <menu>
                <button type="button" class="dialog-copy-button">Copy</button>
                <button value="ok">OK</button>
            </menu>
        </form>`
    document.body.appendChild(dialog)

    const titleElement = dialog.querySelector('.dialog-title')
    const textarea = dialog.querySelector('.dialog-copy-text')
    const copyButton = dialog.querySelector('.dialog-copy-button')

    titleElement.textContent = title
    textarea.value = text

    copyButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(text)
        } catch {
            textarea.focus()
            textarea.select()
            document.execCommand('copy')
        }
        copyButton.textContent = 'Copied'
    })

    dialog.showModal()
    textarea.focus()
    textarea.select()

    dialog.addEventListener('close', () => {
        dialog.remove()
    })
}

/**
 * Helper function for editing larger blocks of text, such as JSON.
 */
export function editableTextDialog(title, text, saveLabel = 'Save') {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog')
        dialog.classList.add('dialog', 'editable-dialog')
        dialog.innerHTML = `
            <div class="dialog-title"></div>
            <form class="form">
                <textarea class="dialog-copy-text dialog-edit-text" spellcheck="false"></textarea>
                <menu>
                    <button type="button" class="dialog-cancel-button">Cancel</button>
                    <button type="submit" class="dialog-save-button"></button>
                </menu>
            </form>`
        document.body.appendChild(dialog)

        const titleElement = dialog.querySelector('.dialog-title')
        const form = dialog.querySelector('.form')
        const textarea = dialog.querySelector('.dialog-copy-text')
        const cancelButton = dialog.querySelector('.dialog-cancel-button')
        const saveButton = dialog.querySelector('.dialog-save-button')

        titleElement.textContent = title
        textarea.value = text
        saveButton.textContent = saveLabel

        cancelButton.addEventListener('click', () => dialog.close('cancel'))
        form.addEventListener('submit', event => {
            event.preventDefault()
            dialog.close('save')
        })

        dialog.showModal()
        textarea.focus()

        dialog.addEventListener('close', () => {
            const value = dialog.returnValue === 'save' ? textarea.value : null
            dialog.remove()
            resolve(value)
        })
    })
}

/**
 * Helper function for confirming an action before continuing.
 */
export function confirmDialog(title, text, confirmLabel = 'OK') {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog')
        dialog.classList.add('dialog')
        dialog.innerHTML = `
            <div class="dialog-title"></div>
            <form method="dialog" class="form">
                <div class="dialog-description"></div>
                <menu>
                    <button value="cancel">Cancel</button>
                    <button value="confirm"></button>
                </menu>
            </form>`
        document.body.appendChild(dialog)

        dialog.querySelector('.dialog-title').textContent = title
        dialog.querySelector('.dialog-description').textContent = text
        dialog.querySelector('button[value="confirm"]').textContent = confirmLabel

        dialog.showModal()

        dialog.addEventListener('close', () => {
            const confirmed = dialog.returnValue === 'confirm'
            dialog.remove()
            resolve(confirmed)
        })
    })
}

/**
 * Helper function to make dialogs were the user picks one from a list of options
 */
export function promptChoices(title, label, options, defaultValue) {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog')
        dialog.classList.add('dialog')
        dialog.innerHTML = `
            <div id="p" class="dialog-title"></div>
            <form method="dialog" class="form">
                <label id="l" class="dialog-label" for="s"></label>
                <select class="dialog-select" id="s"></select>
                <menu>
                    <button value="cancel">Cancel</button>
                    <button value="ok">OK</button>
                </menu>
            </form>`
        document.body.appendChild(dialog)

        dialog.querySelector('#p').innerHTML = title
        dialog.querySelector('#l').textContent = label

        const choices = dialog.querySelector('#s')
        const choiceHTML = options.map((obj) => `<option value="${obj.value}">${obj.display}</option>`)
        choices.innerHTML = choiceHTML.join('')

        if (defaultValue) choices.value = defaultValue

        choices.focus()
        dialog.showModal()

        dialog.addEventListener('close', () => {
            const val = dialog.returnValue === 'ok' ? choices.value : null
            dialog.remove()
            resolve(val)
        })
    })
}

/**
 * Helper function for creating a dialog where the user needs to input text
 */
export function promptInput(title, label, defaultValue = '') {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog')
        dialog.classList.add('dialog')
        dialog.innerHTML = `
            <div id="p" class="dialog-title"></div>
            <form method="dialog" id="f" class="form">
                <label id="l" class="dialog-label" for="i"></label>
                <input id="i" class="dialog-input" name="message" type="text" placeholder="${defaultValue}" required></input>
                <menu>
                    <button type="button" id="c">Cancel</button>
                    <button type="submit">OK</button>
                </menu>
            </form>`
        document.body.appendChild(dialog)

        dialog.querySelector('#p').innerHTML = title
        dialog.querySelector('#l').innerHTML = label

        const form = dialog.querySelector('#f')

        dialog.showModal()

        dialog.querySelector('#c').addEventListener('click', (event) => {
            dialog.remove()
            resolve(null)
        })

        dialog.addEventListener('submit', (event) => {
            event.preventDefault() // Prevents page reload
            const data = new FormData(form)
            const message = (data.get('message') || '').trim()
            dialog.remove()
            resolve(message)
        })

        dialog.addEventListener('cancel', (event) => {
            dialog.remove()
            resolve(null)
        })
    })
}
