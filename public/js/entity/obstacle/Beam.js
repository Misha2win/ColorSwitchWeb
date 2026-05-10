import Color from "../Color.js"
import Entity from "../Entity.js"
import Prism from "./Prism.js"
import Player from "../Player.js"
import { boxesIntersect } from "../../math/PhysicsEngine.js"

export default class Beam extends Entity {
   static BEAM_WIDTH = 5
   static MAX_LENGTH = 1000

   constructor(source, index) {
      super(source.x, source.y, 0, 0)

      this.source = source
      this.color = Color.BLACK
      this.direction = source.direction
      this.index = index
   }

   resetBeam() {
      if (this.color === Color.BLACK) {
         this.width = 0
         this.height = 0
         return
      }

      const prevBeam = this.source.beams[this.index - 1]

      switch (this.direction) {
         case Direction.UP: {
               this.x = this.source.x + this.source.width / 2 - Beam.BEAM_WIDTH / 2
               this.y = (prevBeam ? prevBeam.y : this.source.y + this.source.height / 2) - Beam.MAX_LENGTH
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

   shorten(entity) {
      const beams = this.source.beams
      beams.slice(this.index + 1).forEach(beam => {
         beam.color = Color.BLACK
         beam.width = 0
         beam.height = 0
      })

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
      return other instanceof Player
   }

   onCollide(other) {
      if (this.color === Color.GRAY || this.color === Color.BLACK) return
      if (!(other instanceof Player)) return

      other.color = this.color.add(other.color)
   }

   partition(color) {
      if (this.index + 1 >= Prism.MAX_BEAMS) return

      const beamNext = this.source.beams[this.index + 1]
      beamNext.color = color
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
