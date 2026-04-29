export default class Color {
   static #TOKEN = Symbol('Color')

   static #RGB_MASK = 0b111
   static #GRAY_VALUE = 0b1_000

   static #BY_VALUE = {}
   static #BY_NAME = {}

   static BLACK = Color.#create('black', 0b0_000, '#000000')
   static RED = Color.#create('red', 0b0_100, '#ff0000')
   static GREEN = Color.#create('green', 0b0_010, '#00ff00')
   static BLUE = Color.#create('blue', 0b0_001, '#0000ff')
   static YELLOW = Color.#create('yellow', 0b0_110, '#ffff00')
   static MAGENTA = Color.#create('magenta', 0b0_101, '#ff00ff')
   static CYAN = Color.#create('cyan', 0b0_011, '#00ffff')
   static WHITE = Color.#create('white', 0b0_111, '#ffffff')
   static GRAY = Color.#create('gray', 0b1_000, '#808080')

   #color

   constructor(token, name, color, drawColor) {
      if (token !== Color.#TOKEN) throw new TypeError('Color constructor is private')

      this.name = name
      this.drawColor = drawColor
      this.#color = color
      Object.freeze(this)
   }

   add(other) {
      Color.#assertColor(other)

      const added = (this.#color & Color.#RGB_MASK) | (other.#color & Color.#RGB_MASK)
      return Color.#BY_VALUE[added]
   }

   subtract(other) {
      Color.#assertColor(other)

      const subtracted = (this.#color & Color.#RGB_MASK) & (~other.#color & Color.#RGB_MASK)
      return Color.#BY_VALUE[subtracted]
   }

   collidesWith(other) {
      Color.#assertColor(other)

      if (this.#color === Color.#GRAY_VALUE || other.#color === Color.#GRAY_VALUE) return false

      if (this.#color === Color.BLACK.#color || other.#color === Color.BLACK.#color) return true
      if (this.#color === Color.WHITE.#color || other.#color === Color.WHITE.#color) return true

      return ((this.#color & Color.#RGB_MASK) & (other.#color & Color.#RGB_MASK)) !== 0
   }

   static getColor(name) {
      const normalizedName = name.toLowerCase()
      const color = Color.#BY_NAME[normalizedName]

      if (color !== undefined) return color

      throw new TypeError(`Could not find a color for "${name}"`)
   }

   toString() {
      return this.name
   }

   static #create(name, color, drawColor) {
      const colorObject = new Color(Color.#TOKEN, name, color, drawColor)

      Color.#BY_VALUE[color] = colorObject
      Color.#BY_NAME[name] = colorObject

      return colorObject
   }

   static #assertColor(color) {
      if (!(color instanceof Color)) throw new TypeError('Expected a Color')
   }
}

Object.freeze(Color)
