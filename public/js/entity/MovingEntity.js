export default class MovingEntity {

   constructor(original, x1 = 0, y1 = 0, x2 = 0, y2 = 0, speed = 50, loop = true) {
      const state = {
         original,
         x1,
         y1,
         x2,
         y2,
         speed,
         loop,
         movingToPoint2: true,
      }

      return new Proxy(original, {
         get(target, property, receiver) {
            if (property === 'constructor') return target.constructor
            if (Object.hasOwn(state, property)) return state[property]
            if (property in MovingEntity.prototype) {
               return Reflect.get(MovingEntity.prototype, property, receiver)
            }

            return Reflect.get(target, property, target)
         },

         set(target, property, value, receiver) {
            if (Object.hasOwn(state, property) && property !== 'original') {
               state[property] = value
               return true
            }

            return Reflect.set(target, property, value, target)
         }
      })
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
         if (this.movingToPoint2 || this.loop) this.movingToPoint2 = !this.movingToPoint2
         this.original.preparePhysics.call(this, delta)
         return
      }

      const angle = Math.atan2(deltaY, deltaX)
      this.x += this.speed * Math.cos(angle) * delta
      this.y += this.speed * Math.sin(angle) * delta

      this.original.preparePhysics.call(this, delta)
   }

   draw(context) {
      if (globalThis.editor) {
         const circleRadius = 3

         context.save()
         context.strokeStyle = 'red'
         context.lineWidth = 1.5

         context.beginPath()
         context.moveTo(this.x, this.y)
         context.lineTo(this.x1, this.y1)
         context.lineTo(this.x2, this.y2)
         context.stroke()

         context.beginPath()
         context.moveTo(this.x1 + circleRadius, this.y1)
         context.arc(this.x1, this.y1, circleRadius, 0, Math.PI * 2)
         context.moveTo(this.x2 + circleRadius, this.y2)
         context.arc(this.x2, this.y2, circleRadius, 0, Math.PI * 2)
         context.stroke()

         context.fillStyle = `${this.color.drawColor}32`
         context.fillRect(this.x1, this.y1, this.width, this.height)
         context.fillRect(this.x2, this.y2, this.width, this.height)
         context.restore()
      }

      this.original.draw.call(this, context)
   }

   toJSON() {
      return {
         ...this.original.toJSON.call(this),
         movingEntity: {
            speed: this.speed,
            loop: this.loop,
            startX: this.x1,
            startY: this.y1,
            endX: this.x2,
            endY: this.y2
         }
      }
   }

   getProperties() {
      return [
         ...this.original.getProperties.call(this),
         { name: 'speed', type: 'number', get: entity => entity.speed, set: (entity, value) => { entity.speed = value }  },
         { name: 'loop', type: 'boolean', get: entity => entity.loop, set: (entity, value) => { entity.loop = value }  },
         { name: 'startX', type: 'number', get: entity => entity.x1, set: (entity, value) => { entity.x1 = value } },
         { name: 'startY', type: 'number', get: entity => entity.y1, set: (entity, value) => { entity.y1 = value } },
         { name: 'endX', type: 'number', get: entity => entity.x2, set: (entity, value) => { entity.x2 = value } },
         { name: 'endY', type: 'number', get: entity => entity.y2, set: (entity, value) => { entity.y2 = value } }
      ]
   }

}
