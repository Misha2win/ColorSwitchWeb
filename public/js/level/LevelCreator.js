import Level from './Level.js'
import * as EntityCreator from './EntityCreator.js'
import Color from '../entity/Color.js'

function createEntity(obj) {
    const maker = EntityCreator.registry.get(obj.type)
    if (!maker) {
        console.log('Unknown type: ' + obj.type)
        return null
    }
    return maker(obj)
}

/**
 * Loads a level from a levelJson string
 */
export async function loadLevelFromJSON(levelJSON, name = 'noname') {
    if (!Array.isArray(levelJSON.entities)) throw new Error('Level missing entities[]')
    if (!levelJSON.color) throw new Error('Level missing starting color')

    return new Level(name, Color.getColor(levelJSON.color), levelJSON.entities.map(createEntity).filter(Boolean))
}

const loadedLevels = new Map() // Maps level name to level

/**
 * Gets a level with provided name. If level is in the level cache, it will return that level,
 * else, it checks '/resources/levels/' for a json with the name and creates the level from the json.
 * Accepts name and options if options.forceload is true, it will load the level regardless of cache
 */
export async function loadLevel(name, options = { forceLoad: false }) {
    if (!options.forceLoad && loadedLevels.has(name)) return loadedLevels.get(name)

    const resource = await fetch(`resources/levels/${name}.json`)
    if (!resource.ok) throw new Error(`Failed to load ${name}: ${resource.status}`)

    const level = loadLevelFromJSON(await resource.json(), name)

    loadedLevels.set(name, level)
    return loadedLevels.get(name)
}

const levelOrder = []

/**
 * Gets and returns the level order from the levelOrder.json file in /resources/
 */
export async function getLevelOrderLevels(options = { forceLoad: false }) {
    if (!options.forceLoad && levelOrder.length) return levelOrder

    const url = 'resources/levelOrder.json'
    const resource = await fetch(url)
    if (!resource.ok) throw new Error(`Failed to load ${url}: ${resource.status}`)
    const data = await resource.json()

    if (!Array.isArray(data.levelOrder)) throw new Error('Level missing levelOrder[]')

    levelOrder.length = 0
    levelOrder.push(...data.levelOrder)
    return levelOrder
}
