import Platform from "./Platform.js";

export default class MovingPlatform extends Platform {

   constructor(x, y, width, height, color, x1, y1, x2, y2) {
      super(x, y, width, height, color)
      this.x1 = x1
      this.y1 = y1

      this.x2 = x2
      this.y2 = y2

      this.movingToPoint2 = true
      this.speed = 50
   }

   preparePhysics(delta) {
      const targetX = this.movingToPoint2 ? this.x2 : this.x1
      const targetY = this.movingToPoint2 ? this.y2 : this.y1

      const deltaX = targetX - this.x
      const deltaY = targetY - this.y
      const distance = Math.hypot(deltaX, deltaY)

      if (distance <= this.speed * delta) {
         this.x = targetX
         this.y = targetY
         this.movingToPoint2 = !this.movingToPoint2
         return
      }

      const angle = Math.atan2(deltaY, deltaX)
      this.x += this.speed * Math.cos(angle) * delta
      this.y += this.speed * Math.sin(angle) * delta
   }

}
