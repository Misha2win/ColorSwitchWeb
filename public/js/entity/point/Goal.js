import Color from "../Color.js"
import Player from "../Player.js"
import Point from "./Point.js"

export default class Goal extends Point {

   constructor(x, y, color = Color.GREEN) {
      super(x, y, color)
   }

   canCollideWith(other) {
      return this.color === other.color
   }

   onCollide(other) {
      if (!(other instanceof Player)) return
      if (!this.level?.levelManager) return

      this.level.levelManager.advanceLevel(this.level)
   }

   toJSON() {
      return {
         ...super.toJSON(),
         color: this.color.name
      }
   }

   getProperties() {
      return [
         ...super.getProperties(),
         { name: 'color', type: 'color' }
      ]
   }

}
