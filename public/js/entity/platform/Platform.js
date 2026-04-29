import Entity from "../Entity.js";
import Color from "../Color.js";

export default class Platform extends Entity {

   constructor(x, y, width, height, color) {
      super(x, y, width, height)
      super.color = color
   }

   draw(context) {
      context.fillStyle = this.color.drawColor

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
            context.fillStyle = `${this.color.drawColor}64`
         }
      }

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

}
