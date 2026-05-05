import abstractError from "../../Abstract.js"
import { lightenHex } from "../../utility/Util.js"
import Color from "../Color.js"
import Entity from "../Entity.js"
import Player from "../Player.js"
import Obstacle from "./Obstacle.js"

export default class Element extends Obstacle {

    constructor(x, y, width, height, color = Color.RED, health = -1) {
        super(x, y, width, height, color)

        this.totalDelta = 0
        this.drawColor = this.color.drawColor

        this.collisionHealth = health
    }

    update(delta) {
        this.totalDelta += delta

        const sin = 0.5 + (Math.sin(this.totalDelta * 2) + 1) / 7
        const clean = this.color.drawColor.replace('#', '')

        const red = parseInt(clean.slice(0, 2), 16)
        const green = parseInt(clean.slice(2, 4), 16)
        const blue = parseInt(clean.slice(4, 6), 16)

        const clamp = value => Math.max(0, Math.min(255, Math.round(value)))
        const newRed = clamp(red * sin)
        const newGreen = clamp(green * sin)
        const newBlue = clamp(blue * sin)

        this.drawColor =  '#' +
            newRed.toString(16).padStart(2, '0') +
            newGreen.toString(16).padStart(2, '0') +
            newBlue.toString(16).padStart(2, '0')
    }

    draw(context) {
        context.fillStyle = this.drawColor

        if (this.level) {
            const player = this.level.player
            if (player && !this.canCollideWith(player)) {
                context.fillStyle = lightenHex(this.drawColor, 0.8)
            }
        }

        context.fillRect(this.x, this.y, this.width, this.height)
    }

    canCollideWith(other) {
        return other.color !== this.color
    }

    onCollide(other) {
        if (!(other instanceof Player)) return

        other.addHealth(this.collisionHealth)
    }

    toJSON() {
        return {
            ...super.toJSON(),
            health: this.collisionHealth
        }
    }

    getProperties() {
        return [
            ...super.getProperties(),
            { name: 'health', label: 'Health Change', type: 'number', step: 0.1, get: entity => entity.collisionHealth, set: (entity, value) => { entity.collisionHealth = value } }
        ]
    }

}
