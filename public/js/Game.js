import GameArea from './GameArea.js'

const game = new GameArea()
game.start()

const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
const compactWidthQuery = window.matchMedia('(max-width: 1100px)')
const compactHeightQuery = window.matchMedia('(max-height: 850px)')
const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
const mobileControlButtons = document.querySelectorAll('.mobile-control-button')

function shouldUseMobileLayout() {
    const hasTouch = navigator.maxTouchPoints > 0 || coarsePointerQuery.matches
    return hasTouch && (mobileUserAgent || compactWidthQuery.matches || compactHeightQuery.matches)
}

function updateMobileLayout() {
    document.body.classList.toggle('mobile-game-layout', shouldUseMobileLayout())
}

function addMediaQueryListener(query, listener) {
    if (query.addEventListener) {
        query.addEventListener('change', listener)
    } else {
        query.addListener(listener)
    }
}

function setMobileButtonPressed(button, isPressed) {
    button.classList.toggle('is-pressed', isPressed)
    game.getCurrentPlayer()?.setInputForKey(button.dataset.key, isPressed)
    game.resetFrameClock()
}

function setupMobileControls() {
    const mobileControls = document.getElementById('mobile-game-controls')
    if (!mobileControls) return

    mobileControls.addEventListener('contextmenu', (event) => event.preventDefault())

    for (const button of mobileControlButtons) {
        const pointerIds = new Set()
        const syncInputState = () => setMobileButtonPressed(button, pointerIds.size > 0)
        const releasePointer = (event) => {
            event.preventDefault()
            pointerIds.delete(event.pointerId)
            if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId)
            syncInputState()
        }

        button.addEventListener('pointerdown', (event) => {
            event.preventDefault()
            pointerIds.add(event.pointerId)
            button.setPointerCapture?.(event.pointerId)
            syncInputState()
        })
        button.addEventListener('pointerup', releasePointer)
        button.addEventListener('pointercancel', releasePointer)
        button.addEventListener('lostpointercapture', (event) => {
            pointerIds.delete(event.pointerId)
            syncInputState()
        })
        button.addEventListener('click', (event) => {
            event.preventDefault()
            button.blur()
        })
    }
}

for (const query of [coarsePointerQuery, compactWidthQuery, compactHeightQuery]) {
    addMediaQueryListener(query, updateMobileLayout)
}
window.addEventListener('resize', updateMobileLayout)
updateMobileLayout()
setupMobileControls()

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
