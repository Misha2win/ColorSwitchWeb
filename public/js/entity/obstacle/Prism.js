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

export default class Prism extends Obstacle {

    static MAX_BEAMS = 10

    constructor(x, y, color = Color.RED, direction = 'RIGHT') {
        super(x, y, 20, 20, color)

        this.direction = Direction.fromString(direction)

        this.point = (() => {
            switch (this.direction) {
                case Direction.UP: {
                    return new Vector(this.x + this.width / 2, this.y + this.height + 5)
                }
                case Direction.RIGHT: {
                    return new Vector(this.x - 5, this.y + this.height / 2)
                }
                case Direction.DOWN: {
                    return new Vector(this.x + this.width / 2, this.y - 5)
                }
                case Direction.LEFT: {
                    return new Vector(this.x + this.width + 5, this.y + this.height / 2)
                }
            }
        })()

        this.distanceComparer = (() => {
            switch (this.direction) {
                case Direction.UP: {
                    return (a, b) => (b.y + b.height) - (a.y + a.height)
                }
                case Direction.RIGHT: {
                    return (a, b) => a.x - b.x
                }
                case Direction.DOWN: {
                    return (a, b) => a.y - b.y
                }
                case Direction.LEFT: {
                    return (a, b) => (b.x + b.width) - (a.x + a.width)
                }
            }
        })()

        this.beams = []
    }

    canCollideWith(other) {
        return false
    }

    preparePhysics(delta) {}

    onCollide(other) {}

    onPlayerColorChange(old, current) {
        if (!boxesIntersect(this, this.level?.player)) return

        const added = current.subtract(old)
        const removed = old.subtract(current)

        this.color = this.color.add(added).subtract(removed)
    }

    resolvePhysics() {
        if (this.point) {
            for (const platform of this.level.blockers) {
                if (!(platform instanceof PhotonicPlatform)) continue
                if (!pointIntersectsBox(this.point, platform)) continue

                if (platform.color === Color.GRAY) {
                    this.color = Color.BLACK
                } else {
                    this.color = platform.color
                }
            }
        }

        if (this.beams[0]) {
            this.beams[0].color = this.color
            this.beams.slice(1).forEach(beam => {
                beam.color = Color.BLACK
                beam.width = 0
                beam.height = 0
            })
        }

        const canCollideWith = (beam, entity) => {
            if (entity instanceof Beam) {
                return beam.prism !== entity.prism && beam.color != entity.color
            } else if (entity instanceof Platform) {
                return entity.canCollideWith(beam)
            } else if (entity instanceof ColorChanger) {
                return beam.color != entity.color
            } else if (entity instanceof Element) {
                return beam.color.collidesWith(entity.color)
            } else if (entity instanceof Prism) {
                return true
            }

            return false
        }

        for (let i = 0; i < this.beams.length; i++) {
            const beam = this.beams[i]
            if (!beam) break
            beam.resetBeam()
            if (beam.color === Color.BLACK) break

            const entities = [...this.level.entities]
            entities.splice(entities.indexOf(beam), 1)
            for (const closest of entities.sort(this.distanceComparer)) {
                if (!canCollideWith(beam, closest)) continue
                if (!boxesIntersect(beam, closest)) continue

                if (closest instanceof Platform && !(closest instanceof PhotonicPlatform)) {
                    const mixed = beam.color.add(closest.color)
                    if (beam.color !== mixed) {
                        beam.shorten(closest)
                        beam.partition(mixed)
                    } else if (closest.color === Color.BLACK) {
                        beam.shorten(closest)
                    }
                } else if (closest instanceof Beam) {
                    const mixed = beam.color.add(closest.color)
                    if (beam.color !== mixed) {
                        beam.shorten(closest)
                        beam.partition(mixed)
                    }
                } else if (closest instanceof ColorChanger) {
                    beam.shorten(closest)
                    beam.partition(closest.color)
                } else if (closest instanceof Element) {
                    beam.shorten(closest)
                    const filtered = beam.color === Color.BLACK ? Color.BLACK : beam.color.subtract(closest.color)
                    if (filtered !== Color.BLACK && closest.color !== Color.BLACK && closest.color !== Color.GRAY) beam.partition(filtered)
                } else if (closest instanceof Prism) {
                    beam.shorten(closest)
                }
            }
        }
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
            { name: 'x', type: 'number', step: 10 },
            { name: 'y', type: 'number', step: 10 },
            { name: 'color', type: 'color' },
            { name: 'direction', type: 'select', options: ['UP', 'RIGHT', 'DOWN', 'LEFT'], get: entity => Direction.toString(entity.direction), set: (entity, value) => { entity.direction = Direction.fromString(value) } }
        ]
    }

}