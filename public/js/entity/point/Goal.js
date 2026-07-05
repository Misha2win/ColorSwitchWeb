import { darkenHex } from "../../utility/Util.js"
import Color from "../Color.js"
import Entity from "../Entity.js"
import Player from "../Player.js"

export default class Goal extends Entity {

   constructor(x, y, color = Color.GREEN) {
      super(x, y, 20, 20)
      this.color = color

      this.rotation = 0
   }

   update(delta) {
      this.rotation = (this.rotation + delta) % (Math.PI * 2)
   }

   draw(context) {
      context.save()

      context.translate(this.x + this.width / 2, this.y + this.height / 2)

      context.fillStyle = this.color.hasPoorVisibility() ? 'black' : darkenHex(this.color.drawColor, 0.5)

      const offset = 2

      context.rotate(this.rotation)
      context.fillRect(-7, -7, 14, 14)
      context.rotate(-offset * this.rotation)
      context.fillRect(-7, -7, 14, 14)

      context.fillStyle = this.color.drawColor

      context.rotate(offset * this.rotation)
      context.fillRect(-6 , -6, 12, 12)
      context.rotate(-offset * this.rotation)
      context.fillRect(-6, -6, 12, 12)

      context.restore()
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
         type: this.type,
         x: this.x,
         y: this.y,
         color: this.color.name
      }
   }

   getProperties() {
      return [
         { name: 'x', type: 'number' },
         { name: 'y', type: 'number' },
         { name: 'color', type: 'color' }
      ]
   }

}
