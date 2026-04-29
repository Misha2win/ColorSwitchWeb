import Color from "../Color.js"
import Point from "./Point.js"

export default class Spawn extends Point {

   constructor(x, y) {
      super(x, y, Color.RED)
   }

   canCollideWith(other) {
      return false
   }

}
