import { boxesIntersect } from '../math/PhysicsEngine.js'
import { darkenHex } from '../utility/Util.js'
import Color from './Color.js'
import Entity from './Entity.js'

export default class Player extends Entity {

    constructor(x, y, eventListeners = true) {
        super(x, y, 20, 20)

        this.speed = 400

        this.requestLeft = false
        this.requestRight = false
        this.requestUp = false
        this.requestDown = false
        this.requestRestart = false
        this.requestUseItem = false

        this.redUses = 0
        this.greenUses = 0
        this.blueUses = 0

        this.ignoreInputs = false

        this.heldItem = null

        this.mirror = null

        if (eventListeners) {
            window.addEventListener('keydown', (event) => this.onKeyDown(event))
            window.addEventListener('keyup', (event) => this.onKeyUp(event))
        }
    }

    createMirror(color) {
        this.mirror = new Player(0, 0, false)
        Object.defineProperty(this.mirror, 'color', {
            get: () => color,
            set: (newValue) => {
                if (newValue === color) return
                this.createMirror(newValue)
            },
            configurable: true,
            enumerable: true
        })

        let currentColor = this.color
        Object.defineProperty(this, 'color', {
            get: () => currentColor,
            set: (newValue) => {
                if (newValue === currentColor) return
                currentColor = newValue
                this.level?.createGhosts(color)
            },
            configurable: true,
            enumerable: true
        })

        this.level?.createGhosts(color)
    }

    removeMirror() {
        this.mirror = null

        Object.defineProperty(this, 'color', {
            value: this.color,
            writable: true,
            configurable: true,
            enumerable: true
        })
    }

    restart() {
        this.removeMirror()

        this.heldItem = null

        this.redUses = 0
        this.greenUses = 0
        this.blueUses = 0

        this.requestLeft = false
        this.requestRight = false
        this.requestUp = false
        this.requestDown = false
        this.requestRestart = false
        this.requestShift = false
        this.requestUseItem = false

        this.coyoteTimeSeconds = Player.coyoteTimeSeconds + (globalThis.isMobile ? 0.05 : 0)
        this.timeSinceGrounded = 0
        this.canCoyoteJump = false
    }

    useItem() {
        const item = this.heldItem
        if (!item) return

        item.onUse(this)
    }

    removeItem() {
        this.heldItem = null
    }

    holdItem(item) {
        this.heldItem = item
    }

    addHealth(health) {
        this.health ??= 0
        this.health += health
    }

