import EditorArea from './EditorArea.js'

const editor = new EditorArea()
editor.start()

document.querySelectorAll('.button-entity')
    .forEach((button) => button.addEventListener('click', event => editor.handleEntityClick(event)))
editor.setActiveEntityType(editor.type)
document.getElementById('button-load').addEventListener('click', (event) => editor.handleLoadClick())
document.getElementById('button-previous-level').addEventListener('click', () => editor.handlePreviousLevelClick())
document.getElementById('button-next-level').addEventListener('click', () => editor.handleNextLevelClick())
document.getElementById('button-load-string').addEventListener('click', (event) => editor.handleLoadStringClick())
document.getElementById('button-print-json').addEventListener('click', (event) => editor.handlePrintClick('json'))
document.getElementById('button-play').addEventListener('click', (event) => editor.handlePlayClick(event))
document.getElementById('button-save').addEventListener('click', (event) => editor.handleSaveClick())
document.getElementById('button-save-as-new').addEventListener('click', (event) => editor.handleSaveAsNewClick())
document.getElementById('button-duplicate-selected').addEventListener('click', () => editor.duplicateSelectedEntity())
document.getElementById('button-delete-selected').addEventListener('click', () => editor.deleteSelectedEntity())
editor.canvas.addEventListener('pointerdown', (event) => editor.onPointerDown(event))
editor.canvas.addEventListener('pointermove', (event) => editor.onPointerMove(event))
editor.canvas.addEventListener('pointerup', (event) => editor.onPointerUp(event))
editor.canvas.addEventListener('pointercancel', (event) => editor.onPointerCancel(event))
editor.canvas.addEventListener('lostpointercapture', (event) => editor.onPointerCancel(event))
window.addEventListener('keydown', (event) => {
    const tag = (event.target.tagName || '').toLowerCase()
    if (tag === 'input' || tag === 'textarea' || event.target.isContentEditable) return
    editor.handleKeyPress(event)
})
document.getElementById('checkbox-debug').addEventListener('change', event => {
    globalThis.debug = event.target.checked
})

function isEditableInteractionTarget(target) {
    const editable = typeof target?.closest === 'function'
        ? target.closest('input, textarea, select, [contenteditable], .dialog-copy-text')
        : null

    return !!editable
}

function preventDefaultInteraction(event) {
    event.preventDefault()
}

function preventDefaultOutsideEditable(event) {
    if (!isEditableInteractionTarget(event.target)) event.preventDefault()
}

function setupEditorInteractionGuards() {
    const editorElement = document.getElementById('editor')
    let lastTouchEndTime = 0

    editor.canvas.addEventListener('contextmenu', preventDefaultInteraction)
    editor.canvas.addEventListener('dblclick', preventDefaultInteraction)
    editorElement.addEventListener('contextmenu', preventDefaultOutsideEditable)
    editorElement.addEventListener('dblclick', preventDefaultOutsideEditable)
    editorElement.addEventListener('touchend', (event) => {
        if (isEditableInteractionTarget(event.target) || event.touches.length || event.changedTouches.length !== 1) {
            lastTouchEndTime = 0
            return
        }

        const now = performance.now()
        if (now - lastTouchEndTime < 350) event.preventDefault()
        lastTouchEndTime = now
    }, { passive: false })
}

function setupEditorPlayControls() {
    const controls = document.getElementById('editor-play-controls')
    if (!controls) return

    const buttons = controls.querySelectorAll('.mobile-control-button')
    const setButtonPressed = (button, isPressed) => {
        button.classList.toggle('is-pressed', isPressed)
        editor.getCurrentPlayer()?.setInputForKey(button.dataset.key, isPressed)
        editor.resetFrameClock()
    }
    const captureButtonPointer = (button, pointerId) => {
        try {
            button.setPointerCapture?.(pointerId)
        } catch {
            // Synthetic pointer events do not always have an active browser pointer to capture.
        }
    }
    const releaseButtonPointer = (button, pointerId) => {
        try {
            if (button.hasPointerCapture?.(pointerId)) {
                button.releasePointerCapture(pointerId)
            }
        } catch {
            // Synthetic pointer events do not always have an active browser pointer to release.
        }
    }

    controls.addEventListener('contextmenu', event => event.preventDefault())

    for (const button of buttons) {
        button.addEventListener('pointerdown', (event) => {
            event.preventDefault()
            captureButtonPointer(button, event.pointerId)
            setButtonPressed(button, true)
        })

        const releaseButton = (event) => {
            event.preventDefault()
            releaseButtonPointer(button, event.pointerId)
            setButtonPressed(button, false)
        }

        button.addEventListener('pointerup', releaseButton)
        button.addEventListener('pointercancel', releaseButton)
        button.addEventListener('lostpointercapture', releaseButton)
        button.addEventListener('click', (event) => {
            event.preventDefault()
            button.blur()
        })
    }
}

setupEditorInteractionGuards()
setupEditorPlayControls()

globalThis.editor = editor
globalThis.debug = false
