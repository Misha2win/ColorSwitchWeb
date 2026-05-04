import { boxesIntersect } from '../math/PhysicsEngine.js'
import { darkenHex } from '../utility/Util.js'
import Color from './Color.js'
import Entity from './Entity.js'

export default class Player extends Entity {

    static coyoteTimeSeconds = 0.1

    constructor(x, y, eventListeners = true) {
        super(x, y, 20, 20)

        this.speed = 350
        this.jumpSpeed = 900
        this.yVelocity = 0

        this.requestLeft = false
        this.requestRight = false
        this.requestJump = false
        this.requestRestart = false
        this.requestUseItem = false

        this.redUses = 0
        this.greenUses = 0
        this.blueUses = 0

        this.ignoreInputs = false

        this.onGround = false

        this.coyoteTimeSeconds = Player.coyoteTimeSeconds
        this.timeSinceGrounded = 0
        this.canCoyoteJump = false

        this.heldItem = null

        this.mirror = null

        if (eventListeners) {
            window.addEventListener('keydown', (event) => this.onKeyDown(event))
            window.addEventListener('keyup', (event) => this.onKeyUp(event))
        }
    }

    canJump () {
        return this.onGround || (this.canCoyoteJump && this.timeSinceGrounded < this.coyoteTimeSeconds)
    }

    onJump() {
        this.canCoyoteJump = false
        this.onGround = false
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
        this.level?.createGhosts(color)
    }

    removeMirror() {
        this.mirror = null
    }

    restart() {
        this.mirror = null
        this.heldItem = null
        this.yVelocity = 0
        this.onGround = false

        this.redUses = 0
        this.greenUses = 0
        this.blueUses = 0

        this.requestLeft = false
        this.requestRight = false
        this.requestJump = false
        this.requestRestart = false
        this.requestShift = false
        this.requestUseItem = false

        this.coyoteTimeSeconds = Player.coyoteTimeSeconds
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
        if (this.color === Color.WHITE || this.color === Color.YELLOW) {
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
        }

        const invTop = 0

        const drawColor = (x, y, color, count) => {
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

        context.fillStyle = 'white'
        context.fillRect(5, invTop + 5, 40, 40)
        context.strokeRect(5, invTop + 5, 40, 40)
        drawColor(10, invTop + 10, Color.RED, this.redUses)

        context.fillStyle = 'white'
        context.fillRect(50, invTop + 5, 40, 40)
        context.strokeRect(50, invTop + 5, 40, 40)
        drawColor(55, invTop + 10, Color.GREEN, this.greenUses)

        context.fillStyle = 'white'
        context.fillRect(95, invTop + 5, 40, 40)
        context.strokeRect(95, invTop + 5, 40, 40)
        drawColor(100, invTop + 10, Color.BLUE, this.blueUses)

        const item = this.heldItem
        if (item) {
            item.x = invTop + 5
            item.y = 50
            context.save()
            item.draw(context)
            context.restore()
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

        if (!this.onGround) {
            this.timeSinceGrounded += delta
        } else {
            this.canCoyoteJump = true
            this.timeSinceGrounded = 0
        }

        const change = (color) => !this.requestShift
            ? this.color.add(color)
            : this.color.subtract(color)

        const willCauseChange = (color) => !this.requestShift
            ? !this.color.intersects(color)
            : this.color.intersects(color)

        if (this.requestOne && this.redUses > 0 && willCauseChange(Color.RED)) {
            this.color = change(Color.RED)
            this.level.onPlayerColorChange()
            this.redUses--
        } else if (this.requestTwo && this.greenUses > 0 && willCauseChange(Color.GREEN)) {
            this.color = change(Color.GREEN)
            this.level.onPlayerColorChange()
            this.greenUses--
        } else if (this.requestThree && this.blueUses > 0 && willCauseChange(Color.BLUE)) {
            this.color = change(Color.BLUE)
            this.level.onPlayerColorChange()
            this.blueUses--
        }

        if (this.color === Color.BLACK) {
            this.color = Color.GRAY
        }
    }

    addUses(color) {
        if (color.collidesWith(Color.RED)) {
            this.redUses++
        }

        if (color.collidesWith(Color.GREEN)) {
            this.greenUses++
        }

        if (color.collidesWith(Color.BLUE)) {
            this.blueUses++
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
        } else if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') {
            this.requestJump = isPressed
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
