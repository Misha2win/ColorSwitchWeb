import Vector from "../../math/Vector.js";
import abstractError from "../../Abstract.js"
import Entity from "../Entity.js";
import Player from "../Player.js";

export default class Item extends Entity {

   #type

   constructor(x, y) {
      super(x, y, 30, 30)
      if (new.target === Entity) throw new Error('Item is abstract')
      this.#type = new.target.name

      this.shiftTimer = 0
      this.shiftFrequency = 0.5
      this.position = new Vector(this.x, this.y)

      this.collected = false
      this.persist = false
   }

   onCollect() {
      if (!this.level) return

      const player = this.level.player
      if (!player) return

      this.collected = true
      player.holdItem(this)
   }

   onUse(user) { abstractError('Item.onUse', this.#type) }

   update(delta) {
      if (this.collected) return

      this.shiftTimer += delta
      if (this.shiftTimer >= this.shiftFrequency) {
         this.shiftTimer = 0
         this.x = this.position.x + Math.random() * 4 - 2
         this.y = this.position.y + Math.random() * 4 - 2
      }
   }

   canCollideWith(other) {
      return other instanceof Player && other.heldItem === null
   }

   onCollide(other) {
      if (!(other instanceof Player)) return
      this.onCollect()
   }

}
