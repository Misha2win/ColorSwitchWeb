import Vector from "../../math/Vector.js";
import { darkenHex, lightenHex } from "../../utility/Util.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";
import Item from "./Item.js";
import Color from "../Color.js";
import Portal from "../obstacle/Portal.js";

export default class Teleporter extends Item {

   constructor(x, y) {
      super(x, y)

      this.placed = false
      this.link = null
   }

   update(delta) {
      super.update(delta)

      if (this.level && this.link === null) {
         let link = 0
         this.level.triggers.forEach(entity => {
            if (entity instanceof Teleporter) {
               if (entity.link >= link) link = entity.link + 1
            }
         })
         this.link = link
      }
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
      if (!this.link) return
      if (!this.level) return

      const portal = new Portal(user.x, user.y, this.link)
      this.level.add(portal)

      if (this.placed) {
         portal.cooldown = user
         user.removeItem()
      } else {
         this.placed = true
      }
   }

   toJSON() {
      return {
         type: this.type,
         x: this.x,
         y: this.y
      }
   }

   getProperties() {
      return [
         { name: 'x', type: 'number' },
         { name: 'y', type: 'number' },
      ]
   }

}
