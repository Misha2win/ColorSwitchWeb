import { boxesIntersect } from "../../math/PhysicsEngine.js";
import { darkenHex, lightenHex } from "../../utility/Util.js";
import Color from "../Color.js";
import Entity from "../Entity.js";
import { Beam } from "../obstacle/Prism.js";
import Player from "../Player.js";
import Platform from "./Platform.js";

export default class PhotonicPlatform extends Platform {

   constructor(x, y, width, height) {
      super(x, y, width, height)
      this.color = Color.GRAY

      this.totalDelta = 0
      this.chargers = []
   }

   update(delta) {
      this.totalDelta += delta
   }

   draw(context) {
      context.fillStyle = 'black'
      context.fillRect(this.x, this.y, this.width, this.height)

      const color = this.color === Color.GRAY ? Color.GRAY.drawColor : this.getDrawColor()

      context.fillStyle = color
      context.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2)

      if (this.color !== Color.GRAY) {
         context.beginPath()
         context.rect(this.x + 1, this.y + 1, this.width - 2, this.height - 2)
         context.clip()

         const lineWidth = Math.min(this.width, this.height)
         const lineSpeed = 350
         const travelDistance = this.width + this.height + lineWidth * 2
         const travelDuration = travelDistance / lineSpeed
         const cycleTime = this.totalDelta % (travelDuration + 1)

         if (cycleTime < travelDuration) {
            const linePosition = this.x + this.y - lineWidth + cycleTime * lineSpeed
            const lineLength = this.width + this.height + lineWidth * 2

            context.lineWidth = lineWidth
            context.strokeStyle = 'rgba(255, 255, 255, 1)'
            context.beginPath()
            context.moveTo(linePosition - (this.y - lineLength), this.y - lineLength)
            context.lineTo(linePosition - (this.y + this.height + lineLength), this.y + this.height + lineLength)
            context.stroke()
         }
      }
   }

   preparePhysics() {
      this.color = Color.GRAY

      const beams = []
      const photonics = []

      for (const entity of this.level?.entities) {
         if (entity === this) continue
         if (!(entity instanceof Beam) && !(entity instanceof PhotonicPlatform)) continue
         if (entity.color === Color.GRAY) continue
         if (!boxesIntersect(entity, this)) continue

         if (entity instanceof Beam)
            beams.push(entity)
         else if (entity instanceof PhotonicPlatform)
            photonics.push(entity)
      }

      this.chargers = []

      for (const beam of beams) {
         this.chargers.push(beam)
         this.color = this.color.add(beam.color)
      }

      for (const photonic of photonics) {
         const primary = photonic.chargers.some(charger => {
            return charger instanceof Beam || charger !== this
         })
         if (primary) {
            this.chargers.push(photonic)
            this.color = this.color.add(photonic.color)
         }
      }


   }

   toJSON() {
      return {
         type: this.type,
         x: this.x,
         y: this.y,
         width: this.width,
         height: this.height
      }
   }

   getProperties() {
      return [
         { name: 'x', type: 'number', step: 10 },
         { name: 'y', type: 'number', step: 10 },
         { name: 'width', type: 'number', min: 10, step: 10, roundTo: 10 },
         { name: 'height', type: 'number', min: 10, step: 10, roundTo: 10 }
      ]
   }

}
