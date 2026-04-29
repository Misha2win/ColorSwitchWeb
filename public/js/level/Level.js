import Platform from "../entity/platform/Platform.js"
import MovingPlatform from "../entity/platform/MovingPlatform.js"
import Item from "../entity/item/Item.js"
import Spawn from "../entity/point/Spawn.js"
import Color from "../entity/Color.js"
import Ghost from "../entity/Ghost.js"
import Goal from "../entity/point/Goal.js"
import Point from "../entity/point/Point.js"
import Prism, { Beam } from "../entity/obstacle/Prism.js"
import Element from "../entity/obstacle/Element.js"

export default class Level {

    constructor(name, color, entities) {
        this.name = name
        this.color = color
        this.levelManager = null

        this.player = null

        this.entities = []
        this.blockers = []
        this.triggers = []
        this.items = []
        this.spawns = []

        this.ghosts = []
        this.ghostBlockers = []
        this.ghostTriggers = []
        this.ghostItems = []

        // Tell entity it is in this level
        for (const entity of entities) {
            this.add(entity)
        }
    }

    respawnPlayer() {
        if (!this.player) return

        const spawn = this.spawns[0]
        if (!this.spawns[0]) return

        this.player.restart()
        this.player.color = this.color
        this.player.x = spawn.x
        this.player.y = spawn.y
    }

    draw(context) {
        for (const entity of this.entities) entity.draw(context)
        this.player?.draw(context)
    }

    setPlayer(player) {
        this.player = player
        if (player) player.level = this
    }

    preparePhysics(delta) {
        for (const entity of this.entities) entity.preparePhysics(delta)
    }

    onPlayerUseItem(item) {
        for (const entity of this.entities) entity.onPlayerUseItem(item)
    }

    update(delta) {
        for (const entity of this.entities) entity.update(delta)

        for (const item of [...this.items]) {
            if (item.collected) {
                this.remove(item)
            }
        }

        for (const item of [...this.ghostItems]) {
            if (item.collected) {
                this.removeGhost(item)
            }
        }

        this.player?.update(delta)
    }

    getGhostColor(entityColor, mirroredColor, playerColor) {
        if (entityColor === Color.BLACK || entityColor === Color.GRAY) {
            return entityColor
        }

        if (entityColor.collidesWith(mirroredColor)) {
            return entityColor.subtract(mirroredColor).add(playerColor)
        }

        return Color.GRAY
    }

    createGhosts(mirroredColor) {
        const effectiveMirroredColor = mirroredColor === Color.GRAY ? Color.GREEN : mirroredColor
        this.removeGhosts()

        const levelWidth = this.levelManager?.width
        if (!levelWidth) return

        for (const entity of this.entities) {
            if (entity instanceof Point) continue

            const overrides = {}
            overrides.x = levelWidth - entity.x - entity.width
            overrides.y = entity.y

            if (entity instanceof Platform || entity instanceof Element) {
                overrides.color = this.getGhostColor(entity.color, mirroredColor, this.player.color)
            } else if (entity instanceof Item) {
                overrides.position = {
                    x: levelWidth - entity.position.x - entity.width,
                    y: entity.position.y
                }
                overrides.shiftTimer = entity.shiftTimer
            }

            this.addGhost(new Ghost(entity, overrides))
        }
    }

    toJSON() {
        return {
            startPoint: this.startPoint,
            entities: this.entities
        }
    }

    add(entity) {
        this.entities.push(entity)
        entity.level = this

        if (entity instanceof Platform) {
            this.blockers.push(entity)
        } else {
            this.triggers.push(entity)
        }

        if (entity instanceof Item) {
            this.items.push(entity)
        } else if (entity instanceof Spawn) {
            this.spawns.push(entity)
        }
    }

    addGhost(entity) {
        this.ghosts.push(entity)
        entity.level = this

        const categorizedEntity = entity.original ?? entity

        if (categorizedEntity instanceof Platform) {
            this.ghostBlockers.push(entity)
        } else {
            this.ghostTriggers.push(entity)
        }

        if (categorizedEntity instanceof Item) {
            this.ghostItems.push(entity)
        }
    }

    remove(entity) {
        const entityIndex = this.entities.indexOf(entity)
        if (entityIndex === -1) return false

        this.entities.splice(entityIndex, 1)

        if (entity instanceof Platform) {
            const blockerIndex = this.blockers.indexOf(entity)
            if (blockerIndex !== -1) this.blockers.splice(blockerIndex, 1)
        } else {
            const triggerIndex = this.triggers.indexOf(entity)
            if (triggerIndex !== -1) this.triggers.splice(triggerIndex, 1)
        }

        if (entity instanceof Item) {
            const itemIndex = this.items.indexOf(entity)
            if (itemIndex !== -1) this.items.splice(itemIndex, 1)
        }

        return true
    }

    removeGhost(entity) {
        const entityIndex = this.ghosts.indexOf(entity)
        if (entityIndex === -1) return false

        this.ghosts.splice(entityIndex, 1)

        const categorizedEntity = entity.original ?? entity

        if (categorizedEntity instanceof Platform) {
            const blockerIndex = this.ghostBlockers.indexOf(entity)
            if (blockerIndex !== -1) this.ghostBlockers.splice(blockerIndex, 1)
        } else {
            const triggerIndex = this.ghostTriggers.indexOf(entity)
            if (triggerIndex !== -1) this.ghostTriggers.splice(triggerIndex, 1)
        }

        if (categorizedEntity instanceof Item) {
            const itemIndex = this.ghostItems.indexOf(entity)
            if (itemIndex !== -1) this.ghostItems.splice(itemIndex, 1)
        }

        return true
    }

    removeGhosts() {
        this.ghosts = []
        this.ghostBlockers = []
        this.ghostTriggers = []
        this.ghostItems = []
    }

}
