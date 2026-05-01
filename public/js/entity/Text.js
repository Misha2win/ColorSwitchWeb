import Entity from './Entity.js'

export default class Text extends Entity {

    constructor(x, y, width, height, text, fontSize, color, background) {
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

}