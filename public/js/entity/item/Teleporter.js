import Vector from "../../math/Vector.js";
import { darkenHex, lightenHex } from "../../utility/Util.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";
import Item from "./Item.js";
import Color from "../Color.js";

export default class Teleporter extends Item {

   constructor(x, y, hasDestination, endX, endY) {
      super(x, y)

      this.hasDestination = hasDestination
      this.endX = endX
      this.endY = endY
   }

   draw(context) {
      context.fillStyle = darkenHex(Color.WHITE.drawColor)
      context.fillRect(this.x, this.y, this.width, this.height)

      context.fillStyle = Color.WHITE.drawColor
      context.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10)

      const centerX = this.x + this.width / 2
      const centerY = this.y + this.height / 2
      const radiusX = 8
      const radiusY = 13
      const angle = -Math.PI / 4
      const colorA = '#ff5d00'
      const colorB = '#0065ff'

      this.drawSplitOval(context, centerX, centerY, radiusX, radiusY, angle, colorA, colorB)
      this.drawSplitOval(context, centerX, centerY, radiusX - 3, radiusY - 3, angle, lightenHex(colorA), lightenHex(colorB))

      context.fillStyle = 'purple'
      context.beginPath()
      context.ellipse(this.endX + 10, this.endY + 10, 10, 10, 0, 0, Math.PI * 2)
      context.fill()
   }

   drawSplitOval(context, centerX, centerY, radiusX, radiusY, splitAngle, colorA, colorB) {
      context.fillStyle = colorA
      context.beginPath()
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, splitAngle, splitAngle + Math.PI)
      context.fill()

      context.fillStyle = colorB
      context.beginPath()
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, splitAngle + Math.PI, splitAngle + Math.PI * 2)
      context.fill()
   }

   onUse(user) {
      if (!(user instanceof Player)) return

      if (this.hasDestination) {
         user.x = this.endX
         user.y = this.endY
         user.removeItem()
      } else {
         this.hasDestination = true
         this.endX = user.x
         this.endY = user.y
      }
   }

}
