import { lightenHex } from "../../utility/Util.js";
import Color from "../Color.js";
import Entity from "../Entity.js";
import Player from "../Player.js";
import Platform from "./Platform.js";

export default class HealthGate extends Platform {

   constructor(x, y, width, height, greaterThan = true, requirement = 50) {
      super(x, y, width, height)
      this.color = Color.BLACK
      this.greaterThan = !greaterThan
      this.requirement = requirement
   }

   draw(context) {
      context.fillStyle = 'rgba(0, 0, 0, 0.5)'
      context.fillRect(this.x, this.y, this.width, this.height)

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
   }

   canCollideWith(other) {
      return this.greaterThan
         ? other.health > this.requirement
         : other.health < this.requirement
   }

   toJSON() {
      return {
         type: this.type,
         x: this.x,
         y: this.y,
         width: this.width,
         height: this.height,
         greaterThan: !this.greaterThan,
         health: this.requirement
      }
   }

   getProperties() {
      return [
         { name: 'x', type: 'number', step: 10 },
         { name: 'y', type: 'number', step: 10 },
         { name: 'width', type: 'number', min: 10, step: 10, roundTo: 10 },
         { name: 'height', type: 'number', min: 10, step: 10, roundTo: 10 },
         { name: 'greaterThan', type: 'boolean', get: entity => !entity.greaterThan, set: (entity, value) => { entity.greaterThan = !value } },
         { name: 'health', label: 'Health', type: 'number', min: 0, step: 1, get: entity => entity.requirement, set: (entity, value) => { entity.requirement = value } }
      ]
   }

}
