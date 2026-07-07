import { boxesIntersect, pointIntersectsBox } from "../../math/PhysicsEngine.js"
import Vector from "../../math/Vector.js"
import { lightenHex } from "../../utility/Util.js"
import Color from "../Color.js"
import Entity from "../Entity.js"
import ColorChanger from "../item/ColorChanger.js"
import ColorMixer from "../item/ColorMixer.js"
import PhotonicPlatform from "../platform/PhotonicPlatform.js"
import Platform from "../platform/Platform.js"
import Player from "../Player.js"
import Element from "./Element.js"
import Obstacle from "./Obstacle.js"
import Beam, { Direction }  from "./Beam.js"
import Portal from "./Portal.js"

export default class Prism extends Obstacle {

    static MAX_BEAMS = 10

    constructor(x, y, color = Color.RED, direction = 'RIGHT') {
        super(x, y, 20, 20, color)
        this.direction = Direction.fromString(direction)

        switch (this.direction) {
            case Direction.UP: {
                this.point = new Vector(this.x + this.width / 2, this.y + this.height + 5)
                break
            }
            case Direction.RIGHT: {
                this.point = new Vector(this.x - 5, this.y + this.height / 2)
                break
            }
            case Direction.DOWN: {
                this.point = new Vector(this.x + this.width / 2, this.y - 5)
                break
            }
            case Direction.LEFT: {
                this.point = new Vector(this.x + this.width + 5, this.y + this.height / 2)
                break
            }
        }

        this.beams = []
    }

    canCollideWith(other) {
        return other instanceof Player
    }

    onCollide(other) {
        if (this.color == Color.BLACK || this.color === Color.GRAY) return
        other.color = this.color
    }

    onPlayerColorChange(old, current) {
        if (!boxesIntersect(this, this.level?.player)) return

        const added = current.subtract(old)
        const removed = old.subtract(current)

        this.color = this.color.add(added).subtract(removed)
    }

    update(delta) {
        if (this.beams.length <= 0) {
            this.beams = Array.from(
                { length: Prism.MAX_BEAMS },
                (_, index) => new Beam(this, index)
            )
            this.beams.forEach(beam => this.level.add(beam))
        }

        this.beams[0].color = this.color
    }

    draw(context) {
        context.fillStyle = lightenHex(this.color.drawColor)

        context.beginPath()

        let point = []

        switch (this.direction) {
            case Direction.UP: {
                point = [this.x + this.width / 2, this.y]

                context.moveTo(this.x + this.width / 2, this.y)
                context.lineTo(this.x + this.width, this.y + this.height)
                context.lineTo(this.x, this.y + this.height)
                break
            }
            case Direction.RIGHT: {
                point = [this.x + this.width, this.y + this.height / 2]

                context.moveTo(this.x, this.y)
                context.lineTo(this.x + this.width, this.y + this.height / 2)
                context.lineTo(this.x, this.y + this.height)
                break
            }
            case Direction.DOWN: {
                point = [this.x + this.width / 2, this.y + this.height]

                context.moveTo(this.x, this.y)
                context.lineTo(this.x + this.width, this.y)
                context.lineTo(this.x + this.width / 2, this.y + this.height)
                break
            }
            case Direction.LEFT: {
                point = [this.x, this.y + this.height / 2]

                context.moveTo(this.x + this.width, this.y)
                context.lineTo(this.x + this.width, this.y + this.height)
                context.lineTo(this.x, this.y + this.height / 2)
                break
            }
        }

        context.closePath()
        context.fill()

        if (this.color.hasPoorVisibility()) {
            context.strokeStyle = 'black'
            context.stroke()
        }

        context.ellipse(point[0], point[1], 3, 3, 0, 0, Math.PI * 2)
        context.fill()
    }

    toJSON() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            color: this.color.name,
            direction: Direction.toString(this.direction)
        }
    }

    getProperties() {
        return [
            ...this.getPositionProps(),
            { name: 'color', type: 'color' },
            { name: 'direction', type: 'select', options: ['UP', 'RIGHT', 'DOWN', 'LEFT'], get: entity => Direction.toString(entity.direction), set: (entity, value) => { entity.direction = Direction.fromString(value) } }
        ]
    }

}
