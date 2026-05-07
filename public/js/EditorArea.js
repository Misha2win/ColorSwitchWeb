import Color from './entity/Color.js'
import Player from './entity/Player.js'
import Level from './level/Level.js'
import * as EntityCreator from './level/EntityCreator.js'
import * as LevelCreator from './level/LevelCreator.js'
import * as Physics from './math/PhysicsEngine.js'
import { promptInput, dialog, copyableDialog, confirmDialog, editableTextDialog } from './utility/Prompt.js'

const colorChoices = [
    'black',
    'red',
    'green',
    'blue',
    'yellow',
    'magenta',
    'cyan',
    'white',
    'gray'
]
const editorCurrentLevelStorageKey = 'colorswitch.editor.currentLevelName'
const touchDragLiftOffset = { x: 0, y: -120 }
const noDragLiftOffset = { x: 0, y: 0 }
const touchHitSlop = 12
const minimumVisibleDraggedPixels = 10
const levelUiHeight = 95
const draftLevelSelectValue = '__editor-draft-level__'
const spawnSize = 20
const levelOrderNamePattern = /^[A-Za-z0-9_-]+$/

function camelToTitle(input) {
    return input
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase())
}

function getPropertyValue(entity, property) {
    if (property.get) return property.get(entity)

    return entity[property.name]
}

function setPropertyValue(entity, property, value) {
    if (property.set) {
        property.set(entity, value)
        return
    }

    entity[property.name] = value
}

function valueToFormValue(value) {
    if (value instanceof Color) return value.name
    if (value == null) return ''

    return String(value)
}

function normalizeNumberValue(value, property) {
    if (!Number.isFinite(value)) return null
    if (!property.roundTo) return value

    const roundedValue = Math.round(value / property.roundTo) * property.roundTo
    if (property.min == null) return roundedValue

    return Math.max(property.min, roundedValue)
}

function readFormValue(event, property) {
    if (property.type === 'boolean') return event.target.checked
    if (property.type === 'color') return Color.getColor(event.target.value)
    if (property.type !== 'number') {
        const value = event.target.value
        if (property.nullable && value.trim() === '') return null

        return value
    }

    const value = event.target.valueAsNumber
    return normalizeNumberValue(value, property)
}

function createSelect(options, value) {
    const select = document.createElement('select')
    for (const optionValue of options) {
        const option = document.createElement('option')
        option.value = optionValue
        option.textContent = optionValue
        select.appendChild(option)
    }
    select.value = value

    return select
}

function isAbstractEditorMethodError(err, methodName) {
    return err instanceof Error && err.message.startsWith(methodName)
}

function isSpawnTool(type) {
    return type === 'Spawn'
}

function getEntityToolLabel(type) {
    if (isSpawnTool(type)) return 'Spawn Point'

    return camelToTitle(type)
}

function getDragLiftOffset(event) {
    return event?.pointerType === 'touch' ? touchDragLiftOffset : noDragLiftOffset
}

function getHitSlop(event) {
    return event?.pointerType === 'touch' ? touchHitSlop : 0
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
}

function expandBox(box, amount) {
    if (!amount) return box

    return {
        x: box.x - amount,
        y: box.y - amount,
        width: box.width + amount * 2,
        height: box.height + amount * 2
    }
}

function copySpawn(spawn) {
    return {
        x: spawn.x,
        y: spawn.y
    }
}

function copyPosition(target) {
    return {
        x: target.x,
        y: target.y
    }
}

function positionsMatch(first, second) {
    return first.x === second.x && first.y === second.y
}

function getSpawnBox(spawn) {
    return {
        x: spawn.x,
        y: spawn.y,
        width: spawnSize,
        height: spawnSize
    }
}

function readStoredCurrentLevelName() {
    try {
        return localStorage.getItem(editorCurrentLevelStorageKey)
    } catch {
        return null
    }
}

function storeCurrentLevelName(name) {
    try {
        if (name) {
            localStorage.setItem(editorCurrentLevelStorageKey, name)
        } else {
            localStorage.removeItem(editorCurrentLevelStorageKey)
        }
    } catch {
        // Ignore storage errors so the editor still works in private or restricted contexts.
    }
}

function drawSpawnMarker(context, spawn, color) {
    if (color === Color.WHITE || color === Color.YELLOW) {
        context.beginPath()
        context.ellipse(
            spawn.x + 10,
            spawn.y + 10,
            5,
            5,
            0,
            0,
            Math.PI * 2
        )
        context.fillStyle = Color.BLACK
        context.fill()
        context.beginPath()
        context.ellipse(
            spawn.x + 10,
            spawn.y + 10,
            4,
            4,
            0,
            0,
            Math.PI * 2
        )
        context.fillStyle = color.drawColor
        context.fill()
    } else {
        context.beginPath()
        context.ellipse(
            spawn.x + 10,
            spawn.y + 10,
            5,
            5,
            0,
            0,
            Math.PI * 2
        )
        context.fillStyle = color.drawColor
        context.fill()
    }
}

function getEditableProperties(entity) {
    if (!entity || typeof entity.getProperties !== 'function') return []

    try {
        return entity.getProperties() ?? []
    } catch (err) {
        if (isAbstractEditorMethodError(err, 'Entity.getProperties')) return []

        throw err
    }
}

function canResizeEntity(entity) {
    return getEditableProperties(entity).some(property => property.name === 'width' || property.name === 'height')
}

