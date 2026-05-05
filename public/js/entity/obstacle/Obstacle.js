import abstractError from "../../Abstract.js"
import Entity from "../Entity.js"

export default class Obstacle extends Entity {

    constructor(x, y, width, height, color) {
        super(x, y, width, height)
        // This class is abstract and should not be instantiated directly
        if (new.target === Obstacle) throw new Error('Obstacle is abstract')

        this.color = color
    }

    toJSON() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            color: this.color.name
        }
    }

    getProperties() {
        return [
            { name: 'x', type: 'number', step: 10 },
            { name: 'y', type: 'number', step: 10 },
            { name: 'width', type: 'number', min: 10, step: 10, roundTo: 10 },
            { name: 'height', type: 'number', min: 10, step: 10, roundTo: 10 },
            { name: 'color', type: 'color' }
        ]
    }

}
