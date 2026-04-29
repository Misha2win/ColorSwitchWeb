import Color from '../entity/Color.js'
import Platform from '../entity/platform/Platform.js'
import ColorChanger from '../entity/item/ColorChanger.js'
import Spawn from '../entity/point/Spawn.js'
import Goal from '../entity/point/Goal.js'
import Element from '../entity/obstacle/Element.js'
import SuperJump from '../entity/item/SuperJump.js'
import Prism from '../entity/obstacle/Prism.js'
import MovingPlatform from '../entity/platform/MovingPlatform.js'
import Teleporter from '../entity/item/Teleporter.js'
import Mirror from '../entity/item/Mirror.js'
import ColorMixer from '../entity/item/ColorMixer.js'
import Portal from '../entity/point/Portal.js'
import HealthGate from '../entity/platform/HealthGate.js'
import FragilePlatform from '../entity/platform/FragilePlatform.js'
import PhotonicPlatform from '../entity/platform/PhotonicPlatform.js'
import Text from '../entity/Text.js'

export const registry = new Map()
registry.set('Platform', (obj) => new Platform(obj.x, obj.y, obj.width, obj.height, Color.getColor(obj.color)))
registry.set('ColorChanger', (obj) => new ColorChanger(obj.x, obj.y, Color.getColor(obj.color)))
registry.set('Spawn', (obj) => new Spawn(obj.x, obj.y))
registry.set('Goal', (obj) => new Goal(obj.x, obj.y, Color.getColor(obj.color)))
registry.set('Element', (obj) => new Element(obj.x, obj.y, obj.width, obj.height, Color.getColor(obj.color), obj.health))
registry.set('SuperJump', (obj) => new SuperJump(obj.x, obj.y))
registry.set('Prism', (obj) => new Prism(obj.x, obj.y, Color.getColor(obj.color), obj.direction))
registry.set('MovingPlatform', (obj) => new MovingPlatform(obj.x, obj.y, obj.width, obj.height, Color.getColor(obj.color), obj.startX, obj.startY, obj.endX, obj.endY))
registry.set('Teleporter', (obj) => new Teleporter(obj.x, obj.y, obj.hasDestination, obj.endX, obj.endY))
registry.set('Mirror', (obj) => new Mirror(obj.x, obj.y, Color.getColor(obj.color), obj.persistOnce))
registry.set('ColorMixer', (obj) => new ColorMixer(obj.x, obj.y, Color.getColor(obj.color), obj.additive))
registry.set('Portal', (obj) => new Portal(obj.x, obj.y, obj.id))
registry.set('HealthGate', (obj) => new HealthGate(obj.x, obj.y, obj.width, obj.height, obj.greaterThan, obj.health))
registry.set('FragilePlatform', (obj) => new FragilePlatform(obj.x, obj.y, obj.width, obj.height, Color.getColor(obj.color)))
registry.set('PhotonicPlatform', (obj) => new PhotonicPlatform(obj.x, obj.y, obj.width, obj.height))
registry.set('Text', (obj) => new Text(obj.x, obj.y, obj.width, obj.height, obj.text, obj.fontSize, obj.color, obj.background))