function populatePropertyEditor(entity) {
    const form = document.getElementById('property-editor-form')
    form.innerHTML = ''

    if (!entity) {
        form.textContent = 'Selected entity properties will go here.'
        return
    }

    const editableProperties = getEditableProperties(entity)
    if (!editableProperties.length) {
        form.textContent = 'This entity does not have editable properties.'
        return
    }

    for (const property of editableProperties) {
        const div = document.createElement('div')
        div.setAttribute('class', 'property-form-group')
        form.appendChild(div)

        const id = `property-${property.name}`
        const label = document.createElement('label')
        label.setAttribute('for', id)
        label.textContent = property.label ?? camelToTitle(property.name)
        div.appendChild(label)

        const currentValue = getPropertyValue(entity, property)
        const formValue = valueToFormValue(currentValue)
        const input = createPropertyInput(property, formValue)
        input.setAttribute('id', id)
        input.setAttribute('name', id)
        div.appendChild(input)

        const eventName = property.type === 'select' || property.type === 'color' || property.type === 'boolean'
            ? 'change'
            : 'input'
        input.addEventListener(eventName, (event) => {
            const value = readFormValue(event, property)
            if (value == null && property.type === 'number') return
            setPropertyValue(entity, property, value)
        })

        if (property.type === 'number') {
            input.addEventListener('change', () => {
                const value = readFormValue({ target: input }, property)
                if (value != null) setPropertyValue(entity, property, value)
                input.value = valueToFormValue(getPropertyValue(entity, property))
            })
        }
    }
}

function populateSpawnPropertyEditor(editor) {
    const form = document.getElementById('property-editor-form')
    form.innerHTML = ''

    const div = document.createElement('div')
    div.setAttribute('class', 'property-form-group')
    form.appendChild(div)

    const label = document.createElement('label')
    label.setAttribute('for', 'property-level-color')
    label.textContent = 'Start Color'
    div.appendChild(label)

    const select = createSelect(colorChoices, editor.levelColor)
    select.setAttribute('id', 'property-level-color')
    select.setAttribute('name', 'property-level-color')
    select.addEventListener('change', event => editor.setLevelColor(event.target.value))
    div.appendChild(select)
}

function createPropertyInput(property, value) {
    if (property.type === 'color') return createSelect(colorChoices, value)
    if (property.type === 'select') return createSelect(property.options ?? [], value)
    if (property.type === 'textarea') {
        const textarea = document.createElement('textarea')
        textarea.value = value
        return textarea
    }

    const input = document.createElement('input')
    input.setAttribute('type', property.type === 'boolean' ? 'checkbox' : property.type)
    if (property.type === 'boolean') {
        input.checked = value === 'true'
        return input
    }

    if (property.type === 'number') {
        if (property.step != null) input.setAttribute('step', property.step)
        if (property.min != null) input.setAttribute('min', property.min)
    }
    input.value = value

    return input
}

function createEntityFromJSON(entityJSON) {
    const maker = EntityCreator.registry.get(entityJSON.type)
    if (!maker) return null

    return maker(entityJSON)
}

function entityToJSON(entity) {
    if (!entity || typeof entity.toJSON !== 'function') return null

    try {
        return entity.toJSON()
    } catch (err) {
        if (isAbstractEditorMethodError(err, 'Entity.toJSON')) return null

        throw err
    }
}

function offsetEntityJSON(entityJSON, dx, dy) {
    const copy = { ...entityJSON }
    if (typeof copy.x === 'number') copy.x += dx
    if (typeof copy.y === 'number') copy.y += dy
    if (typeof copy.startX === 'number') copy.startX += dx
    if (typeof copy.startY === 'number') copy.startY += dy
    if (typeof copy.endX === 'number' && entityJSON.type !== 'Teleporter') copy.endX += dx
    if (typeof copy.endY === 'number' && entityJSON.type !== 'Teleporter') copy.endY += dy

    return copy
}

function getUnsupportedTypes(levelJSON) {
    if (!Array.isArray(levelJSON.entities)) return []

    return [...new Set(
        levelJSON.entities
            .filter(entityJSON => !EntityCreator.registry.has(entityJSON.type))
            .map(entityJSON => entityJSON.type ?? '(missing type)')
    )]
}

function hasInvalidLevelOrderName(names) {
    return names.some(name => typeof name !== 'string' || !levelOrderNamePattern.test(name))
}

function validateLevelOrderJSON(levelOrderJSON) {
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
}

function copyLevelJSON(levelJSON) {
    return JSON.parse(JSON.stringify(levelJSON))
}

function createStarterLevelJSON() {
    return {
        color: 'gray',
        spawn: { x: 20, y: 560 },
        entities: [
            { type: "Platform", x: 10, y: 10, width: 730, height: 10, color: "black" },
            { type: "Platform", x: 10, y: 10, width: 10, height: 580, color: "black" },
            { type: "Platform", x: 730, y: 10, width: 10, height: 580, color: "black" },
            { type: "Platform", x: 10, y: 580, width: 730, height: 10, color: "black" },
            { type: "Goal", x: 710, y: 560, color: "gray" },
        ]
    }
}

async function fetchLevelJSON(name) {
    const resource = await fetch(`resources/levels/${name}.json`)
    if (!resource.ok) throw new Error(`Failed to load ${name}: ${resource.status}`)

    return resource.json()
}

function downloadFile(name, contents, mime = 'text/plain') {
    const blob = new Blob([contents], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

function getLevelFileBaseName(name) {
    const trimmedName = name.trim().replace(/\.json$/i, '')
    const pathParts = trimmedName.split(/[\\/]/)
    return pathParts[pathParts.length - 1]
}

async function overwriteLevelFile(name, levelJSON) {
    const response = await fetch(`api/levels/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(levelJSON)
    })

    if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Failed to save ${name}.json`)
    }

    return response.json()
}

async function fetchLevelOrderJSON() {
    const response = await fetch('api/level-order', { cache: 'no-store' })
    if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to load resources/levelOrder.json.')
    }

    return response.json()
}

