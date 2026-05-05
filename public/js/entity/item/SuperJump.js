import Vector from "../../math/Vector.js";
import { darkenHex } from "../../utility/Util.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";
import Item from "./Item.js";
import Color from "../Color.js";

export default class SuperJump extends Item {

   constructor(x, y) {
      super(x, y)
   }

   draw(context) {
      context.fillStyle = Color.RED.drawColor
      context.fillRect(this.x, this.y, this.width, this.height)

      context.fillStyle = 'white'
      context.beginPath()
      context.moveTo(this.x + this.width / 2, this.y + 5)
      context.lineTo(this.x + 5, this.y + this.height / 2)
      context.lineTo(this.x + this.width / 2, this.y + this.height / 2)
      context.lineTo(this.x + 5, this.y + this.height - 5)
      context.lineTo(this.x + this.width - 5, this.y + this.height - 5)
      context.lineTo(this.x + this.width / 2, this.y + this.height / 2)
      context.lineTo(this.x + this.width - 5, this.y + this.height / 2)
      context.closePath()
      context.fill()
   }

   onUse(user) {
      user.yVelocity = -1000
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
