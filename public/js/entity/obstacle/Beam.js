import Color from "../Color.js"
import Entity from "../Entity.js"
import Prism from "./Prism.js"
import Player from "../Player.js"
import { boxesIntersect, pointIntersectsBox } from "../../math/PhysicsEngine.js"
import Platform from "../platform/Platform.js"
import ColorChanger from "../item/ColorChanger.js"
import Element from "./Element.js"
import Portal from "./Portal.js"

export default class Beam extends Entity {
   static BEAM_WIDTH = 5
   static MAX_LENGTH = 1000

   constructor(source, index) {
      super(source.x, source.y, 0, 0)

      this.source = source
      this.color = Color.BLACK
      this.direction = source.direction
      this.index = index
      this.positionOverride = null
   }

   clearDownstreamBeams() {
      for (let i = this.index + 1; i < this.beams.length; i++) {
         beam[i].color = Color.BLACK
         beam[i].reset()
      }
   }

   reset() {
      if (this.color === Color.BLACK) {
         this.width = 0
         this.height = 0
         return
      }

      if (this.positionOverride) {
         switch (this.direction) {
            case Direction.UP: {
                  this.x = this.positionOverride.x - Beam.BEAM_WIDTH / 2
                  this.y = this.positionOverride.y - Beam.MAX_LENGTH
                  this.width = Beam.BEAM_WIDTH
                  this.height = Beam.MAX_LENGTH
                  break
            }
            case Direction.RIGHT: {
                  this.x = this.positionOverride.x
                  this.y = this.positionOverride.y - Beam.BEAM_WIDTH / 2
                  this.width = Beam.MAX_LENGTH
                  this.height = Beam.BEAM_WIDTH
                  break
            }
            case Direction.DOWN: {
                  this.x = this.positionOverride.x - Beam.BEAM_WIDTH / 2
                  this.y = this.positionOverride.y
                  this.width = Beam.BEAM_WIDTH
                  this.height = Beam.MAX_LENGTH
                  break
            }
            case Direction.LEFT: {
                  this.x = this.positionOverride.x - Beam.MAX_LENGTH
                  this.y = this.positionOverride.y - Beam.BEAM_WIDTH / 2
                  this.width = Beam.MAX_LENGTH
                  this.height = Beam.BEAM_WIDTH
                  break
            }
         }
      } else {
         const prevBeam = this.source.beams[this.index - 1]

         switch (this.direction) {
            case Direction.UP: {
                  this.x = this.source.x + this.source.width / 2 - Beam.BEAM_WIDTH / 2
                  this.y = (prevBeam ? prevBeam.y : this.source.y) - Beam.MAX_LENGTH
                  this.width = Beam.BEAM_WIDTH
                  this.height = Beam.MAX_LENGTH
                  break
            }
            case Direction.RIGHT: {
                  this.x = (prevBeam ? prevBeam.x + prevBeam.width : this.source.x + this.source.width)
                  this.y = this.source.y + this.source.height / 2 - Beam.BEAM_WIDTH / 2
                  this.width = Beam.MAX_LENGTH
                  this.height = Beam.BEAM_WIDTH
                  break
            }
            case Direction.DOWN: {
                  this.x = this.source.x + this.source.width / 2 - Beam.BEAM_WIDTH / 2
                  this.y = (prevBeam ? prevBeam.y + prevBeam.height : this.source.y + this.source.height)
                  this.width = Beam.BEAM_WIDTH
                  this.height = Beam.MAX_LENGTH
                  break
            }
            case Direction.LEFT: {
                  this.x = (prevBeam ? prevBeam.x : this.source.x) - Beam.MAX_LENGTH
                  this.y = this.source.y + this.source.height / 2 - Beam.BEAM_WIDTH / 2
                  this.width = Beam.MAX_LENGTH
                  this.height = Beam.BEAM_WIDTH
                  break
            }
         }
      }
   }

   shorten(entity, center = false) {
      const beams = this.source.beams
      beams.slice(this.index + 1).forEach(beam => {
         beam.color = Color.BLACK
         beam.width = 0
         beam.height = 0
      })

      if (center) {
         entity = {
            x: entity.x + entity.width / 2,
            y: entity.y + entity.height / 2,
            width: 0,
            height: 0
         }
      }

      const prevBeam = beams[this.index - 1]

      switch (this.direction) {
         case Direction.UP: {
               this.height = (prevBeam ? this.height + this.y : this.source.y) - (entity.y + entity.height)
               this.y = entity.y + entity.height
               break
         }
         case Direction.RIGHT: {
               this.width = entity.x - (prevBeam ? this.x : this.source.x + this.source.width)
               break
         }
         case Direction.DOWN: {
               this.height = entity.y - (prevBeam ? this.y : this.source.y + this.source.height)
               break
         }
         case Direction.LEFT: {
               this.width = (prevBeam ? this.width + this.x : this.source.x) - (entity.x + entity.width)
               this.x = entity.x + entity.width
               break
         }
      }
   }

   canCollideWith(other) {
      if (other instanceof Beam) {
            return this.prism !== other.prism && this.color != other.color
      } else if (other instanceof Platform) {
            return !other.color.collidesWith(this.color) || other.color === Color.BLACK
      } else if (other instanceof ColorChanger) {
            return this.color != other.color
      } else if (other instanceof Element) {
            return this.color.collidesWith(other.color)
      } else if (other instanceof Prism) {
            return true
      } else if (other instanceof Portal) {
            return other.destination !== null && !pointIntersectsBox(this, other) // FIXME
      }

      return other instanceof Player
   }

   onCollide(other) {
      if (this.color === Color.BLACK) return

      if (other instanceof Platform) {
         const mixed = this.color.add(other.color)
         if (this.color !== mixed) {
            this.shorten(other)
            this.partition(mixed)
         } else if (other.color === Color.BLACK) {
            this.shorten(other)
         }
      } else if (other instanceof ColorChanger) {
         this.shorten(other)
         this.partition(other.color)
      } else if (other instanceof Element) {
         this.shorten(other)
         const filtered = this.color === Color.BLACK ? Color.BLACK : this.color.subtract(other.color)
         if (filtered !== Color.BLACK && other.color !== Color.BLACK && other.color !== Color.GRAY) this.partition(filtered)
      } else if (other instanceof Prism) {
         this.shorten(other)
      } else if (other instanceof Portal) {
         this.shorten(other, true)
         const destination = other.destination
         this.partition(this.color, { x: destination.x + destination.width / 2, y: destination.y + destination.height / 2 })
         other.color = this.color
         destination.color = this.color
      } else if (other instanceof Player) {
         other.color = this.color.add(other.color)
      }
   }

   partition(color, positionOverride = null) {
      if (this.index + 1 >= Prism.MAX_BEAMS) return

      const beamNext = this.source.beams[this.index + 1]
      beamNext.color = color
      beamNext.positionOverride = positionOverride
      beamNext.reset()
   }

   onPlayerColorChange(old, current) {
      if (!boxesIntersect(this, this.level?.player)) return

      const added = current.subtract(old)
      const removed = old.subtract(current)

      this.source.color = this.source.color.add(added).subtract(removed)
   }

   update(delta) {}

   draw(context) {
      context.fillStyle = this.color.drawColor
      context.fillRect(this.x, this.y, this.width, this.height)

      if (this.color.hasPoorVisibility()) {
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
