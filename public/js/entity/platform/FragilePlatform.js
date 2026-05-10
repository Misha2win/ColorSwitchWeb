import { boxesIntersect } from "../../math/PhysicsEngine.js";
import Platform from "./Platform.js";

const CRACK_VARIANT_COUNT = 8
const CRACK_VARIANT_OFFSET = 4
const HORIZONTAL_STARTS = [0.18, 0.82, 0.24, 0.76, 0.14, 0.72, 0.3, 0.86]
const HORIZONTAL_ENDS = [0.62, 0.28, 0.7, 0.2, 0.56, 0.34, 0.78, 0.24]
const HORIZONTAL_BEND_XS = [0.36, 0.58, 0.44, 0.62, 0.3, 0.5, 0.68, 0.4]
const HORIZONTAL_BEND_YS = [0.34, 0.66, 0.48, 0.42, 0.58, 0.5, 0.64, 0.36]
const VERTICAL_STARTS = [0.82, 0.18, 0.88, 0.28, 0.12, 0.76, 0.36, 0.92]
const VERTICAL_ENDS = [0.26, 0.74, 0.34, 0.86, 0.48, 0.18, 0.8, 0.42]
const VERTICAL_BEND_XS = [0.34, 0.76, 0.48, 0.66, 0.24, 0.58, 0.72, 0.42]
const VERTICAL_BEND_YS = [0.34, 0.42, 0.56, 0.28, 0.62, 0.36, 0.48, 0.66]

export default class FragilePlatform extends Platform {

   constructor(x, y, width, height, color) {
      super(x, y, width, height, color)

      this.broken = false
      this.stoodOn = false
   }

   draw(context) {
      if (this.broken) return

      super.draw(context)

      context.beginPath()
      context.rect(this.x, this.y, this.width, this.height)
      context.clip()

      const platformVariant = Math.abs(Math.floor(this.x / 17) * 3 + Math.floor(this.y / 19) * 5) % CRACK_VARIANT_COUNT

      context.strokeStyle = this.color.hasPoorVisibility() ? 'gray' : 'rgba(255, 255, 255, 0.75)'
      context.lineWidth = 1.75
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()

      for (let i = 0; i < 2; i++) {
         const variant = (platformVariant + i * CRACK_VARIANT_OFFSET) % CRACK_VARIANT_COUNT
         const horizontalStartY = this.y + this.height * HORIZONTAL_STARTS[variant]
         const horizontalEndY = this.y + this.height * HORIZONTAL_ENDS[variant]

         context.moveTo(this.x, horizontalStartY)
         context.lineTo(this.x + this.width * HORIZONTAL_BEND_XS[variant], this.y + this.height * HORIZONTAL_BEND_YS[variant])
         context.lineTo(this.x + this.width, horizontalEndY)
      }

      for (let i = 0; i < 2; i++) {
         const variant = (platformVariant + i * CRACK_VARIANT_OFFSET) % CRACK_VARIANT_COUNT
         const verticalStartX = this.x + this.width * VERTICAL_STARTS[variant]
         const verticalEndX = this.x + this.width * VERTICAL_ENDS[variant]

         context.moveTo(verticalStartX, this.y)
         context.lineTo(this.x + this.width * VERTICAL_BEND_XS[variant], this.y + this.height * VERTICAL_BEND_YS[variant])
         context.lineTo(verticalEndX, this.y + this.height)
      }

      context.stroke()
   }

   update(delta) {
      if (this.broken) return

      const player = this.level?.player
      if (!player) return

      if (!this.canCollideWith(player)) return

      if (boxesIntersect({ ...this, y: this.y - 1 }, player)) {
         this.stoodOn = true
      } else if (this.stoodOn) {
         this.broken = true
      }
   }

   canCollideWith(other) {
      return !this.broken && this.color.collidesWith(other.color)
   }

}
