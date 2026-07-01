const levelOrderNamePattern = /^[A-Za-z0-9_-]+$/

function hasInvalidLevelOrderName(names) {
    return names.some(name => typeof name !== 'string' || !levelOrderNamePattern.test(name))
}

export function validateLevelOrderJSON(levelOrderJSON) {
    if (!levelOrderJSON || typeof levelOrderJSON !== 'object' || Array.isArray(levelOrderJSON)) {
        throw new Error('Level order JSON must be an object.')
    }
    if (!Array.isArray(levelOrderJSON.levelOrder)) {
        throw new Error('Level order JSON must include levelOrder[].')
    }

    if (hasInvalidLevelOrderName(levelOrderJSON.levelOrder)) {
        throw new Error('levelOrder[] can only contain level names with letters, numbers, underscores, and hyphens.')
    }

    if (levelOrderJSON.NotUsed != null) {
        if (!Array.isArray(levelOrderJSON.NotUsed)) {
            throw new Error('NotUsed must be an array when it is included.')
        }

        if (hasInvalidLevelOrderName(levelOrderJSON.NotUsed)) {
            throw new Error('NotUsed[] can only contain level names with letters, numbers, underscores, and hyphens.')
        }
    }

    if (levelOrderJSON.mobileLevels != null) {
        if (typeof levelOrderJSON.mobileLevels !== 'object' || Array.isArray(levelOrderJSON.mobileLevels)) {
            throw new Error('mobileLevels must be an object when it is included.')
        }

        const mobileLevelNames = Object
            .entries(levelOrderJSON.mobileLevels)
            .flatMap(([levelName, mobileLevelName]) => [levelName, mobileLevelName])
        if (hasInvalidLevelOrderName(mobileLevelNames)) {
            throw new Error('mobileLevels can only contain level names with letters, numbers, underscores, and hyphens.')
        }
    }
}

export async function fetchLevelOrderJSON() {
    const response = await fetch('api/level-order', { cache: 'no-store' })
    if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to load resources/levelOrder.json.')
    }

    return response.json()
}

export async function overwriteLevelOrderFile(levelOrderJSON) {
    validateLevelOrderJSON(levelOrderJSON)
    const response = await fetch('api/level-order', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(levelOrderJSON)
    })

    if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to save resources/levelOrder.json.')
    }

    return response.json()
}

export async function fetchCanOverwriteLevelFiles() {
    try {
        const response = await fetch('api/levels', { cache: 'no-store' })
        if (!response.ok) return false

        const capabilities = await response.json()
        return capabilities.canOverwriteLevels === true
    } catch (err) {
        return false
    }
}
