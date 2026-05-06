import Vector from "../../math/Vector.js";
import { darkenHex, lightenHex } from "../../utility/Util.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";
import Item from "./Item.js";
import Color from "../Color.js";
import { boxesIntersect } from "../../math/PhysicsEngine.js";

export default class Painter extends Item {

   constructor(x, y) {
      super(x, y)
   }

   draw(context) {

      context.fillStyle = darkenHex(Color.WHITE.drawColor)
      context.fillRect(this.x, this.y, this.width, this.height)

      context.fillStyle = Color.WHITE.drawColor
      context.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10)

      context.fillStyle = '#ffffaf'
      context.fillRect(this.x + 5, this.y + 3, 20, 8)

      context.fillStyle = '#774714'
      context.fillRect(this.x + 5, this.y + 10, 20, 5)
      context.fillRect(this.x + 12, this.y + 15, 6, 12)
   }

   onUse(user) {
      if (!(user instanceof Player)) return

      const auraHitbox = {
         x: user.x - 10,
         y: user.y - 10,
         width: user.width + 20,
         height: user.height + 20
      }

      for (const platform of this.level?.blockers) {
         if (!boxesIntersect(platform, auraHitbox)) continue
         platform.color = user.color
      }

      user.removeItem()
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
         { name: 'x', type: 'number', step: 10 },
         { name: 'y', type: 'number', step: 10 }
      ]
   }

}
