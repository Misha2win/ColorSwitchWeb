import Player from "../Player.js"
import Point from "./Point.js"

export default class Goal extends Point {

   constructor(x, y, color) {
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

}
