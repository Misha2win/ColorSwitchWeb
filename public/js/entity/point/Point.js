import Vector from "../../math/Vector.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";

export default class Point extends Entity {

   constructor(x, y, color) {
      super(x, y, 20, 20)
      if (new.target === Entity) throw new Error('Point is abstract')

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
      const per = 1/10
      const sin = amp * (Math.sin(this.shiftTimer / per) + 1)
      this.drawX = this.x + sin
      this.drawY = this.y + sin
      this.drawWidth = this.width - sin * 2
      this.drawHeight = this.height - sin * 2
   }

   draw(context) {
      context.fillStyle = this.color.drawColor
      context.beginPath()

      if (this.level?.levelManager) {
         context.ellipse(
            this.drawX + this.drawWidth / 2, this.drawY + this.drawHeight / 2,
            this.drawWidth / 2, this.drawHeight / 2,
            0,
            0, Math.PI * 2
         )
      } else {
         context.ellipse(
            this.x + this.width / 2, this.y + this.height / 2,
            this.width / 2, this.height / 2,
            0,
            0, Math.PI * 2
         )
      }

      context.fill()
   }

}