    draw(context) {
        if (this.color.hasPoorVisibility()) {
            context.fillStyle = 'black'
            context.fillRect(this.x, this.y, this.width, this.height)

            context.fillStyle = this.color.drawColor
            context.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2)
        } else if (this.color === Color.GRAY) {
            context.fillStyle = 'black'
            context.fillRect(this.x, this.y, this.width, this.height)

            context.fillStyle = this.color.drawColor
            context.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2)
        } else {
            context.fillStyle = this.color.drawColor
            context.fillRect(this.x, this.y, this.width, this.height)
        }

        const gameWidth = this.level?.levelManager?.width
        const gameHeight = this.level?.levelManager?.height
        const mirror = this.mirror
        if (mirror && gameWidth && gameWidth) {
            context.save()
            context.strokeStyle = 'black'
            context.lineWidth = 3
            context.lineCap = 'round'
            context.lineJoin = 'round'
            context.beginPath()
            context.moveTo(this.x + 5, this.y - 10)
            context.lineTo(this.x + 10, this.y - 5)
            context.lineTo(this.x + 15, this.y - 10)
            context.stroke()

            context.fillStyle = mirror.color.drawColor
            context.fillRect(gameWidth - this.x - this.width, this.y, this.width, this.height)

            context.strokeStyle = 'gray'
            context.beginPath()
            context.moveTo(gameWidth / 2, 0)
            context.lineTo(gameWidth / 2, gameHeight)
            context.stroke()
            context.restore()
        }

        const invTop = this.level?.levelManager?.height

        const drawColor = (context, x, y, color, count) => {
            context.save()

            context.fillStyle = darkenHex(color.drawColor)
            context.fillRect(x, y , 30, 30)
            context.fillStyle = color.drawColor
            context.fillRect(x + 5, y + 5, 20, 20)

            const centerX = x + 15
            const centerY = y + 15
            const armLength = 15

            context.lineCap = 'round'
            context.lineWidth = 8
            context.strokeStyle = 'black'
            context.beginPath()
            context.moveTo(centerX - armLength / 2, centerY)
            context.lineTo(centerX + armLength / 2, centerY)
            if (!this.requestShift) {
                context.moveTo(centerX, centerY - armLength / 2)
                context.lineTo(centerX, centerY + armLength / 2)
            }
            context.stroke()

            context.lineWidth = 4
            context.strokeStyle = 'white'
            context.stroke()

            context.font = '20px sans-serif'
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.fillStyle = 'white'
            context.lineWidth = 3
            context.strokeStyle = 'black'
            context.strokeText(count, x + 25, y + 25)
            context.fillText(count, x + 25, y + 25)

            context.restore()
        }

        context.strokeStyle = 'black'



        if (!globalThis.isMobile) {
            context.fillStyle = 'white'
            context.fillRect(5, invTop + 5, 40, 40)
            context.strokeRect(5, invTop + 5, 40, 40)
            drawColor(context, 10, invTop + 10, Color.RED, this.redUses)

            context.fillRect(50, invTop + 5, 40, 40)
            context.strokeRect(50, invTop + 5, 40, 40)
            drawColor(context, 55, invTop + 10, Color.GREEN, this.greenUses)

            context.fillRect(95, invTop + 5, 40, 40)
            context.strokeRect(95, invTop + 5, 40, 40)
            drawColor(context,100, invTop + 10, Color.BLUE, this.blueUses)

            context.fillRect(5, invTop + 50, 40, 40)
            context.strokeRect(5, invTop + 50, 40, 40)

            const item = this.heldItem
            if (item) {
                item.x = 10
                item.y = invTop + 55
                context.save()
                item.draw(context)
                context.restore()
            }

            const vennWidth = 85
            const vennHeight = 85
            const vennX = gameWidth - vennWidth - 5
            const vennY = invTop + 5
            const vennSize = Math.min(vennWidth, vennHeight)
            const vennRadius = vennSize * 0.3
            const vennCenterX = vennX + vennWidth / 2
            const vennRedX = vennCenterX - vennRadius * 0.4
            const vennGreenX = vennCenterX + vennRadius * 0.4
            const vennBlueX = vennCenterX
            const vennTopY = vennY + vennHeight * 0.42
            const vennBottomY = vennTopY + vennRadius * 0.6

            context.save()
            context.fillStyle = 'black'
            context.fillRect(vennX, vennY, vennWidth, vennHeight)

            context.globalCompositeOperation = 'lighter'
            context.fillStyle = Color.RED.drawColor
            context.beginPath()
            context.arc(vennRedX, vennTopY, vennRadius, 0, Math.PI * 2)
            context.fill()

            context.fillStyle = Color.GREEN.drawColor
            context.beginPath()
            context.arc(vennGreenX, vennTopY, vennRadius, 0, Math.PI * 2)
            context.fill()

            context.fillStyle = Color.BLUE.drawColor
            context.beginPath()
            context.arc(vennBlueX, vennBottomY, vennRadius, 0, Math.PI * 2)
            context.fill()

            context.globalCompositeOperation = 'source-over'
            context.strokeStyle = 'white'
            context.strokeRect(vennX, vennY, vennWidth, vennHeight)
            context.restore()
        } else {
            const redCanvas = document.getElementById('canvas-Digit1')
            const redContext = redCanvas.getContext('2d')
            redContext.clearRect(0, 0, redCanvas.width, redCanvas.height)
            drawColor(redContext, redCanvas.width / 2 - 15, redCanvas.height / 2 - 15, Color.RED, this.redUses)

            const greenCanvas = document.getElementById('canvas-Digit2')
            const greenContext = greenCanvas.getContext('2d')
            greenContext.clearRect(0, 0, greenCanvas.width, greenCanvas.height)
            drawColor(greenContext, greenCanvas.width / 2 - 15, greenCanvas.height / 2 - 15, Color.GREEN, this.greenUses)

            const blueCanvas = document.getElementById('canvas-Digit3')
            const blueContext = blueCanvas.getContext('2d')
            blueContext.clearRect(0, 0, blueCanvas.width, blueCanvas.height)
            drawColor(blueContext, blueCanvas.width / 2 - 15, blueCanvas.height / 2 - 15, Color.BLUE, this.blueUses)

            const itemCanvas = document.getElementById('canvas-KeyE')
            const itemContext = itemCanvas.getContext('2d')
            itemContext.clearRect(0, 0, itemCanvas.width, itemCanvas.height)

            const item = this.heldItem
            if (item) {
                item.x = itemCanvas.width / 2 - 15
                item.y = itemCanvas.height / 2 - 15
                itemContext.save()
                item.draw(itemContext)
                itemContext.restore()
            } else {
                itemContext.font = '20px sans-serif'
                itemContext.textAlign = 'center'
                itemContext.textBaseline = 'middle'
                itemContext.fillStyle = 'black'
                itemContext.fillText('X', itemCanvas.width / 2, itemCanvas.height / 2)
            }

            const diagramCanvas = document.getElementById('canvas-color-diagram')
            const diagramContext = diagramCanvas.getContext('2d')

            diagramCanvas.width = diagramCanvas.clientWidth
            diagramCanvas.height = diagramCanvas.clientHeight

            const drawWidth = diagramCanvas.width
            const drawHeight = diagramCanvas.height

            const vennSize = Math.min(drawWidth, drawHeight)
            const vennX = (drawWidth - vennSize) / 2
            const vennY = (drawHeight - vennSize) / 2

            const vennRadius = vennSize * 0.3
            const vennCenterX = vennX + vennSize / 2
            const vennRedX = vennCenterX - vennRadius * 0.4
            const vennGreenX = vennCenterX + vennRadius * 0.4
            const vennBlueX = vennCenterX
            const vennTopY = vennY + vennSize * 0.42
            const vennBottomY = vennTopY + vennRadius * 0.6

            diagramContext.fillStyle = 'black'
            diagramContext.fillRect(vennX, vennY, vennSize, vennSize)

            diagramContext.globalCompositeOperation = 'lighter'

            diagramContext.fillStyle = Color.RED.drawColor
            diagramContext.beginPath()
            diagramContext.arc(vennRedX, vennTopY, vennRadius, 0, Math.PI * 2)
            diagramContext.fill()

            diagramContext.fillStyle = Color.GREEN.drawColor
            diagramContext.beginPath()
            diagramContext.arc(vennGreenX, vennTopY, vennRadius, 0, Math.PI * 2)
            diagramContext.fill()

            diagramContext.fillStyle = Color.BLUE.drawColor
            diagramContext.beginPath()
            diagramContext.arc(vennBlueX, vennBottomY, vennRadius, 0, Math.PI * 2)
            diagramContext.fill()

            diagramContext.globalCompositeOperation = 'source-over'
            diagramContext.strokeStyle = 'white'
            diagramContext.strokeRect(vennX, vennY, vennSize, vennSize)
        }
    }

    update(delta) {
        const width = this.level?.levelManager?.width
        const height = this.level?.levelManager?.height
        const gameBox = { x: 0, y: 0, width, height }

        if (!boxesIntersect(this, gameBox)) {
            this.requestRestart = true
        }

        if (this.requestUseItem) {
            this.requestUseItem = false
            this.useItem()
        }

        const change = (color) => !this.requestShift
            ? this.color.add(color)
            : this.color.subtract(color)

        const willCauseChange = (color) => !this.requestShift
            ? !this.color.intersects(color)
            : this.color.intersects(color)

        if (this.requestOne && this.redUses > 0 && willCauseChange(Color.RED)) {
            const newColor = change(Color.RED)
            this.level.onPlayerColorChange(this.color, newColor)
            this.color = newColor
            this.redUses--
        } else if (this.requestTwo && this.greenUses > 0 && willCauseChange(Color.GREEN)) {
            const newColor = change(Color.GREEN)
            this.level.onPlayerColorChange(this.color, newColor)
            this.color = newColor
            this.greenUses--
        } else if (this.requestThree && this.blueUses > 0 && willCauseChange(Color.BLUE)) {
            const newColor = change(Color.BLUE)
            this.level.onPlayerColorChange(this.color, newColor)
            this.color = newColor
            this.blueUses--
        }

        if (this.color === Color.BLACK) {
            this.color = Color.GRAY
        }
    }

    addUses(color) {
        if (color.intersects(Color.RED)) {
            this.redUses++
        }

        if (color.intersects(Color.GREEN)) {
            this.greenUses++
        }

        if (color.intersects(Color.BLUE)) {
            this.blueUses++
        }
    }

    removeUses(color) {
        if (color.intersects(Color.RED)) {
            if (this.redUses > 0) this.redUses--
        }

        if (color.intersects(Color.GREEN)) {
            if (this.greenUses > 0) this.greenUses--
        }

        if (color.intersects(Color.BLUE)) {
            if (this.blueUses > 0) this.blueUses--
        }
    }

    onCollide(other) {
        // Do nothing
    }

    toJSON() {
        return {}
    }

    setInputForKey(code, isPressed) {
        if (code === 'KeyA' || code === 'ArrowLeft') {
            this.requestLeft = isPressed
        } else if (code === 'KeyD' || code === 'ArrowRight') {
            this.requestRight = isPressed
        } else if (code === 'KeyW' || code === 'ArrowUp') {
            this.requestUp = isPressed
        } else if (code === 'KeyS' || code === 'ArrowDown') {
            this.requestDown = isPressed
        } else if (code === 'KeyE') {
            this.requestUseItem = isPressed
        } else if (code === 'KeyR') {
            this.requestRestart = isPressed
        } else if (code === 'Digit1') {
            this.requestOne = isPressed
        } else if (code === 'Digit2') {
            this.requestTwo = isPressed
        } else if (code === 'Digit3') {
            this.requestThree = isPressed
        } else if (code === 'ShiftLeft') {
            this.requestShift = isPressed
        }
    }

    onKeyDown(event) {
        if (this.ignoreInputs) return

        this.setInputForKey(event.code, true)
    }

    onKeyUp(event) {
        this.ignoreInputs = false

        this.setInputForKey(event.code, false)
    }

}
