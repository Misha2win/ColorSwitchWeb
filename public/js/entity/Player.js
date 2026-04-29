import { boxesIntersect } from '../math/PhysicsEngine.js'
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
        this.ignoreInputs = false

        this.onGround = false

        this.coyoteTimeSeconds = Player.coyoteTimeSeconds
        this.timeSinceGrounded = 0
        this.canCoyoteJump = false

        this.heldItem = null
        this.health = 1

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
        this.mirror.addHealth = (health) => this.addHealth(health)
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
        this.health = 1
        // this.ignoreInputs = this.requestRestart
        this.requestLeft = false
        this.requestRight = false
        this.requestJump = false
        this.requestRestart = false
        this.requestUseItem = false
        this.coyoteTimeSeconds = Player.coyoteTimeSeconds
        this.timeSinceGrounded = 0
        this.canCoyoteJump = false
    }

    useItem() {
        const item = this.heldItem
        if (!item) return

        item.onUse(this)
        this.level?.onPlayerUseItem(item)
    }

    removeItem() {
        this.heldItem = null
    }

    holdItem(item) {
        this.heldItem = item
    }

    addHealth(health) {
        this.health += health
    }

    draw(context) {
        context.fillStyle = this.color.drawColor
        context.fillRect(this.x, this.y, this.width, this.height)

        if (this.color === Color.WHITE) {
            context.strokeStyle = 'black'
            context.strokeRect(this.x, this.y, this.width, this.height)
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

        // Draw inventory
        context.fillStyle = 'rgba(255, 255, 255, 0.7)'
        context.fillRect(0, 0, 120, 95)
        context.font = '30px sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'top'
        context.fillStyle = 'black'
        context.fillText(`${Math.round(this.health)}/100`, 60, 10)

        context.fillStyle = 'white'
        context.strokeStyle = 'black'
        context.fillRect(40, 45, 40, 40)
        context.strokeRect(40, 45, 40, 40)

        const item = this.heldItem
        if (item) {
            item.x = 45
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

        if (this.health <= 0 || !boxesIntersect(this, gameBox)) {
            this.requestRestart = true
        } else if (this.health > 100) {
            this.health = 100
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
    }

    onCollide(other) {
        // Do nothing
    }

    toJSON() {
        return {}
    }

    onKeyDown(event) {
        if (this.ignoreInputs) return

        if (event.key === 'a' || event.key === 'ArrowLeft') {
            this.requestLeft = true
        } else if (event.key === 'd' || event.key === 'ArrowRight') {
            this.requestRight = true
        } else if (event.key === 'w' || event.key === 'ArrowUp' || event.key === ' ') {
            this.requestJump = true
        } else if (event.key === 'e') {
            this.requestUseItem = true
        } else if (event.key === 'r') {
            this.requestRestart = true
        }
    }

    onKeyUp(event) {
        this.ignoreInputs = false

        if (event.key === 'a' || event.key === 'ArrowLeft') {
            this.requestLeft = false
        } else if (event.key === 'd' || event.key === 'ArrowRight') {
            this.requestRight = false
        } else if (event.key === 'w' || event.key === 'ArrowUp' || event.key === ' ') {
            this.requestJump = false
        } else if (event.key === 'e') {
            this.requestUseItem = false
        }
    }

}
