import Entity from './Entity.js'

export default class Text extends Entity {

    constructor(x, y, width, height, text = 'Text', fontSize = 24, color = 'black', background = 'white') {
        super(x, y, width, height)
        this.text = text
        this.fontSize = fontSize
        this.textColor = color
        this.backgroundColor = background
    }

    draw(context) {
        // Draw background
        if (this.backgroundColor) {
            context.fillStyle = this.backgroundColor
            context.fillStyle += 'c8'
            context.fillRect(this.x, this.y, this.width, this.height)
        }

        // Draw text
        context.font = `${this.fontSize}px sans-serif`
        context.fillStyle = this.textColor
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2)
    }

    canCollideWith(other) {
        return false
    }

    update(delta) {
        // Do nothing
    }

    onCollide(other) {
        // Do nothing
    }

    toJSON() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            text: this.text,
            fontSize: this.fontSize,
            color: this.textColor,
            background: this.backgroundColor
        }
    }

    getProperties() {
        return [
            { name: 'x', type: 'number', step: 10 },
            { name: 'y', type: 'number', step: 10 },
            { name: 'width', type: 'number', min: 10, step: 10, roundTo: 10 },
            { name: 'height', type: 'number', min: 10, step: 10, roundTo: 10 },
            { name: 'text', type: 'textarea' },
            { name: 'fontSize', type: 'number', min: 1, step: 1 },
            { name: 'color', label: 'Text Color', type: 'text', get: entity => entity.textColor, set: (entity, value) => { entity.textColor = value } },
            { name: 'background', label: 'Background', type: 'text', nullable: true, get: entity => entity.backgroundColor, set: (entity, value) => { entity.backgroundColor = value } }
        ]
    }

}
