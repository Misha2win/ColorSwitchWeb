import { boxesIntersect } from "../../math/PhysicsEngine.js"
import Color from "../Color.js"
import Point from "./Point.js"

export default class Portal extends Point {

   constructor(x, y, id) {
      super(x, y, Color.BLUE)
      this.id = id
      this.link = null
      this.cooldown = false
   }

   canCollideWith(other) {
      return other.color === this.color
   }

   onCollide(other) {
      if (!this.link) return
      if (this.cooldown) return

      this.link.cooldown = true
      other.x = this.link.x
      other.y = this.link.y
   }

   update() {
      const level = this.level
      if (!level) return

      for (const trigger of level.triggers) {
         if (!(trigger instanceof Portal)) continue
         if (trigger === this) continue
         if (trigger.id !== this.id) continue

         this.link = trigger
         break
      }

      const player = level.player
      if (!player) return

      if (this.cooldown && !boxesIntersect(this, player)) {
         this.cooldown = false
      }
   }

}
