import Color from "../Color.js"
import Player from "../Player.js"
import Obstacle from "./Obstacle.js"
import { boxesIntersect } from "../../math/PhysicsEngine.js"
import { darkenHex } from "../../utility/Util.js"

export default class Portal extends Obstacle {

    constructor(x, y, link = 0) {
        super(x, y, 20, 20)
        this.color = Color.GRAY

        this.link = link

        this.destination = null
        this.cooldown = null
        this.shiftTimer = 0

        this.drawX = x
        this.drawY = y
        this.drawWidth = 20
        this.drawHeight = 20
    }

    update(delta) {
        if (this.level && !this.destination) {
            this.level.triggers.forEach(entity => {
                if (entity instanceof Portal && entity.link === this.link && entity !== this) {
                    this.destination = entity
                }
            })
        }

        if (this.cooldown !== null) {
            if (!boxesIntersect(this, this.cooldown)) this.cooldown = null
        }

        this.shiftTimer += delta

        const amp = 1
        const per = 10

        const sin = amp * (Math.sin(this.shiftTimer * per) + 1)
        const cos = amp * (Math.cos(this.shiftTimer * per) + 1)

        this.drawWidth = this.width - cos * 2
        this.drawHeight = this.height - sin * 2
    }

    draw(context) {
        context.fillStyle = this.color.hasPoorVisibility() ? 'black' : darkenHex(this.color.drawColor, 0.5)
        context.beginPath()
        context.ellipse(
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.drawWidth / 2,
            this.drawHeight / 2,
            0, 0, Math.PI * 2
        )
        context.fill()

        context.fillStyle = this.color.drawColor
        context.beginPath()
        context.ellipse(
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.drawWidth / 2 - 1,
            this.drawHeight / 2 - 1,
            0, 0, Math.PI * 2
        )
        context.fill()
    }

    canCollideWith(other) {
        return other instanceof Player
    }

    onCollide(other) {
        if (!(other instanceof Player)) return
        if (!this.destination) return
        if (this.cooldown !== null) return

        this.cooldown = other
        this.destination.cooldown = other

        other.x = this.destination.x
        other.y = this.destination.y
    }

    toJSON() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            link: this.link
        }
    }

    getProperties() {
        return [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
            { name: 'link', type: 'number' },
        ]
    }

}
