import GameArea from './GameArea.js'

const game = new GameArea()
game.start()

const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
const compactWidthQuery = window.matchMedia('(max-width: 1100px)')
const compactHeightQuery = window.matchMedia('(max-height: 850px)')
const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
const mobileCanvasMargin = 5
const mobileControls = document.getElementById('mobile-game-controls')
const mobileControlButtons = document.querySelectorAll('.mobile-control-button')

function shouldUseMobileLayout() {
    const hasTouch = navigator.maxTouchPoints > 0 || coarsePointerQuery.matches
    return hasTouch && (mobileUserAgent || compactWidthQuery.matches || compactHeightQuery.matches)
}

function updateMobileLayout() {
    document.body.classList.toggle('mobile-game-layout', shouldUseMobileLayout())
    syncMobileCanvasSize()
}

function getViewportHeight() {
    return window.visualViewport?.height ?? window.innerHeight
}

function syncMobileCanvasSize() {
    if (!game.canvas) return

    if (!document.body.classList.contains('mobile-game-layout')) {
        game.canvas.style.width = ''
        game.canvas.style.height = ''
        return
    }

    const controlsHeight = mobileControls?.getBoundingClientRect().height ?? 0
    const availableWidth = Math.max(0, window.innerWidth - mobileCanvasMargin * 2)
    const availableHeight = Math.max(0, getViewportHeight() - controlsHeight - mobileCanvasMargin * 2)
    const canvasRatio = game.canvas.width / game.canvas.height
    const fittedHeight = Math.min(availableWidth / canvasRatio, availableHeight)
    const fittedWidth = fittedHeight * canvasRatio

    game.canvas.style.width = `${fittedWidth}px`
    game.canvas.style.height = `${fittedHeight}px`
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
    if (!mobileControls) return

    const activePointers = new Map()
    const pressedButtons = new Set()
    const getControlButton = (x, y) => document
        .elementFromPoint(x, y)
        ?.closest('.mobile-control-button')

    const syncMobileInputs = () => {
        const nextPressedButtons = new Set(activePointers.values())
        for (const button of mobileControlButtons) {
            const wasPressed = pressedButtons.has(button)
            const isPressed = nextPressedButtons.has(button)
            if (wasPressed === isPressed) continue

            setMobileButtonPressed(button, isPressed)
            if (isPressed) {
                pressedButtons.add(button)
            } else {
                pressedButtons.delete(button)
            }
        }
    }

    const updatePointer = (id, x, y) => {
        const button = getControlButton(x, y)
        if (button && mobileControls.contains(button)) {
            activePointers.set(id, button)
        } else {
            activePointers.delete(id)
        }
    }

    const preventTouchDefaults = (event) => {
        event.preventDefault()
    }

    mobileControls.addEventListener('contextmenu', (event) => event.preventDefault())

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        const updateTouches = (event) => {
            event.preventDefault()
            for (const touch of event.changedTouches) {
                updatePointer(touch.identifier, touch.clientX, touch.clientY)
            }
            syncMobileInputs()
        }
        const releaseTouches = (event) => {
            event.preventDefault()
            for (const touch of event.changedTouches) {
                activePointers.delete(touch.identifier)
            }
            syncMobileInputs()
        }

        mobileControls.addEventListener('touchstart', updateTouches, { passive: false })
        mobileControls.addEventListener('touchmove', updateTouches, { passive: false })
        mobileControls.addEventListener('touchend', releaseTouches, { passive: false })
        mobileControls.addEventListener('touchcancel', releaseTouches, { passive: false })
    } else {
        const activePointerIds = new Set()
        const handlePointerDown = (event) => {
            event.preventDefault()
            activePointerIds.add(event.pointerId)
            mobileControls.setPointerCapture?.(event.pointerId)
            updatePointer(event.pointerId, event.clientX, event.clientY)
            syncMobileInputs()
        }
        const handlePointerMove = (event) => {
            if (!activePointerIds.has(event.pointerId)) return

            event.preventDefault()
            updatePointer(event.pointerId, event.clientX, event.clientY)
            syncMobileInputs()
        }
        const releasePointerEvent = (event) => {
            event.preventDefault()
            activePointerIds.delete(event.pointerId)
            activePointers.delete(event.pointerId)
            if (mobileControls.hasPointerCapture?.(event.pointerId)) {
                mobileControls.releasePointerCapture(event.pointerId)
            }
            syncMobileInputs()
        }

        mobileControls.addEventListener('pointerdown', handlePointerDown)
        mobileControls.addEventListener('pointermove', handlePointerMove)
        mobileControls.addEventListener('pointerup', releasePointerEvent)
        mobileControls.addEventListener('pointercancel', releasePointerEvent)
        mobileControls.addEventListener('lostpointercapture', releasePointerEvent)
    }

    for (const button of mobileControlButtons) {
        button.addEventListener('touchstart', preventTouchDefaults, { passive: false })
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
window.visualViewport?.addEventListener('resize', updateMobileLayout)
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
