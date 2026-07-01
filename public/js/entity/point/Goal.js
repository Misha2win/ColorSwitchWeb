import { darkenHex } from "../../utility/Util.js"
import Color from "../Color.js"
import Entity from "../Entity.js"
import Player from "../Player.js"

export default class Goal extends Entity {

   constructor(x, y, color = Color.GREEN) {
      super(x, y, 20, 20)
      this.color = color

      this.shiftTimer = 0

      this.drawX = x
      this.drawY = y
      this.drawWidth = 20
      this.drawHeight = 20
   }

   update(delta) {
      this.shiftTimer += delta

      const amp = 0.5
      const per = 10

      const sin = amp * (Math.sin(this.shiftTimer * per) + 1)
      const cos = amp * (Math.cos(this.shiftTimer * per) + 1)

      this.drawWidth = this.width - cos * 2
      this.drawHeight = this.height - sin * 2
   }

   draw(context) {
      context.fillStyle = this.color.hasPoorVisibility() ? 'black' : darkenHex(this.color.drawColor, 0.5)
      context.beginPath()
      context.ellipse(
         this.x + this.width / 2,
         this.y + this.height / 2,
         this.drawWidth / 2,
         this.drawHeight / 2,
         0, 0, Math.PI * 2
      )
      context.fill()

      context.fillStyle = this.color.drawColor
      context.beginPath()
      context.ellipse(
         this.x + this.width / 2,
         this.y + this.height / 2,
         this.drawWidth / 2 - 1,
         this.drawHeight / 2 - 1,
         0, 0, Math.PI * 2
      )
      context.fill()
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
