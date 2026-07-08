import Color from '../entity/Color.js'
import ColorChanger from '../entity/item/ColorChanger.js'
import Beam, { Direction } from '../entity/obstacle/Beam.js'
import Element from '../entity/obstacle/Element.js'
import Portal from '../entity/obstacle/Portal.js'
import Prism from '../entity/obstacle/Prism.js'
import PhotonicPlatform from '../entity/platform/PhotonicPlatform.js'
import Platform from '../entity/platform/Platform.js'
import Vector from './Vector.js'

export function calculatePhysics(delta, level) {
    resolveOptics(delta, level)

    const entities = level.entities
    const blockers = [...level.blockers, ...level.ghostBlockers]
    const triggers = [...level.triggers, ...level.ghostTriggers]
    const player = level.player

    if (!player) return

    const direction = new Vector(0, 0)
    if (player.requestLeft) direction.x -= 1
    if (player.requestRight) direction.x += 1
    if (player.requestUp) direction.y -= 1
    if (player.requestDown) direction.y += 1

    const playerVelocity = direction.normalize().multiply(player.speed)

    const collisionCandidates = []
    for (const blocker of blockers) {
        if (blocker.canCollideWith(player)) {
            collisionCandidates.push(blocker)
        }
    }

    if (moveWithSweptCollision(player, collisionCandidates, playerVelocity.x * delta, 'x')) {
        playerVelocity.x = 0
    }

    if (moveWithSweptCollision(player, collisionCandidates, playerVelocity.y * delta, 'y')) {
        playerVelocity.y = 0
    }

    for (const entity1 of entities) {
        for (const entity2 of entities) {
            if (entity1 === entity2) continue
            if (!boxesIntersect(entity1, entity2)) continue

            if (entity1.canCollideWith(entity2)) entity1.onCollide(entity2)
            if (entity2.canCollideWith(entity1)) entity2.onCollide(entity1)
        }
    }

    for (const trigger of triggers) {
        if (!trigger.canCollideWith(player)) continue
        if (!boxesIntersect(player, trigger)) continue

        trigger.onCollide(player)
    }
}

function resolveOptics(delta, level) {
    const partition = (array, predicate) => {
        const matches = []
        const nonMatches = []

        for (const item of array) {
            if (predicate(item)) {
                matches.push(item)
            } else {
                nonMatches.push(item)
            }
        }

        return [matches, nonMatches]
    }

    const directionalComparators = {
            [Direction.UP]: (a, b) => (b.y + b.height) - (a.y + a.height),
            [Direction.RIGHT]: (a, b) => a.x - b.x,
            [Direction.DOWN]: (a, b) => a.y - b.y,
            [Direction.LEFT]: (a, b) => (b.x + b.width) - (a.x + a.width)
    }

    const photonics = level.getEntities(PhotonicPlatform)
    const prisms = level.getEntities(Prism)
    const [rootPrisms, leafPrisms] = partition(prisms, (prism) => photonics.every((plat) => !pointIntersectsBox(prism.point, plat)))

    // Resolve prisms that arent connected to photonic platforms
    const collisionCandidates = [
        ...prisms,
        ...level.getEntities(Element),
        ...level.getEntities(Platform),
        ...level.getEntities(Portal),
        ...level.getEntities(ColorChanger),
    ]

    for (const prism of rootPrisms) {
        prism.beams[0]?.reset()
        prism.beams[0]?.clearDownstreamBeams()
        for (const beam of prism.beams) {
            for (const candidate of collisionCandidates.sort(directionalComparators[beam.direction])) {
                if (!beam.canCollideWith(candidate)) continue
                if (!boxesIntersect(beam, candidate)) continue
                beam.onCollide(candidate)
                break
            }
        }
    }

    const beams = level.getEntities(Beam)

    const beamCollisions = new Map()
    const photonicCollisions = new Map()
    for (const photonic of photonics) {
        photonic.color = Color.GRAY

        const beamColliders = []
        const photonicColliders = []

        for (const beam of beams) {
            if (beam.color === Color.BLACK) continue
            if (!boxesIntersect(beam, photonic)) continue
            beamColliders.push(beam)
        }

        for (const other of photonics) {
            if (photonic === other) continue
            if (!boxesIntersect(photonic, other)) continue
            photonicColliders.push(other)
        }

        beamCollisions.set(photonic, beamColliders)
        photonicCollisions.set(photonic, photonicColliders)
    }

    beamCollisions.forEach((beams, photonic) => {
        beams.forEach((beam) => {
            photonic.color = photonic.color.add(beam.color)
        })
    })
}

