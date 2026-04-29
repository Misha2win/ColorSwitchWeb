import Vector from './Vector.js'

const physics = {
    gravity: 2400,
    maxFallSpeed: 1800,
}

export function calculatePhysics(delta, level) {
    const entities = level.entities
    const blockers = [...level.blockers, ...level.ghostBlockers]
    const triggers = [...level.triggers, ...level.ghostTriggers]
    const player = level.player

    if (!player) return

    const playerVelocity = new Vector(0, player.yVelocity)
    if (player.requestLeft) playerVelocity.x -= player.speed
    if (player.requestRight) playerVelocity.x += player.speed

    if (player.requestJump && player.canJump()) { // Jump
        playerVelocity.y = -player.jumpSpeed
        player.onJump()
    }

    // Apply gravity
    playerVelocity.y = Math.min(
        playerVelocity.y + physics.gravity * delta,
        physics.maxFallSpeed
    )

    const collisionCandidates = []
    for (const blocker of blockers) {
        if (blocker.canCollideWith(player)) {
            collisionCandidates.push(blocker)
        }
    }

    player.x += playerVelocity.x * delta
    for (const blocker of collisionCandidates)
        if (resolveCollision(player, blocker)) playerVelocity.x = 0
    player.y += playerVelocity.y * delta
    player.onGround = false
    for (const blocker of collisionCandidates) {
        const y = player.y
        if (!resolveCollision(player, blocker)) continue
        if (player.y < y) player.onGround = true
        playerVelocity.y = 0
    }
    player.yVelocity = playerVelocity.y

    for (const entity1 of entities) {
        for (const entity2 of entities) {
            if (entity1 === entity2) continue
            if (!boxesIntersect(entity1, entity2)) continue

            if (entity1.canCollideWith(entity2)) entity1.onCollide(entity2)
            if (entity2.canCollideWith(entity1)) entity2.onCollide(entity1)
        }
    }

    for (const entity of entities) entity.resolvePhysics()

    for (const trigger of triggers) {
        if (!trigger.canCollideWith(player)) continue
        if (!boxesIntersect(player, trigger)) continue

        trigger.onCollide(player)
    }
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