async function overwriteLevelOrderFile(levelOrderJSON) {
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

async function fetchCanOverwriteLevelFiles() {
    try {
        const response = await fetch('api/levels', { cache: 'no-store' })
        if (!response.ok) return false

        const capabilities = await response.json()
        return capabilities.canOverwriteLevels === true
    } catch (err) {
        return false
    }
}

export default class EditorArea {

    constructor(canvasId = 'editor-canvas') {
        this.canvasId = canvasId

        this.width = null
        this.height = null
        this.canvas = null
        this.context = null
        this.animationFrameId = null
        this.lastTime = 0
        this.mouseInfo = null
        this.activePointerId = null
        this.dragInfo = null

        this.rect = false
        this.selectedEntity = null
        this.selectedSpawn = false
        this.selectedEntityMoved = false
        this.entities = []
        this.spawn = { x: 30, y: 30 }
        this.pendingMoveAction = null
        this.undoStack = []
        this.redoStack = []

        this.type = 'Spawn'
        this.levelColor = 'red'
        this.levelNames = []
        this.levelJSONByName = new Map()
        this.levelLoadingPromise = null
        this.currentLevelIndex = -1
        this.currentLevelName = null
        this.canOverwriteLevelFiles = false

        this.playingLevel = false
        this.playSnapshot = null
        this.previewPlayer = null
    }

    start() {
        this.canvas = document.getElementById(this.canvasId)
        this.width = this.canvas.width
        this.height = this.canvas.height
        this.setLevelUIVisible(false)

        this.context = this.canvas.getContext('2d')

        this.spawn = { x: 30, y: 30 }
        this.entities = []
        this.selectedSpawn = false
        this.mouseInfo = { held: false, previous: { x: 0, y: 0 }, position: { x: 0, y: 0 } }
        this.activePointerId = null
        this.dragInfo = null
        this.pendingMoveAction = null
        this.undoStack = []
        this.redoStack = []
        this.syncLevelNavigationControls('Loading levels...')
        this.syncHistoryControls()
        this.checkOverwriteSupport()

        this.lastTime = performance.now()
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = requestAnimationFrame(now => this.loop(now))

        this.loadUsedLevels().catch((err) => {
            this.syncLevelNavigationControls('Levels failed to load')
            dialog('There was an error loading levels:', err.message)
        })
    }

    advanceLevel() {
        this.stopPlayingLevel()
    }

    loop(now = performance.now()) {
        const delta = Math.min((now - this.lastTime) / 1000, 0.05)
        this.lastTime = now

        const { context, rect } = this

        this.clear()
        if (this.playingLevel) {
            const level = this.playingLevel
            level.preparePhysics(delta)
            Physics.calculatePhysics(delta, level)
            level.update(delta)

            if (level.player?.requestRestart) {
                this.restartPlayingLevel()
            } else {
                level.draw(context)
            }
        } else {
            this.drawGrid(context)

            context.save()
            drawSpawnMarker(context, this.spawn, Color.getColor(this.levelColor))
            context.restore()
            if (this.selectedSpawn) {
                context.fillStyle = 'rgba(0, 100, 200, 0.4)'
                context.fillRect(this.spawn.x - 5, this.spawn.y - 5, spawnSize + 10, spawnSize + 10)
            }

            for (const entity of this.entities) {
                context.save()
                entity.draw(context)
                context.restore()
                if (entity === this.selectedEntity) {
                    context.fillStyle = 'rgba(0, 100, 200, 0.4)'
                    context.fillRect(entity.x - 5, entity.y - 5, entity.width + 10, entity.height + 10)
                }
            }

            if (rect) {
                const previewRect = Physics.getNormalizedBox(rect)
                context.fillStyle = 'rgba(0, 100, 200, 0.4)'
                context.fillRect(previewRect.x, previewRect.y, previewRect.width, previewRect.height)
            }
        }

        this.animationFrameId = requestAnimationFrame(nextNow => this.loop(nextNow))
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    stop() {
        if (!this.animationFrameId) return
        cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = null
    }

    drawGrid(context) {
        const gridSize = 10

        context.save()
        context.lineWidth = 1
        context.lineCap = 'butt'
        context.strokeStyle = 'rgba(23, 32, 42, 0.14)'

        context.beginPath()
        for (let y = gridSize; y < this.height; y += gridSize) {
            const crispY = y + 0.5
            context.moveTo(0, crispY)
            context.lineTo(this.width, crispY)
        }
        for (let x = gridSize; x < this.width; x += gridSize) {
            const crispX = x + 0.5
            context.moveTo(crispX, 0)
            context.lineTo(crispX, this.height)
        }
        context.stroke()

        context.strokeStyle = 'rgba(23, 32, 42, 0.3)'
        context.beginPath()
        const middleX = Math.round(this.width / 2) + 0.5
        const middleY = Math.round(this.height / 2) + 0.5
        context.moveTo(middleX, 0)
        context.lineTo(middleX, this.height)
        context.moveTo(0, middleY)
        context.lineTo(this.width, middleY)
        context.stroke()
        context.restore()
    }

    round(value) {
        return Math.round(value / 10) * 10
    }

    setLevelUIVisible(showingLevelUI) {
        this.canvas.height = this.height + (showingLevelUI ? levelUiHeight : 0)
    }

    getVisiblePosition(box) {
        const width = Math.max(0, box.width ?? 0)
        const height = Math.max(0, box.height ?? 0)
        const visibleWidth = Math.min(minimumVisibleDraggedPixels, width)
        const visibleHeight = Math.min(minimumVisibleDraggedPixels, height)

        return {
            x: clamp(box.x, visibleWidth - width, this.width - visibleWidth),
            y: clamp(box.y, visibleHeight - height, this.height - visibleHeight)
        }
    }

    keepBoxVisible(box) {
        Object.assign(box, this.getVisiblePosition(box))
    }

    keepSpawnVisible() {
        Object.assign(this.spawn, this.getVisiblePosition(getSpawnBox(this.spawn)))
    }

    getPointerId(event) {
        return event.pointerId ?? 'mouse'
    }

    capturePointer(pointerId) {
        try {
            this.canvas.setPointerCapture?.(pointerId)
        } catch {
            // Synthetic pointer events do not always have an active browser pointer to capture.
        }
    }

    releasePointer(pointerId) {
        try {
            if (this.canvas.hasPointerCapture?.(pointerId)) {
                this.canvas.releasePointerCapture(pointerId)
            }
        } catch {
            // Synthetic pointer events do not always have an active browser pointer to release.
        }
    }

    updatePointerPosition(event) {
        if (!event) return

        const canvasRect = this.canvas.getBoundingClientRect()
        const hasClientPosition = typeof event.clientX === 'number' && typeof event.clientY === 'number'
        const position = hasClientPosition && canvasRect.width && canvasRect.height
            ? {
                x: (event.clientX - canvasRect.left) * (this.canvas.width / canvasRect.width),
                y: (event.clientY - canvasRect.top) * (this.canvas.height / canvasRect.height)
            }
            : { x: event.offsetX, y: event.offsetY }

        Object.assign(this.mouseInfo, {
            previous: { x: this.mouseInfo.position.x, y: this.mouseInfo.position.y },
            position
        })
    }

    findSpawnAt(point, event) {
        const boundingBox = expandBox(getSpawnBox(this.spawn), getHitSlop(event))
        return Physics.pointIntersectsBox(point, boundingBox) ? this.spawn : null
    }

    findEntityAt(point, event) {
        const hitSlop = getHitSlop(event)
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i]
            const boundingBox = expandBox(Physics.boundingBox(entity, entity), hitSlop)
            if (Physics.pointIntersectsBox(point, boundingBox)) return entity
        }

        return null
    }

    getPlacementRect() {
        const position = {
            x: this.round(this.mouseInfo.position.x),
            y: this.round(this.mouseInfo.position.y)
        }
        if (isSpawnTool(this.type)) {
            return {
                ...position,
                width: 20, // PLAYER SIZE
                height: 20,
                fixed: true
            }
        }

        const entity = createEntityFromJSON({ type: this.type, ...position, width: 0, height: 0 })
        if (entity && !canResizeEntity(entity)) {
            return {
                ...position,
                width: entity.width,
                height: entity.height,
                fixed: true
            }
        }

        return {
            ...position,
            width: 0,
            height: 0
        }
    }

    createDragInfo(target, pointerPosition, event) {
        return {
            target,
            liftOffset: getDragLiftOffset(event),
            grabOffset: {
                x: pointerPosition.x - target.x,
                y: pointerPosition.y - target.y
            }
        }
    }

    createMoveAction(targetType, target) {
        return {
            targetType,
            target,
            before: copyPosition(target),
            after: copyPosition(target)
        }
    }

    createPendingMoveAction(entity, spawn) {
        if (entity) return this.createMoveAction('entity', entity)
        if (spawn) return this.createMoveAction('spawn', this.spawn)

        return null
    }

    commitPendingMove() {
        const pendingMoveAction = this.pendingMoveAction
        this.pendingMoveAction = null
        if (!pendingMoveAction) return

        const moveAction = {
            ...pendingMoveAction,
            after: copyPosition(pendingMoveAction.target)
        }
        if (positionsMatch(moveAction.before, moveAction.after)) {
            this.syncHistoryControls()
            return
        }

        this.undoStack.push(moveAction)
        this.redoStack = []
        this.syncHistoryControls()
    }

    clearMoveHistory() {
        this.pendingMoveAction = null
        this.undoStack = []
        this.redoStack = []
        this.syncHistoryControls()
    }

    canApplyMoveAction(action) {
        if (action.targetType === 'spawn') return action.target === this.spawn

        return this.entities.includes(action.target)
    }

    applyMoveAction(action, position) {
        if (!this.canApplyMoveAction(action)) return false

        Object.assign(action.target, position)
        this.selectedEntity = action.targetType === 'entity' ? action.target : null
        this.selectedSpawn = action.targetType === 'spawn'
        this.selectedEntityMoved = false
        this.rect = false
        this.dragInfo = null
        this.syncPropertyEditor()
        this.syncSelectionControls()

        return true
    }

    undoMove() {
        if (this.playingLevel) return false

        const moveAction = this.undoStack.pop()
        if (!moveAction) {
            this.syncHistoryControls()
            return false
        }

        if (!this.applyMoveAction(moveAction, moveAction.before)) {
            this.syncHistoryControls()
            return false
        }

        this.redoStack.push(moveAction)
        this.syncHistoryControls()
        return true
    }

    redoMove() {
        if (this.playingLevel) return false

        const moveAction = this.redoStack.pop()
        if (!moveAction) {
            this.syncHistoryControls()
            return false
        }

        if (!this.applyMoveAction(moveAction, moveAction.after)) {
            this.syncHistoryControls()
            return false
        }

        this.undoStack.push(moveAction)
        this.syncHistoryControls()
        return true
    }

    getDragTarget(target, pointerPosition) {
        const dragInfo = this.dragInfo
        if (!dragInfo || dragInfo.target !== target) return null

        return {
            x: pointerPosition.x + dragInfo.liftOffset.x - dragInfo.grabOffset.x,
            y: pointerPosition.y + dragInfo.liftOffset.y - dragInfo.grabOffset.y
        }
    }

    getSelectedEntityDragTarget(pointerPosition) {
        return this.getDragTarget(this.selectedEntity, pointerPosition)
    }

    moveSelectedEntity(mouse) {
        const dragTarget = this.getSelectedEntityDragTarget(mouse.position)
        if (dragTarget) {
            const moved = this.selectedEntity.x !== dragTarget.x || this.selectedEntity.y !== dragTarget.y
            if (moved) {
                this.selectedEntityMoved = true
                Object.assign(this.selectedEntity, dragTarget)
            }
            return
        }

        const dx = mouse.position.x - mouse.previous.x
        const dy = mouse.position.y - mouse.previous.y
        if (dx || dy) {
            this.selectedEntityMoved = true
            Object.assign(this.selectedEntity, {
                x: this.selectedEntity.x + dx,
                y: this.selectedEntity.y + dy
            })
        }
    }

    moveSelectedSpawn(mouse) {
        const dragTarget = this.getDragTarget(this.spawn, mouse.position)
        if (dragTarget) {
            const moved = this.spawn.x !== dragTarget.x || this.spawn.y !== dragTarget.y
            if (moved) {
                this.selectedEntityMoved = true
                Object.assign(this.spawn, dragTarget)
            }
            return
        }

        const dx = mouse.position.x - mouse.previous.x
        const dy = mouse.position.y - mouse.previous.y
        if (dx || dy) {
            this.selectedEntityMoved = true
            Object.assign(this.spawn, {
                x: this.spawn.x + dx,
                y: this.spawn.y + dy
            })
        }
    }

    moveFixedPlacementRect(mouse) {
        const dragTarget = this.getDragTarget(this.rect, mouse.position) ?? mouse.position
        Object.assign(this.rect, {
            x: this.round(dragTarget.x),
            y: this.round(dragTarget.y)
        })
    }

    onPointerDown(event) {
        if (this.playingLevel) return
        if (event.button != null && event.button !== 0) return

        event.preventDefault()
        this.activePointerId = this.getPointerId(event)
        this.capturePointer(this.activePointerId)
        this.updatePointerPosition(event)
        Object.assign(this.mouseInfo, {
            held: true
        })
        const mouse = this.mouseInfo
        const hadSelection = !!this.selectedEntity || this.selectedSpawn
        const entity = this.findEntityAt(mouse.position, event)
        const spawn = entity ? null : this.findSpawnAt(mouse.position, event)

        this.selectedEntity = entity
        this.selectedSpawn = !!spawn
        this.selectedEntityMoved = false
        this.pendingMoveAction = this.createPendingMoveAction(entity, spawn)
        if (entity?.type) this.setActiveEntityType(entity.type)
        if (spawn) this.setActiveEntityType('Spawn')
        if (entity) {
            populatePropertyEditor(entity)
        } else {
            this.syncPropertyEditor()
        }
        this.syncSelectionControls()
        if (entity) {
            this.dragInfo = this.createDragInfo(entity, mouse.position, event)
        } else if (spawn) {
            this.dragInfo = this.createDragInfo(this.spawn, mouse.position, event)
        } else if (hadSelection) {
            this.rect = false
            this.dragInfo = null
        } else {
            this.rect = this.getPlacementRect()
            this.dragInfo = this.rect.fixed ? this.createDragInfo(this.rect, mouse.position, event) : null
        }
    }

    onPointerMove(event) {
        if (this.activePointerId !== null && this.getPointerId(event) !== this.activePointerId) return
        if (this.activePointerId !== null) event.preventDefault()

        this.updatePointerPosition(event)
        const mouse = this.mouseInfo

        if (this.playingLevel) return

        if (mouse.held) {
            if (this.selectedEntity) {
                this.moveSelectedEntity(mouse)
            } else if (this.selectedSpawn) {
                this.moveSelectedSpawn(mouse)
            } else if (this.rect?.fixed) {
                this.moveFixedPlacementRect(mouse)
            } else if (this.rect) {
                Object.assign(this.rect, {
                    width: this.round(mouse.position.x - this.rect.x),
                    height: this.round(mouse.position.y - this.rect.y)
                })
            }
        }
    }

    onPointerUp(event) {
        if (this.activePointerId !== null && this.getPointerId(event) !== this.activePointerId) return

        event.preventDefault()
        this.updatePointerPosition(event)
        this.releasePointer(this.activePointerId)
        this.activePointerId = null
        if (this.selectedEntity && this.selectedEntityMoved) this.moveSelectedEntity(this.mouseInfo)
        if (this.selectedSpawn && this.selectedEntityMoved) this.moveSelectedSpawn(this.mouseInfo)
        if (!this.selectedEntity && this.rect?.fixed) this.moveFixedPlacementRect(this.mouseInfo)
        Object.assign(this.mouseInfo, {
            held: false
        })

        if (this.playingLevel) return

        if (this.selectedEntity) {
            if (this.selectedEntityMoved) {
                Object.assign(this.selectedEntity, {
                    x: this.round(this.selectedEntity.x),
                    y: this.round(this.selectedEntity.y)
                })
                this.keepBoxVisible(this.selectedEntity)
                populatePropertyEditor(this.selectedEntity)
            }
        } else if (this.selectedSpawn) {
            if (this.selectedEntityMoved) {
                Object.assign(this.spawn, {
                    x: this.round(this.spawn.x),
                    y: this.round(this.spawn.y)
                })
                this.keepSpawnVisible()
                this.syncPropertyEditor()
            }
        } else if (this.rect) {
            if (this.rect.fixed) this.keepBoxVisible(this.rect)
            const shouldCreate = this.rect.fixed || (this.rect.width && this.rect.height)
            if (shouldCreate) this.createEntity()
        }

        this.commitPendingMove()
        this.rect = false
        this.dragInfo = null
        this.selectedEntityMoved = false
        this.syncSelectionControls()
    }

    onPointerCancel(event) {
        if (this.activePointerId !== null && this.getPointerId(event) !== this.activePointerId) return

        event.preventDefault()
        this.releasePointer(this.activePointerId)
        this.activePointerId = null
        Object.assign(this.mouseInfo, {
            held: false
        })
        if (this.selectedEntity && this.selectedEntityMoved) {
            Object.assign(this.selectedEntity, {
                x: this.round(this.selectedEntity.x),
                y: this.round(this.selectedEntity.y)
            })
            this.keepBoxVisible(this.selectedEntity)
            populatePropertyEditor(this.selectedEntity)
        }
        if (this.selectedSpawn && this.selectedEntityMoved) {
            Object.assign(this.spawn, {
                x: this.round(this.spawn.x),
                y: this.round(this.spawn.y)
            })
            this.keepSpawnVisible()
            this.syncPropertyEditor()
        }
        this.commitPendingMove()
        this.rect = false
        this.dragInfo = null
        this.selectedEntityMoved = false
        this.syncSelectionControls()
    }

    createEntity() {
        const normRect = Physics.getNormalizedBox(this.rect)
        this.clearMoveHistory()
        if (isSpawnTool(this.type)) {
            this.spawn = copySpawn(normRect)
            this.selectedEntity = null
            this.selectedSpawn = true
            this.syncPropertyEditor()
            this.syncSelectionControls()
            return
        }

        const entity = createEntityFromJSON({ type: this.type, ...normRect })
        if (!entity) return

        this.entities.push(entity)
        this.selectedEntity = entity
        this.selectedSpawn = false
        populatePropertyEditor(entity)
        this.syncSelectionControls()
    }

    handleEntityClick(event) {
        if (this.playingLevel) return
        this.selectedEntity = null
        this.selectedSpawn = false
        this.selectedEntityMoved = false
        this.rect = false
        this.dragInfo = null
        this.setActiveEntityType(event.currentTarget.dataset.type)
        this.syncSelectionControls()
    }

    renderEntityToolbar() {
        const toolbar = document.getElementById('entity-toolbar-buttons')
        if (!toolbar) return

        toolbar.replaceChildren()
        for (const type of ['Spawn', ...EntityCreator.registry.keys()]) {
            const button = document.createElement('button')
            button.classList.add('button-entity')
            button.dataset.type = type
            button.textContent = getEntityToolLabel(type)
            toolbar.appendChild(button)
        }
    }

    setActiveEntityType(type) {
        this.type = type
        const buttons = document.querySelectorAll('.button-entity')
        for (const button of buttons) {
            button.classList.toggle('selected', button.dataset.type === type)
        }
        if (!this.selectedEntity) this.syncPropertyEditor()
    }

    syncPropertyEditor() {
        if (this.selectedEntity) {
            populatePropertyEditor(this.selectedEntity)
            return
        }

        if (this.selectedSpawn || isSpawnTool(this.type)) {
            populateSpawnPropertyEditor(this)
            return
        }

        populatePropertyEditor(null)
    }

    syncSelectionControls() {
        const deleteButton = document.getElementById('button-delete-selected')
        const duplicateButton = document.getElementById('button-duplicate-selected')
        const hasEditableSelection = !this.playingLevel && !!this.selectedEntity

        if (deleteButton) deleteButton.disabled = !hasEditableSelection
        if (duplicateButton) duplicateButton.disabled = !hasEditableSelection
    }

    syncHistoryControls() {
        const undoButton = document.getElementById('button-undo-move')
        const redoButton = document.getElementById('button-redo-move')
        const canEditHistory = !this.playingLevel

        if (undoButton) undoButton.disabled = !canEditHistory || !this.undoStack.length
        if (redoButton) redoButton.disabled = !canEditHistory || !this.redoStack.length
    }

    loadUsedLevels() {
        if (this.levelLoadingPromise) return this.levelLoadingPromise

        this.levelLoadingPromise = this.loadUsedLevelsFromResources().catch((err) => {
            this.levelLoadingPromise = null
            throw err
        })
        return this.levelLoadingPromise
    }

    async loadUsedLevelsFromResources() {
        const names = [...await LevelCreator.getLevelOrderLevels({ forceLoad: true })]
        const levelEntries = await Promise.all(
            names.map(async name => [name, await fetchLevelJSON(name)])
        )

        this.levelNames = names
        this.levelJSONByName = new Map(levelEntries)

        if (!this.levelNames.length) {
            this.syncLevelNavigationControls('No used levels found')
            return
        }

        const storedLevelName = readStoredCurrentLevelName()
        const storedLevelIndex = storedLevelName ? this.levelNames.indexOf(storedLevelName) : -1
        const initialLevelIndex = storedLevelIndex === -1 ? 0 : storedLevelIndex

        await this.loadCachedLevelAt(initialLevelIndex, false)
    }

    storeCurrentLevelJSON() {
        const name = this.levelNames[this.currentLevelIndex]
        if (!name) return

        this.levelJSONByName.set(name, this.getLevelJSON())
    }

    async loadCachedLevelAt(index, saveCurrent = true) {
        if (index < 0 || index >= this.levelNames.length) return
        if (saveCurrent) this.storeCurrentLevelJSON()

        const name = this.levelNames[index]
        const levelJSON = this.levelJSONByName.get(name)
        if (!levelJSON) throw new Error(`Level ${name} was not preloaded.`)

        await this.loadLevelJSON(copyLevelJSON(levelJSON), name)
    }

    async handleLevelNavigation(offset) {
        if (this.playingLevel) return

        try {
            await this.loadUsedLevels()
            await this.loadCachedLevelAt(this.currentLevelIndex + offset)
        } catch (err) {
            dialog('There was an error loading levels:', err.message)
        }
    }

    handlePreviousLevelClick() {
        return this.handleLevelNavigation(-1)
    }

    handleNextLevelClick() {
        return this.handleLevelNavigation(1)
    }

    async checkOverwriteSupport() {
        this.canOverwriteLevelFiles = await fetchCanOverwriteLevelFiles()
        this.syncSaveControls()
    }

    async handleCurrentLevelSelectChange(event) {
        if (this.playingLevel) return

        const name = event.target.value
        if (!name || name === draftLevelSelectValue || name === this.currentLevelName) {
            this.syncLevelNavigationControls()
            return
        }

        try {
            await this.loadUsedLevels()
            const levelIndex = this.levelNames.indexOf(name)
            if (levelIndex === -1) {
                this.syncLevelNavigationControls()
                return
            }

            await this.loadCachedLevelAt(levelIndex)
        } catch (err) {
            this.syncLevelNavigationControls()
            dialog('There was an error loading your level:', err.message)
        }
    }

    async handleCreateNewClick() {
        if (this.playingLevel) return

        try {
            this.storeCurrentLevelJSON()
            await this.loadLevelJSON(createStarterLevelJSON(), 'New Level')
        } catch (err) {
            dialog('There was an error creating a new level:', err.message)
        }
    }

    async cacheLevelOrderLevels(names) {
        const missingNames = names.filter(name => !this.levelJSONByName.has(name))
        const levelEntries = await Promise.all(
            missingNames.map(async name => [name, await fetchLevelJSON(name)])
        )

        for (const [name, levelJSON] of levelEntries) {
            this.levelJSONByName.set(name, copyLevelJSON(levelJSON))
        }
    }

    applyLevelOrderJSON(levelOrderJSON) {
        this.storeCurrentLevelJSON()
        this.levelNames = [...levelOrderJSON.levelOrder]
        this.currentLevelIndex = this.currentLevelName
            ? this.levelNames.indexOf(this.currentLevelName)
            : -1
        this.levelLoadingPromise = null

        if (this.currentLevelIndex === -1) {
            storeCurrentLevelName(null)
        } else {
            storeCurrentLevelName(this.currentLevelName)
        }

        this.syncLevelNavigationControls()
    }

    async handleEditLevelOrderClick() {
        if (this.playingLevel) return

        if (!this.canOverwriteLevelFiles) {
            dialog(
                'Cannot edit level order:',
                'Edit Order is only available when running the local editor server.'
            )
            return
        }

        try {
            const levelOrderJSON = await fetchLevelOrderJSON()
            const editedText = await editableTextDialog(
                'Edit Level Order JSON',
                JSON.stringify(levelOrderJSON, null, 3),
                'Save Order'
            )
            if (editedText == null) return

            const editedLevelOrderJSON = JSON.parse(editedText)
            validateLevelOrderJSON(editedLevelOrderJSON)
            await this.cacheLevelOrderLevels(editedLevelOrderJSON.levelOrder)

            const result = await overwriteLevelOrderFile(editedLevelOrderJSON)
            this.applyLevelOrderJSON(editedLevelOrderJSON)
            dialog('Level order saved:', `Overwrote ${result.path ?? 'resources/levelOrder.json'}.`)
        } catch (err) {
            dialog('There was an error editing level order:', err.message)
        }
    }

    handlePrintClick(type) {
        if (this.playingLevel) return
        if (type !== 'json') return

        copyableDialog('Level JSON', JSON.stringify(this.getLevelJSON(), null, 3))
    }

    handlePlayClick(event) {
        if (this.playingLevel) {
            this.stopPlayingLevel()
            return
        }

        try {
            this.playSnapshot = this.getLevelJSON()
            this.playingLevel = this.createPlayableLevel(this.playSnapshot)
            this.setLevelUIVisible(true)
            event.currentTarget.textContent = 'Stop Playing'
            document.body.classList.add('editor-playing')
            this.syncLevelNavigationControls()
        } catch (err) {
            dialog('Cannot play level:', err.message)
        }
    }

    async handleSaveClick() {
        if (this.playingLevel) return

        if (!this.canOverwriteLevelFiles) {
            dialog(
                'Cannot save level:',
                'Save Level is only available when running the local editor server. Use Save As New to download a JSON file.'
            )
            return
        }

        const name = this.currentLevelIndex !== -1 ? this.currentLevelName : null
        if (!name) {
            dialog(
                'Cannot save level:',
                'Load an existing level before using Save Level. Use Save As New to download a new JSON file.'
            )
            return
        }

        const confirmed = await confirmDialog(
            `Save ${name}?`,
            `This will overwrite ${name}.json with the current editor state.`,
            'Save Level'
        )
        if (!confirmed) return

        try {
            const levelJSON = this.getLevelJSON()
            const result = await overwriteLevelFile(name, levelJSON)
            const savedPath = result.path ?? `resources/levels/${name}.json`
            this.levelJSONByName.set(name, copyLevelJSON(levelJSON))
            dialog('Level saved:', `Overwrote ${savedPath}.`)
        } catch (err) {
            dialog('There was an error saving your level:', err.message)
        }
    }

    async handleSaveAsNewClick() {
        if (this.playingLevel) return

        const name = await promptInput('Save as new level', 'Level Name or JSON Path:')
        if (!name) return

        const fileBaseName = getLevelFileBaseName(name)
        if (!fileBaseName) return

        const levelString = JSON.stringify(this.getLevelJSON(), null, 3)
        downloadFile(`${fileBaseName}.json`, levelString, 'application/json')
    }

    handleKeyPress(event) {
        if (this.playingLevel) return
        const key = event.key.toLowerCase()

        if (key === 'z' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            if (event.shiftKey) {
                this.redoMove()
            } else {
                this.undoMove()
            }
            return
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault()
            this.deleteSelectedEntity()
        }

        if (key === 'd' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            this.duplicateSelectedEntity()
        }
    }

    deleteSelectedEntity() {
        if (this.playingLevel) return

        const index = this.entities.indexOf(this.selectedEntity)
        if (index === -1) return

        this.entities.splice(index, 1)
        this.clearMoveHistory()
        this.selectedEntity = null
        this.selectedSpawn = false
        this.syncPropertyEditor()
        this.syncSelectionControls()
    }

    duplicateSelectedEntity() {
        if (this.playingLevel || !this.selectedEntity) return

        const entityJSON = entityToJSON(this.selectedEntity)
        if (!entityJSON) return

        const entity = createEntityFromJSON(offsetEntityJSON(entityJSON, 10, 10))
        if (!entity) return

        this.entities.push(entity)
        this.clearMoveHistory()
        this.selectedEntity = entity
        this.selectedSpawn = false
        populatePropertyEditor(entity)
        this.syncSelectionControls()
    }

    async handleLoadStringClick() {
        if (this.playingLevel) return

        try {
            const string = await promptInput('Load level from string', 'Level String:')
            if (!string) return
            this.storeCurrentLevelJSON()
            await this.loadLevelJSON(JSON.parse(string))
        } catch (err) {
            dialog('There was an error loading your level:', err.message)
        }
    }

    setLevelColor(color) {
        Color.getColor(color)
        this.levelColor = color
        const select = document.getElementById('property-level-color')
        if (select) select.value = this.levelColor
    }

    getLevelNavigationLabel() {
        if (this.currentLevelIndex !== -1 && this.levelNames.length) {
            return `${this.currentLevelName} (${this.currentLevelIndex + 1}/${this.levelNames.length})`
        }
        if (this.currentLevelName) return this.currentLevelName

        return 'No level loaded'
    }

    addCurrentLevelOption(select, value, text) {
        const option = document.createElement('option')
        option.value = value
        option.textContent = text
        select.appendChild(option)
    }

    syncCurrentLevelSelect(select, statusText = null) {
        select.replaceChildren()

        if (statusText) {
            this.addCurrentLevelOption(select, '', statusText)
            select.value = ''
            select.disabled = true
            return
        }

        if (!this.levelNames.length) {
            this.addCurrentLevelOption(select, '', this.getLevelNavigationLabel())
            select.value = ''
            select.disabled = true
            return
        }

        if (this.currentLevelIndex === -1 && this.currentLevelName) {
            this.addCurrentLevelOption(select, draftLevelSelectValue, this.currentLevelName)
        }

        this.levelNames.forEach((name, index) => {
            this.addCurrentLevelOption(select, name, `${name} (${index + 1}/${this.levelNames.length})`)
        })
        select.value = this.currentLevelIndex === -1 ? draftLevelSelectValue : this.currentLevelName
        select.disabled = this.playingLevel
    }

    syncLevelNavigationControls(statusText = null) {
        const previousButton = document.getElementById('button-previous-level')
        const nextButton = document.getElementById('button-next-level')
        const label = document.getElementById('current-level-label')
        const hasOrderedLevel = this.currentLevelIndex !== -1 && this.levelNames.length > 0

        if (label) this.syncCurrentLevelSelect(label, statusText)
        if (previousButton) previousButton.disabled = this.playingLevel || !hasOrderedLevel || this.currentLevelIndex <= 0
        if (nextButton) nextButton.disabled = this.playingLevel || !hasOrderedLevel || this.currentLevelIndex >= this.levelNames.length - 1
        this.syncSaveControls()
        this.syncSelectionControls()
        this.syncHistoryControls()
    }

    syncSaveControls() {
        const saveButton = document.getElementById('button-save')
        const editLevelOrderButton = document.getElementById('button-edit-level-order')

        const hasCurrentLevel = this.currentLevelIndex !== -1 && !!this.currentLevelName
        if (saveButton) {
            saveButton.hidden = !this.canOverwriteLevelFiles
            saveButton.disabled = this.playingLevel || !this.canOverwriteLevelFiles || !hasCurrentLevel

            if (!this.canOverwriteLevelFiles) {
                saveButton.title = 'Save Level is only available when running the local editor server.'
            } else if (!hasCurrentLevel) {
                saveButton.title = 'Load an existing level before saving over it.'
            } else if (this.playingLevel) {
                saveButton.title = 'Stop playing before saving.'
            } else {
                saveButton.title = 'Overwrite the currently loaded level JSON file.'
            }
        }

        if (editLevelOrderButton) {
            editLevelOrderButton.hidden = !this.canOverwriteLevelFiles
            editLevelOrderButton.disabled = this.playingLevel || !this.canOverwriteLevelFiles
            if (!this.canOverwriteLevelFiles) {
                editLevelOrderButton.title = 'Edit Order is only available when running the local editor server.'
            } else if (this.playingLevel) {
                editLevelOrderButton.title = 'Stop playing before editing the level order.'
            } else {
                editLevelOrderButton.title = 'Edit resources/levelOrder.json.'
            }
        }
    }

    getLevelJSON() {
        return {
            color: this.levelColor,
            spawn: copySpawn(this.spawn),
            entities: this.entities.map(entityToJSON).filter(Boolean)
        }
    }

    async loadLevelJSON(levelJSON, name = 'noname') {
        const unsupportedTypes = getUnsupportedTypes(levelJSON)
        const level = await LevelCreator.loadLevelFromJSON(levelJSON, name)
        const levelIndex = this.levelNames.indexOf(name)

        this.levelColor = level.color.toString()
        this.spawn = copySpawn(level.spawn)
        this.entities = [...level.entities, ...level.texts]
        this.selectedEntity = null
        this.selectedSpawn = false
        this.rect = false
        this.clearMoveHistory()
        this.currentLevelName = name
        this.currentLevelIndex = levelIndex
        if (levelIndex !== -1) {
            this.levelJSONByName.set(name, copyLevelJSON(levelJSON))
            storeCurrentLevelName(name)
        } else {
            storeCurrentLevelName(null)
        }
        this.syncLevelNavigationControls()
        this.syncPropertyEditor()
        this.syncSelectionControls()

        if (unsupportedTypes.length) {
            dialog(
                'Some entities could not be loaded:',
                `The editor/runtime is missing constructors for: ${unsupportedTypes.join(', ')}. Those objects were skipped.`
            )
        }
    }

    getPreviewPlayer() {
        if (!this.previewPlayer) this.previewPlayer = new Player(0, 0)

        return this.previewPlayer
    }

    getCurrentPlayer() {
        return this.playingLevel?.player ?? null
    }

    resetFrameClock() {
        this.lastTime = performance.now()
    }

    createPlayableLevel(levelJSON) {
        if (!levelJSON.spawn) {
            throw new Error('Add a Spawn before playing the level.')
        }

        const entities = levelJSON.entities.map(createEntityFromJSON).filter(Boolean)
        const level = new Level('editor-preview', levelJSON.spawn, Color.getColor(levelJSON.color), entities)
        level.levelManager = this
        level.setPlayer(this.getPreviewPlayer())
        level.respawnPlayer()

        return level
    }

    restartPlayingLevel() {
        if (!this.playSnapshot) return
        this.playingLevel = this.createPlayableLevel(this.playSnapshot)
        this.setLevelUIVisible(true)
        this.syncLevelNavigationControls()
    }

    stopPlayingLevel() {
        if (this.playingLevel) this.playingLevel.setPlayer(null)
        this.playingLevel = false
        this.playSnapshot = null
        this.setLevelUIVisible(false)
        document.body.classList.remove('editor-playing')
        document.querySelectorAll('#editor-play-controls .mobile-control-button.is-pressed')
            .forEach(button => button.classList.remove('is-pressed'))
        document.getElementById('button-play').textContent = 'Play'
        this.syncLevelNavigationControls()
    }

}
