import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = '/Users/misha/eclipse-workspace/ColorSwitch-master/ColorSwitch/resources/level'
const sourceLevels = path.join(sourceRoot, 'levels')
const targetLevels = 'public/resources/levels'

const numberValue = (value) => Number(value)
const booleanValue = (value) => value === 'true'

function platformEntity(tokens) {
    const [, type, ...args] = tokens

    if (type === 'Platform' || type === 'FragilePlatform') {
        const [color, x, y, width, height] = args
        return {
            type,
            x: numberValue(x),
            y: numberValue(y),
            width: numberValue(width),
            height: numberValue(height),
            color
        }
    }

    if (type === 'PhotonicPlatform') {
        const [x, y, width, height] = args
        return {
            type,
            x: numberValue(x),
            y: numberValue(y),
            width: numberValue(width),
            height: numberValue(height)
        }
    }

    if (type === 'MovingPlatform') {
        const [color, startX, startY, endX, endY, width, height] = args
        return {
            type,
            x: numberValue(startX),
            y: numberValue(startY),
            startX: numberValue(startX),
            startY: numberValue(startY),
            endX: numberValue(endX),
            endY: numberValue(endY),
            width: numberValue(width),
            height: numberValue(height),
            color
        }
    }

    if (type === 'HealthGate') {
        const [healing, health, x, y, width, height] = args
        return {
            type,
            healing: booleanValue(healing),
            health: numberValue(health),
            x: numberValue(x),
            y: numberValue(y),
            width: numberValue(width),
            height: numberValue(height)
        }
    }

    return { type, args }
}

function pointEntity(tokens) {
    const [, type, ...args] = tokens

    if (type === 'SpawnPoint') {
        const [x, y, active, obtainable] = args
        return {
            type: 'Spawn',
            x: numberValue(x),
            y: numberValue(y),
            active: booleanValue(active),
            obtainable: booleanValue(obtainable)
        }
    }

    if (type === 'GoalPoint') {
        const [x, y, color] = args
        return {
            type: 'Goal',
            x: numberValue(x),
            y: numberValue(y),
            color
        }
    }

    if (type === 'PortalPoint') {
        const [x, y, id] = args
        return {
            type: 'Portal',
            x: numberValue(x),
            y: numberValue(y),
            id: numberValue(id)
        }
    }

    return { type, args }
}

function obstacleEntity(tokens) {
    const [, type, ...args] = tokens

    if (type === 'Prism') {
        const [color, x, y, rotation] = args
        return {
            type,
            x: numberValue(x),
            y: numberValue(y),
            color,
            rotation: numberValue(rotation)
        }
    }

    const [x, y, width, height] = args
    return {
        type,
        x: numberValue(x),
        y: numberValue(y),
        width: numberValue(width),
        height: numberValue(height)
    }
}

function itemEntity(tokens) {
    const [, type, ...args] = tokens

    if (type === 'ColorChanger') {
        const [color, x, y] = args
        return {
            type,
            x: numberValue(x),
            y: numberValue(y),
            color
        }
    }

    if (type === 'ColorMixer') {
        const [color, x, y, additive] = args
        return {
            type,
            x: numberValue(x),
            y: numberValue(y),
            color,
            additive: booleanValue(additive)
        }
    }

    if (type === 'Mirror' || type === 'Painter') {
        const [x, y, color, rotated] = type === 'Mirror' ? args : [args[1], args[2], args[0], args[3]]
        return {
            type,
            x: numberValue(x),
            y: numberValue(y),
            color,
            rotated: booleanValue(rotated)
        }
    }

    if (type === 'SizeChanger') {
        const [x, y, grow] = args
        return {
            type,
            x: numberValue(x),
            y: numberValue(y),
            grow: booleanValue(grow)
        }
    }

    if (type === 'Teleporter') {
        const [x, y, fixedDestination, destinationX, destinationY] = args
        return {
            type,
            x: numberValue(x),
            y: numberValue(y),
            fixedDestination: booleanValue(fixedDestination),
            destinationX: numberValue(destinationX),
            destinationY: numberValue(destinationY)
        }
    }

    if (type === 'SuperJump' || type === 'HealthPack' || type === 'DamagePack') {
        const [x, y] = args
        return {
            type,
            x: numberValue(x),
            y: numberValue(y)
        }
    }

    return { type, args }
}

function convertLevel(filePath) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    const level = {
        color: null,
        entities: [],
        texts: []
    }

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith('//')) continue

        const tokens = line.split(/\s+/)
        const [kind] = tokens

        if (kind === 'level') {
            level.color = tokens[1]
        } else if (kind === 'platform') {
            level.entities.push(platformEntity(tokens))
        } else if (kind === 'point') {
            level.entities.push(pointEntity(tokens))
        } else if (kind === 'obstacle') {
            level.entities.push(obstacleEntity(tokens))
        } else if (kind === 'item') {
            level.entities.push(itemEntity(tokens))
        } else if (kind === 'text') {
            level.texts.push(line.slice('text '.length))
        }
    }

    if (!level.color) throw new Error(`Missing level color in ${filePath}`)
    if (!level.texts.length) delete level.texts
    return level
}

const order = fs
    .readFileSync(path.join(sourceRoot, 'LevelsOrder.levels'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

fs.mkdirSync(targetLevels, { recursive: true })

const levelNames = fs
    .readdirSync(sourceLevels)
    .filter((fileName) => fileName.endsWith('.level'))
    .map((fileName) => path.basename(fileName, '.level'))
    .sort()

for (const levelName of levelNames) {
    const sourcePath = path.join(sourceLevels, `${levelName}.level`)
    const targetPath = path.join(targetLevels, `${levelName}.json`)
    const level = convertLevel(sourcePath)
    fs.writeFileSync(targetPath, `${JSON.stringify(level, null, 3)}\n`)
}

fs.writeFileSync(
    'public/resources/levelOrder.json',
    `${JSON.stringify({ levelOrder: order, NotUsed: [] }, null, 3)}\n`
)

console.log(`Converted ${levelNames.length} levels. Wrote ${order.length} ordered levels.`)