function moveWithSweptCollision(entity, blockers, distance, axis) {
    const hit = getSweptAxisHit(entity, blockers, distance, axis)
    if (hit) {
        const collisionStep = Math.sign(distance) * 1e-7
        entity[axis] += distance * hit.time + collisionStep
        resolveCollisions(entity, blockers)
        return { swept: true }
    }

    entity[axis] += distance
    return resolveCollisions(entity, blockers)
}

function getSweptAxisHit(entity, blockers, distance, axis) {
    if (distance === 0) return null

    const size = axis === 'x' ? 'width' : 'height'
    const otherAxis = axis === 'x' ? 'y' : 'x'
    const otherSize = axis === 'x' ? 'height' : 'width'
    const direction = Math.sign(distance)
    const maxDistance = Math.abs(distance)

    let firstHit = null
    for (const blocker of blockers) {
        if (boxesIntersect(entity, blocker)) continue
        if (!rangesOverlap(
            entity[otherAxis],
            entity[otherAxis] + entity[otherSize],
            blocker[otherAxis],
            blocker[otherAxis] + blocker[otherSize]
        )) continue

        const entityMin = entity[axis]
        const entityMax = entity[axis] + entity[size]
        const blockerMin = blocker[axis]
        const blockerMax = blocker[axis] + blocker[size]
        const startsBeforeBlocker = entityMax <= blockerMin
        const startsAfterBlocker = entityMin >= blockerMax

        if (direction > 0 && startsAfterBlocker) continue
        if (direction < 0 && startsBeforeBlocker) continue

        const gap = direction > 0
            ? blockerMin - entityMax
            : entityMin - blockerMax
        const time = Math.max(0, gap) / maxDistance

        if (time > 1) continue
        if (!firstHit || time < firstHit.time) firstHit = { blocker, time }
    }

    return firstHit
}

function resolveCollisions(entity, blockers) {
    let collided = false
    for (const blocker of blockers) {
        if (resolveCollision(entity, blocker)) collided = true
    }

    return collided ? { swept: false } : null
}

export function resolveCollision(a, b) {
    if (!boxesIntersect(a, b)) return false

    const leftOverlap = a.x + a.width - b.x
    const rightOverlap = b.x + b.width - a.x
    const topOverlap = a.y + a.height - b.y
    const bottomOverlap = b.y + b.height - a.y
    const xOverlap = leftOverlap < rightOverlap ? -leftOverlap : rightOverlap
    const yOverlap = topOverlap < bottomOverlap ? -topOverlap : bottomOverlap

    if (Math.abs(xOverlap) < Math.abs(yOverlap)) {
        a.x += xOverlap
    } else {
        a.y += yOverlap
    }

    return true
}

/**
 * returns a new box ensuring it keeps the same effective top-left position,
 * just with positive width and height values
 */
export function getNormalizedBox(box) {
    const left = Math.min(box.x, box.x + box.width)
    const top = Math.min(box.y, box.y + box.height)
    const right = Math.max(box.x, box.x + box.width)
    const bottom = Math.max(box.y, box.y + box.height)
    return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top
    }
}

export function pointIntersectsBox(point, box) {
    return point.x >= box.x
        && point.x <= box.x + box.width
        && point.y >= box.y
        && point.y <= box.y + box.height
}

function rangesOverlap(aMin, aMax, bMin, bMax) {
    return aMin < bMax && aMax > bMin
}

/**
 * returns true if two boxes intersect, otherwise false
 */
export function boxesIntersect(a, b) {
    if (a.width === 0 || a.height === 0) return false
    if (b.width === 0 || b.height === 0) return false

    return a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y
}

/**
 * Returns the bounding box of boxes or points in any combination.
 * Pads the bounding box on each side by options.pad if provided
 */
export function boundingBox(a, b) {
    const left = Math.min(a.x, b.x)
    const right = Math.max(a.x + (a.width ?? 0), b.x + (b.width ?? 0))
    const top = Math.min(a.y, b.y)
    const bottom = Math.max(a.y + (a.height ?? 0), b.y + (b.height ?? 0))

    return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top
    }
}
