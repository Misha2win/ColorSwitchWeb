import abstractError from "../Abstract.js"

export default class Entity {

    #type

    constructor(x, y, width, height) {
        // This class is abstract and should not be instantiated directly
        if (new.target === Entity) throw new Error('Entity is abstract')
        this.#type = new.target.name

        this.x = x
        this.y = y
        this.width = width
        this.height = height

        this.color = null
        this.level = null
    }

    draw(context) { abstractError('Entity.draw', this.#type) }
    preparePhysics(delta) {}
    resolvePhysics() {}
    update(delta) { abstractError('Entity.update', this.#type) }
    canCollideWith(other) { abstractError('Entity.canCollideWith', this.#type) }
    onCollide(other) { abstractError('Entity.onCollide', this.#type) }
    onPlayerColorChange() {}
    toJSON() { abstractError('Entity.toJSON', this.#type) } // Used in editor/level saving

    get type() { return this.#type }

}