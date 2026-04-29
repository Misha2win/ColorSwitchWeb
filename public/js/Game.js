import GameArea from './GameArea.js'

const game = new GameArea()
game.start()

const password = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft',
  'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'Enter'
]
const input = []
window.addEventListener('keydown', (event) => {
    const tag = (event.target.tagName || '').toLowerCase()
    if (tag === 'input' || tag === 'textarea' || event.target.isContentEditable) return
    
    if (password[input.length] === event.key) {
      input.push(event.key)
      if (password.length === input.length) {
        globalThis.debug = !globalThis.debug
        console.log(`Debug mode is now ${ globalThis.debug ? 'on' : 'off' }!`)
      }
    } else {
      input.length = 0
    }
})

globalThis.game = game
globalThis.debug = false