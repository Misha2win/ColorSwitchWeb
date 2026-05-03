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

         const width = this.level?.levelManager?.width
         const height = this.level?.levelManager?.height

         const percent = (Math.tan(this.totalDelta / 2) + 1) / 2

         context.lineWidth = Math.min(this.width, this.height)
         context.strokeStyle = 'rgba(255, 255, 255, 1)'
         context.beginPath()
         context.moveTo(width * percent, (this.height - width) / 2)
         context.lineTo(width * percent - width, (this.height + width) / 2)
         context.stroke()
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

}
