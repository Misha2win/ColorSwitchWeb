import Vector from "../../math/Vector.js";
import { darkenHex, lightenHex } from "../../utility/Util.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";
import Item from "./Item.js";
import Color from "../Color.js";

export default class Mirror extends Item {

   constructor(x, y, color, persistOnce) {
      super(x, y)

      this.color = color
      this.persistOnce = persistOnce
   }

   draw(context) {
      context.fillStyle = 'black'
      context.fillRect(this.x, this.y, this.width, this.height)

      context.fillStyle = 'lightblue'
      context.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4)

      context.fillStyle = this.color.drawColor
      context.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10)

      if (!this.persistOnce) {
         const mirrorLeft = this.x + 2
         const mirrorRight = this.x + this.width - 2
         const mirrorTop = this.y + 2
         const mirrorBottom = this.y + this.height - 2

         context.save()
         context.strokeStyle = 'black'
         context.lineWidth = 0.5
         context.beginPath()

         context.moveTo(mirrorLeft, mirrorTop)
         context.lineTo(mirrorLeft + 5, mirrorTop + 5)
         context.lineTo(mirrorLeft + 9, mirrorTop + 12)
         context.moveTo(mirrorLeft + 5, mirrorTop + 5)
         context.lineTo(mirrorLeft, mirrorTop + 11)
         context.moveTo(mirrorLeft + 5, mirrorTop + 5)
         context.lineTo(mirrorLeft + 12, mirrorTop + 2)
         context.moveTo(mirrorLeft + 9, mirrorTop + 12)
         context.lineTo(mirrorLeft + 4, mirrorBottom)
         context.moveTo(mirrorLeft + 9, mirrorTop + 12)
         context.lineTo(mirrorLeft + 15, mirrorTop + 15)

         context.moveTo(mirrorRight, mirrorBottom)
         context.lineTo(mirrorRight - 4, mirrorBottom - 8)
         context.lineTo(mirrorRight - 11, mirrorBottom - 12)
         context.moveTo(mirrorRight - 4, mirrorBottom - 8)
         context.lineTo(mirrorRight, mirrorBottom - 15)
         context.moveTo(mirrorRight - 4, mirrorBottom - 8)
         context.lineTo(mirrorRight - 12, mirrorBottom - 4)
         context.moveTo(mirrorRight - 11, mirrorBottom - 12)
         context.lineTo(mirrorRight - 16, mirrorBottom - 7)
         context.moveTo(mirrorRight - 11, mirrorBottom - 12)
         context.lineTo(mirrorRight - 9, mirrorTop + 2)

         context.stroke()
         context.restore()
      }
   }

   onUse(user) {
      if (!(user instanceof Player)) return

      if (!user.mirror) {
         user.createMirror(this.color)
      } else {
         user.removeMirror()
         this.level?.removeGhosts()
      }

      if (this.persistOnce) {
         this.persistOnce = false
      } else {
         user.removeItem()
      }
   }

}
