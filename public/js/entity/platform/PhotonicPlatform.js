import { boxesIntersect } from "../../math/PhysicsEngine.js";
import { darkenHex, lightenHex } from "../../utility/Util.js";
import Color from "../Color.js";
import Entity from "../Entity.js";
import Beam from "../obstacle/Beam.js";
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
      context.strokeStyle = 'black'
      const lineWidth = context.lineWidth
      context.strokeRect(this.x + lineWidth / 2, this.y + lineWidth / 2, this.width - lineWidth, this.height - lineWidth)

      const color = this.getDrawColor()

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
         const cycleTime = this.totalDelta % (travelDuration + 0.25)

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
      return this.getBoxProps()
   }

}
