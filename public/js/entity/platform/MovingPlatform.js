import Platform from "./Platform.js";

export default class MovingPlatform extends Platform {

   constructor(x, y, width, height, color, x1 = x, y1 = y, x2 = x + 100, y2 = y) {
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

   toJSON() {
      return {
         ...super.toJSON(),
         startX: this.x1,
         startY: this.y1,
         endX: this.x2,
         endY: this.y2
      }
   }

   getProperties() {
      return [
         ...super.getProperties(),
         { name: 'startX', type: 'number', step: 10, get: entity => entity.x1, set: (entity, value) => { entity.x1 = value } },
         { name: 'startY', type: 'number', step: 10, get: entity => entity.y1, set: (entity, value) => { entity.y1 = value } },
         { name: 'endX', type: 'number', step: 10, get: entity => entity.x2, set: (entity, value) => { entity.x2 = value } },
         { name: 'endY', type: 'number', step: 10, get: entity => entity.y2, set: (entity, value) => { entity.y2 = value } }
      ]
   }

}
