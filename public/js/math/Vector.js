export default class Vector {
    static eps = 1e-9

    constructor(x = 0, y = 0) {
        if (x && typeof x === 'object') {
            const obj = x
            this.x = obj.x ?? 0
            this.y = obj.y ?? 0
        } else {
            this.x = x ?? 0
            this.y = y ?? 0
        }
    }

    add(other) {
        return new Vector(this.x + other.x, this.y + other.y)
    }

    subtract(other) {
        return new Vector(this.x - other.x, this.y - other.y)
    }

    multiply(value) {
        return new Vector(this.x * value, this.y * value)
    }

    lengthSq() {
        return (this.x ** 2 + this.y ** 2)
    }

    length() {
        return this.lengthSq() ** 0.5
    }

    normalize() {
        const length = this.length()
        return new Vector(this.x / length, this.y / length)
    }

    dot(other) {
        return (this.x * other.x) + (this.y * other.y)
    }

    isZero() {
        return this.length() < Vector.eps
    }

    equals(other) {
        return this.x === other.x && this.y === other.y
    }

}