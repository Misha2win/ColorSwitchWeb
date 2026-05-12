import abstractError from "../../Abstract.js"
import { lightenHex } from "../../utility/Util.js"
import Color from "../Color.js"
import Entity from "../Entity.js"
import Player from "../Player.js"
import Obstacle from "./Obstacle.js"

export default class Element extends Obstacle {

    constructor(x, y, width, height, color = Color.RED) {
        super(x, y, width, height, color)

        this.totalDelta = 0
        this.drawColor = this.color.drawColor
    }

    update(delta) {
        this.totalDelta += delta

        const sin = 0.5 + (Math.sin(this.totalDelta * 10) + 1) / 7
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
        context.fillStyle = this.color.drawColor

        if (this.level?.player) {
            context.fillStyle = this.drawColor
        }

        context.fillRect(this.x, this.y, this.width, this.height)
    }

    canCollideWith(other) {
        return true
    }

    onCollide(other) {
        if (!(other instanceof Player)) return

        const newColor = other.color.subtract(this.color)
        if (newColor !== other.color) other.color = newColor

        other.removeUses(this.color)
    }

}
