import Entity from "../Entity.js";
import Color from "../Color.js";

export default class Platform extends Entity {

   constructor(x, y, width, height, color = Color.BLACK) {
      super(x, y, width, height)
      super.color = color
   }

   getDrawColor() {
      const player = this.level?.player
      if (player) {
         const gameWidth = this.level.levelManager?.width
         const middle = gameWidth / 2
         const crossesMiddle = this.x < middle && this.x + this.width > middle

         const realPlayerIsRight = player.x + player.width / 2 > middle

         const platformIsRight = this.x + this.width / 2 > middle

         const tester = player.mirror && gameWidth && realPlayerIsRight !== platformIsRight ? player.mirror : player

         const collides = player.mirror && gameWidth && crossesMiddle
            ? this.canCollideWith(player) || this.canCollideWith(player.mirror)
            : this.canCollideWith(tester)

         if (!collides) {
            return `${this.color.drawColor}64`
         }
      }

      return this.color.drawColor
   }

   draw(context) {
      context.fillStyle = this.getDrawColor()
      context.fillRect(this.x, this.y, this.width, this.height)
   }

   update(delta) {
      // Do nothing
   }

   canCollideWith(other) {
      return this.color === Color.BLACK || this.color.collidesWith(other.color)
   }

   onCollide(other) {
      // Do nothing
   }

   toJSON() {
      return {
         type: this.type,
         x: this.x,
         y: this.y,
         width: this.width,
         height: this.height,
         color: this.color.name
      }
   }

   getProperties() {
      return [
         { name: 'x', type: 'number', step: 10 },
         { name: 'y', type: 'number', step: 10 },
         { name: 'width', type: 'number', min: 10, step: 10, roundTo: 10 },
         { name: 'height', type: 'number', min: 10, step: 10, roundTo: 10 },
         { name: 'color', type: 'color' }
      ]
   }

}
