import { boxesIntersect } from "../../math/PhysicsEngine.js";
import { lightenHex } from "../../utility/Util.js";
import Color from "../Color.js";
import Entity from "../Entity.js";
import { Beam } from "../obstacle/Prism.js";
import Player from "../Player.js";
import Platform from "./Platform.js";

export default class PhotonicPlatform extends Platform {

   constructor(x, y, width, height) {
      super(x, y, width, height)
      this.color = Color.GRAY
   }

   draw(context) {
      super.draw(context)

      context.strokeStyle = 'black'
      context.strokeRect(this.x, this.y, this.width, this.height)
   }

   preparePhysics() {
      this.color = Color.GRAY

      for (const entity of this.level?.entities) {
         if (!(entity instanceof Beam)) continue
         if (!boxesIntersect(entity, this)) continue

         this.color = this.color.add(entity.color)
      }
   }

}
