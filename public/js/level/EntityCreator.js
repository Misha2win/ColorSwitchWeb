import Color from '../entity/Color.js'
import Platform from '../entity/platform/Platform.js'
import ColorChanger from '../entity/item/ColorChanger.js'
import Goal from '../entity/point/Goal.js'
import Element from '../entity/obstacle/Element.js'
import SuperJump from '../entity/item/SuperJump.js'
import Prism from '../entity/obstacle/Prism.js'
import Teleporter from '../entity/item/Teleporter.js'
import Mirror from '../entity/item/Mirror.js'
import ColorMixer from '../entity/item/ColorMixer.js'
import FragilePlatform from '../entity/platform/FragilePlatform.js'
import PhotonicPlatform from '../entity/platform/PhotonicPlatform.js'
import Text from '../entity/Text.js'
import Painter from '../entity/item/Painter.js'
import Portal from '../entity/obstacle/Portal.js'
import MovingEntity from '../entity/MovingEntity.js'

const registry = new Map()
const getColor = (name, fallbackName) => Color.getColor(name ?? fallbackName)

registry.set('Platform', (obj) => new Platform(obj.x, obj.y, obj.width, obj.height, getColor(obj.color, 'black')))
registry.set('PhotonicPlatform', (obj) => new PhotonicPlatform(obj.x, obj.y, obj.width, obj.height))
registry.set('FragilePlatform', (obj) => new FragilePlatform(obj.x, obj.y, obj.width, obj.height, getColor(obj.color, 'black')))

registry.set('ColorChanger', (obj) => new ColorChanger(obj.x, obj.y, getColor(obj.color, 'red')))
registry.set('Painter', (obj) => new Painter(obj.x, obj.y))
registry.set('Mirror', (obj) => new Mirror(obj.x, obj.y, getColor(obj.color, 'gray'), obj.persistOnce))
registry.set('Teleporter', (obj) => new Teleporter(obj.x, obj.y, obj.hasDestination, obj.endX, obj.endY))
registry.set('SuperJump', (obj) => new SuperJump(obj.x, obj.y))

registry.set('Prism', (obj) => new Prism(obj.x, obj.y, getColor(obj.color, 'red'), obj.direction))
registry.set('Element', (obj) => new Element(obj.x, obj.y, obj.width, obj.height, getColor(obj.color, 'red'), obj.health))

registry.set('Portal', (obj) => new Portal(obj.x, obj.y, getColor(obj.color, 'gray'), obj.link))

registry.set('Goal', (obj) => new Goal(obj.x, obj.y, getColor(obj.color, 'green')))

registry.set('Text', (obj) => new Text(obj.x, obj.y, obj.width, obj.height, obj.text, obj.fontSize, obj.color, obj.background))

export function create(obj) {
    const maker = registry.get(obj.type)
    if (!maker) {
        console.log('Unknown type: ' + obj.type)
        return null
    }

    const entity = maker(obj)
    if (obj.movingEntity) {
        const moving = obj.movingEntity
        return new MovingEntity(entity, moving.startX, moving.startY, moving.endX, moving.endY)
    }

    return entity
}

export function isValidType(type) {
    return registry.has(type)
}

export function getTypes() {
    return [...registry.keys()]
}
