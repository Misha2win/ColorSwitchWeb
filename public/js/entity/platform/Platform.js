import { lightenHex } from "../../utility/Util.js";
import Entity from "../Entity.js";
import Player from "../Player.js";
import Color from "../Color.js";

export default class Platform extends Entity {

   constructor(x, y, width, height, color) {
      super(x, y, width, height)
      super.color = color
   }

   draw(context) {
      context.fillStyle = this.color.drawColor

      if (this.level) {
         const player = this.level.player
         if (player && !this.canCollideWith(player)) {
            context.fillStyle = `${this.color.drawColor}64`
         }
      }

      context.fillRect(this.x, this.y, this.width, this.height)
   }

   update(delta) {
      // Do nothing
   }

   canCollideWith(other) {
      return this.color === Color.BLACK || this.color.collidesWith(other.color)
   }

   onCollide(other) {
      // Do nothing
   }

}
