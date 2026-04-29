import abstractError from "../../Abstract.js"
import Entity from "../Entity.js"

export default class Obstacle extends Entity {

    constructor(x, y, width, height, color) {
        super(x, y, width, height)
        // This class is abstract and should not be instantiated directly
        if (new.target === Obstacle) throw new Error('Obstacle is abstract')

        this.color = color
    }

}