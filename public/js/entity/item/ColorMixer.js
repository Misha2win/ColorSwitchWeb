import Vector from "../../math/Vector.js";
import { darkenHex } from "../../utility/Util.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";
import Item from "./Item.js";

export default class ColorMixer extends Item {

   constructor(x, y, color, additive) {
      super(x, y)

      this.color = color
      this.additive = additive
   }

   draw(context) {
      context.fillStyle = darkenHex(this.color.drawColor)
      context.fillRect(this.x, this.y, this.width, this.height)

      context.fillStyle = this.color.drawColor
      context.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10)

      const centerX = this.x + this.width / 2
      const centerY = this.y + this.height / 2
      const armLength = this.width * 0.45

      context.lineCap = 'round'
      context.lineWidth = 8
      context.strokeStyle = 'black'
      context.beginPath()
      context.moveTo(centerX - armLength / 2, centerY)
      context.lineTo(centerX + armLength / 2, centerY)
      if (this.additive) {
         context.moveTo(centerX, centerY - armLength / 2)
         context.lineTo(centerX, centerY + armLength / 2)
      }
      context.stroke()

      context.lineWidth = 4
      context.strokeStyle = 'white'
      context.stroke()
   }

   onUse(user) {
      if (this.additive) {
         user.color = user.color.add(this.color)
      } else {
         user.color = user.color.subtract(this.color)
      }
      user.removeItem()
   }

}
