import { boxesIntersect } from "../../math/PhysicsEngine.js";
import { lightenHex } from "../../utility/Util.js";
import Entity from "../Entity.js";
import Player from "../Player.js";
import Platform from "./Platform.js";

export default class FragilePlatform extends Platform {

   constructor(x, y, width, height, color) {
      super(x, y, width, height, color)

      this.broken = false
      this.stoodOn = false
   }

   draw(context) {
      if (this.broken) return

      super.draw(context)

      context.strokeStyle = 'gray'
      context.beginPath()
      context.moveTo(this.x, this.y)
      context.lineTo(this.x + this.width, this.y + this.height)
      context.moveTo(this.x + this.width, this.y)
      context.lineTo(this.x, this.y + this.height)
      context.stroke()
   }

   update(delta) {
      if (this.broken) return

      const player = this.level?.player
      if (!player) return

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
