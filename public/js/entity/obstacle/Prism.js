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

export default class Prism extends Obstacle {

    static MAX_BEAMS = 10

    constructor(x, y, color, direction) {
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

        this.beams = []
    }

    canCollideWith(other) {
        return false
    }

    preparePhysics(delta) {}

    onCollide(other) {}

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
                return entity.color === Color.GRAY || entity.canCollideWith(beam)
            } else if (entity instanceof ColorChanger) {
                return beam.color != entity.color
            } else if (entity instanceof Element) {
                return !beam.color.collidesWith(entity.color)
            }

            return false
        }

        const comparer = (() => {
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

        for (let i = 0; i < this.beams.length; i++) {
            const beam = this.beams[i]
            if (!beam) break
            beam.resetBeam()
            if (beam.color === Color.BLACK) break

            const entities = [...this.level.entities]
            entities.splice(entities.indexOf(beam), 1)
            for (const closest of entities.sort(comparer)) {
                if (!canCollideWith(beam, closest)) continue
                if (!boxesIntersect(beam, closest)) continue

                if (closest instanceof Platform && !(closest instanceof PhotonicPlatform)) {
                    beam.shorten(closest)
                    const filtered = beam.color === Color.BLACK ? Color.BLACK : beam.color.subtract(closest.color)
                    if (filtered !== Color.BLACK && closest.color !== Color.BLACK && closest.Color !== Color.GRAY) beam.partition(filtered)
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
                    const mixed = beam.color.add(closest.color)
                    if (beam.color !== mixed) {
                        beam.shorten(closest)
                        beam.partition(mixed)
                    }
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

        switch (this.direction) {
            case Direction.UP: {
                context.moveTo(this.x + this.width / 2, this.y)
                context.lineTo(this.x + this.width, this.y + this.height)
                context.lineTo(this.x, this.y + this.height)
                break
            }
            case Direction.RIGHT: {
                context.moveTo(this.x, this.y)
                context.lineTo(this.x + this.width, this.y + this.height / 2)
                context.lineTo(this.x, this.y + this.height)
                break
            }
            case Direction.DOWN: {
                context.moveTo(this.x, this.y)
                context.lineTo(this.x + this.width, this.y)
                context.lineTo(this.x + this.width / 2, this.y + this.height)
                break
            }
            case Direction.LEFT: {
                context.moveTo(this.x + this.width, this.y)
                context.lineTo(this.x + this.width, this.y + this.height)
                context.lineTo(this.x, this.y + this.height / 2)
                break
            }
        }

        context.closePath()
        context.fill()

        if (this.color === Color.WHITE) {
            context.strokeStyle = 'black'
            context.stroke()
        }
    }

}

export class Beam extends Entity {
    static BEAM_WIDTH = 5
    static MAX_LENGTH = 1000

    constructor(prism, index) {
        super(prism.x, prism.y, 0, 0)

        this.prism = prism
        this.color = Color.BLACK
        this.direction = prism.direction
        this.index = index
    }

    resetBeam() {
        if (this.color === Color.BLACK) {
            this.width = 0
            this.height = 0
            return
        }

        const prevBeam = this.prism.beams[this.index - 1]

        switch (this.direction) {
            case Direction.UP: {
                this.x = this.prism.x + this.prism.width / 2 - Beam.BEAM_WIDTH / 2
                this.y = (prevBeam ? prevBeam.y : this.prism.y + this.prism.height / 2) - Beam.MAX_LENGTH
                this.width = Beam.BEAM_WIDTH
                this.height = Beam.MAX_LENGTH
                break
            }
            case Direction.RIGHT: {
                this.x = (prevBeam ? prevBeam.x + prevBeam.width : this.prism.x + this.prism.width / 2)
                this.y = this.prism.y + this.prism.height / 2 - Beam.BEAM_WIDTH / 2
                this.width = Beam.MAX_LENGTH
                this.height = Beam.BEAM_WIDTH
                break
            }
            case Direction.DOWN: {
                this.x = this.prism.x + this.prism.width / 2 - Beam.BEAM_WIDTH / 2
                this.y = (prevBeam ? prevBeam.y + prevBeam.height : this.prism.y + this.prism.height / 2)
                this.width = Beam.BEAM_WIDTH
                this.height = Beam.MAX_LENGTH
                break
            }
            case Direction.LEFT: {
                this.x = (prevBeam ? prevBeam.x : this.prism.x + this.prism.width / 2) - Beam.MAX_LENGTH
                this.y = this.prism.y + this.prism.height / 2 - Beam.BEAM_WIDTH / 2
                this.width = Beam.MAX_LENGTH
                this.height = Beam.BEAM_WIDTH
                break
            }
        }
    }

    shorten(entity) {
        const beams = this.prism.beams
        beams.slice(this.index + 1).forEach(beam => {
            beam.color = Color.BLACK
            beam.width = 0
            beam.height = 0
        })

        const prevBeam = beams[this.index - 1]

        switch (this.direction) {
            case Direction.UP: {
                this.height = (prevBeam ? this.height + this.y : this.prism.height / 2 + this.prism.y) - (entity.y + entity.height)
                this.y = entity.y + entity.height
                break
            }
            case Direction.RIGHT: {
                this.width = entity.x - (prevBeam ? this.x : this.prism.x + this.prism.width / 2)
                break
            }
            case Direction.DOWN: {
                this.height = entity.y - (prevBeam ? this.y : this.prism.y + this.prism.height / 2)
                break
            }
            case Direction.LEFT: {
                this.width = (prevBeam ? this.width + this.x : this.prism.width / 2 + this.prism.x) - (entity.x + entity.width)
                this.x = entity.x + entity.width
                break
            }
        }
    }

    canCollideWith(other) {
        return other instanceof Player
    }

    onCollide(other) {
        if (this.color === Color.GRAY || this.color === Color.BLACK) return
        if (!(other instanceof Player)) return

        other.color = this.color
    }

    partition(color) {
        if (this.index + 1 >= Prism.MAX_BEAMS) return

        const beamNext = this.prism.beams[this.index + 1]
        beamNext.color = color
    }

    onPlayerColorChange() {
        const player = this.level?.player
        if (!player) return
        if (!boxesIntersect(player, this)) return

        const added = player.color.subtract(this.color)
        const removed = this.color.subtract(player.color)

        const newColor = this.prism.color.add(added).subtract(removed)
        this.prism.color = newColor
    }

    update(delta) {}

    draw(context) {
        context.fillStyle = this.color.drawColor
        context.fillRect(this.x, this.y, this.width, this.height)

        if (this.color === Color.WHITE) {
            context.strokeStyle = 'black'
            context.strokeRect(this.x, this.y, this.width, this.height)
        }
    }

}

export class Direction {

    static #directions = Object.freeze({
        UP: 0,
        RIGHT: 1,
        DOWN: 2,
        LEFT: 3
    })

    static #reverse = Object.freeze(
        Object.fromEntries(
            Object.entries(Direction.#directions).map(([key, value]) => [value, key])
        )
    )

    static UP = Direction.#directions.UP
    static RIGHT = Direction.#directions.RIGHT
    static DOWN = Direction.#directions.DOWN
    static LEFT = Direction.#directions.LEFT

    static fromString(str) {
        if (typeof str !== 'string') {
            throw new Error('Direction must be a string')
        }

        const value = Direction.#directions[str.toUpperCase()]
        if (value == null) {
            throw new Error(`Invalid direction: ${str}`)
        }

        return value
    }

    static toString(value) {
        const result = Direction.#reverse[value]
        if (result == null) {
            throw new Error(`Invalid direction value: ${value}`)
        }
        return result
    }

}
