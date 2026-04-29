import EditorArea from './EditorArea.js'

const editor = new EditorArea()
editor.start()

document.querySelectorAll('.button-entity')
    .forEach((button) => button.addEventListener('click', event => editor.handleEntityClick(event)))
document.querySelector(`.button-entity[data-type="${editor.type}"]`).classList.add('selected')
document.getElementById('button-load').addEventListener('click', (event) => editor.handleLoadClick())
document.getElementById('button-load-string').addEventListener('click', (event) => editor.handleLoadStringClick())
document.getElementById('button-print-json').addEventListener('click', (event) => editor.handlePrintClick('json'))
document.getElementById('button-play').addEventListener('click', (event) => editor.handlePlayClick(event))
document.getElementById('button-save').addEventListener('click', (event) => editor.handleSaveClick())
document.getElementById('button-help').addEventListener('click', (event) => editor.handleHelpClick())
editor.canvas.addEventListener('mousedown', (event) => editor.onMousedown())
editor.canvas.addEventListener('mousemove', (event) => editor.onMousemove(event))
editor.canvas.addEventListener('mouseup', (event) => editor.onMouseup())
window.addEventListener('keydown', (event) => {
    const tag = (event.target.tagName || '').toLowerCase()
    if (tag === 'input' || tag === 'textarea' || event.target.isContentEditable) return
    editor.handleKeyPress(event)
})
document.getElementById('checkbox-debug').addEventListener('change', event => {
    globalThis.debug = event.target.checked
})

globalThis.editor = editor
globalThis.debug = false
