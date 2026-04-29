import { Beam } from "./obstacle/Prism.js"

export default class Ghost {

    constructor(original, overrides = {}) {
        this._local = {
            original,
            ...overrides
        }

        return new Proxy(this, {
            get(target, property, receiver) {
                if (Object.hasOwn(target._local, property)) {
                    return target._local[property]
                }

                if (property in target) {
                    const value = Reflect.get(target, property, receiver)
                    return typeof value === 'function' ? value.bind(receiver) : value
                }

                const value = target._local.original[property]
                return typeof value === 'function' ? value.bind(target._local.original) : value
            },

            set(target, property, value) {
                if (Object.hasOwn(target._local, property) || property === 'x' || property === 'y') {
                    target._local[property] = value
                    return true
                }

                target._local.original[property] = value
                return true
            }
        })
    }

    canCollideWith(other) {
        return this.original.canCollideWith.call(this, other)
    }

    onCollide(other) {
        return this.original.onCollide.call(this, other.mirror)
    }

    draw(context) {
        return this.original.draw.call(this, context)
    }

}
