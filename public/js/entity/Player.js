import Color from './Color.js'
import Entity from './Entity.js'

export default class Player extends Entity {

    constructor(x, y, eventListeners = true) {
        super(x, y, 20, 20)

        this.speed = 350
        this.jumpSpeed = 900
        this.yVelocity = 0

        this.requestLeft = false
        this.requestRight = false
        this.requestJump = false
        this.requestRestart = false

        this.onGround = false

        this.heldItem = null
        this.health = 1

        this.mirror = null

        if (eventListeners) {
            window.addEventListener('keydown', (event) => this.onKeyDown(event))
            window.addEventListener('keyup', (event) => this.onKeyUp(event))
        }
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
            context.save()
            context.lineWidth = 3
            context.lineCap = 'round'
            context.lineJoin = 'round'
            context.beginPath()
            context.moveTo(this.x + 5, this.y - 10)
            context.lineTo(this.x + 10, this.y - 5)
            context.lineTo(this.x + 15, this.y - 10)
            context.stroke()
            context.restore()

            context.fillStyle = mirror.color.drawColor
            context.fillRect(gameWidth - this.x - this.width, this.y, this.width, this.height)

            context.strokeStyle = 'gray'
            context.beginPath()
            context.moveTo(gameWidth / 2, 0)
            context.lineTo(gameWidth / 2, gameHeight)
            context.stroke()
        }
    }

    update(delta) {
        if (this.health <= 0) {
            this.requestRestart = true
        }

        if (this.requestUseItem) {
            this.requestUseItem = false
            this.useItem()
        }
    }

    onCollide(other) {
        // Do nothing
    }

    toJSON() {
        return {}
    }

    onKeyDown(event) {
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
