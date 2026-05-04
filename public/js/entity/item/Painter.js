import Vector from "../../math/Vector.js";
import { darkenHex, lightenHex } from "../../utility/Util.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";
import Item from "./Item.js";
import Color from "../Color.js";

export default class Painter extends Item {

   constructor(x, y) {
      super(x, y)
   }

   draw(context) {
      const gold = '#cfb000'

      context.fillStyle = darkenHex(gold)
      context.fillRect(this.x, this.y, this.width, this.height)

      context.fillStyle = gold
      context.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10)

      context.fillStyle = '#ffffaf'
      context.fillRect(this.x + 7, this.y + 7, this.width - 14, 7)

      context.fillStyle = '#774714'
      context.fillRect(this.x + 7, this.y + 14, this.width - 14, 3)
      context.fillRect(this.x + 12, this.y + 15, 6, 8)
   }

   onUse(user) {
      if (!(user instanceof Player)) return
   }

}
