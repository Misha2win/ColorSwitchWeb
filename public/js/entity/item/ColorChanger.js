import Vector from "../../math/Vector.js";
import { darkenHex, lightenHex } from "../../utility/Util.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";
import Item from "./Item.js";
import Color from "../Color.js";

export default class ColorChanger extends Item {

   constructor(x, y, color) {
      super(x, y)

      this.color = color
   }

   draw(context) {
      context.fillStyle = darkenHex(this.color.drawColor)
      context.fillRect(this.x, this.y, this.width, this.height)

      if (this.color === Color.BLACK) {
         context.fillStyle = lightenHex(this.color.drawColor)
      } else {
         context.fillStyle = this.color.drawColor
      }
      context.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10)
   }

   onCollect() {
      if (!this.level) return

      const player = this.level.player
      if (!player) return

      this.collected = true

      player.addUses(this.color)
   }

}
