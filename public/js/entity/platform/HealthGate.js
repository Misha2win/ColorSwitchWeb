import { lightenHex } from "../../utility/Util.js";
import Color from "../Color.js";
import Entity from "../Entity.js";
import Player from "../Player.js";
import Platform from "./Platform.js";

export default class HealthGate extends Platform {

   constructor(x, y, width, height, greaterThan, requirement) {
      super(x, y, width, height)
      this.color = Color.BLACK
      this.greaterThan = !greaterThan
      this.requirement = requirement
   }

   draw(context) {
      context.fillStyle = 'rgba(0, 0, 0, 0.5)'
      context.fillRect(this.x, this.y, this.width, this.height)

      context.save()
      context.font = `${Math.max(8, Math.min(this.height * 0.6, this.width * 0.18))}px sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'

      const operator = this.greaterThan ? '<' : '>'
      const text = `${operator}${this.requirement}`
      const centerX = this.x + this.width / 2
      const centerY = this.y + this.height / 2
      const maxWidth = this.width - 6

      context.lineWidth = 3
      context.strokeStyle = 'black'
      context.strokeText(text, centerX, centerY, maxWidth)
      context.fillStyle = 'white'
      context.fillText(text, centerX, centerY, maxWidth)
      context.restore()
   }

   canCollideWith(other) {
      return this.greaterThan
         ? other.health > this.requirement
         : other.health < this.requirement
   }

}
