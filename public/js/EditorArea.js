import Color from './entity/Color.js'
import Player from './entity/Player.js'
import Level from './level/Level.js'
import * as EntityCreator from './level/EntityCreator.js'
import * as LevelCreator from './level/LevelCreator.js'
import {
    fetchCanOverwriteLevelFiles,
    fetchLevelOrderJSON,
    overwriteLevelOrderFile
} from './level/LevelOrderApi.js'
import * as Physics from './math/PhysicsEngine.js'
import { promptInput, dialog, copyableDialog, confirmDialog } from './utility/Prompt.js'

const editorCurrentLevelStorageKey = 'colorswitch.editor.currentLevelName'
const touchDragLiftOffset = { x: 0, y: -120 }
const noDragLiftOffset = { x: 0, y: 0 }
const touchHitSlop = 12
const minimumVisibleDraggedPixels = 10
const levelUiHeight = 95
const draftLevelSelectValue = '__editor-draft-level__'
const spawnSize = 20
const editorGridSize = 5
const resizableEntityCreationGridSize = 10
const keyboardNudgePixels = editorGridSize
const commandKeyboardNudgePixels = editorGridSize * 2
const keyboardNudgeDirections = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }
}
const gridSnappedNumberPropertyNames = new Set(['x', 'y', 'width', 'height', 'startX', 'startY', 'endX', 'endY'])
const spawnPositionProperties = [
    { name: 'x', type: 'number' },
    { name: 'y', type: 'number' }
]

function setPropertyValue(entity, property, value) {
    if (property.set) {
        property.set(entity, value)
        return
    }

    entity[property.name] = value
}

function propertyValuesMatch(value, expectedValue) {
    if (Array.isArray(expectedValue)) {
        return expectedValue.some(option => propertyValuesMatch(value, option))
    }

    const valueToCompare = value instanceof Color ? value.name : value
    const expectedValueToCompare = expectedValue instanceof Color ? expectedValue.name : expectedValue
    return valueToCompare === expectedValueToCompare
}

function normalizeNumberValue(value, property) {
    if (!Number.isFinite(value)) return null
    const roundTo = property.roundTo ?? (gridSnappedNumberPropertyNames.has(property.name) ? editorGridSize : null)
    if (!roundTo) return value

    const roundedValue = Math.round(value / roundTo) * roundTo
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

function expandBox(box, amount) {
    if (!amount) return box

    return {
        x: box.x - amount,
        y: box.y - amount,
        width: box.width + amount * 2,
        height: box.height + amount * 2
    }
}

function copyPosition(target) {
    const position = {
        x: target.x,
        y: target.y
    }
    if (typeof target.width === 'number') position.width = target.width
    if (typeof target.height === 'number') position.height = target.height

    return position
}

function positionsMatch(first, second) {
    return first.x === second.x
        && first.y === second.y
        && first.width === second.width
        && first.height === second.height
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
    if (color.hasPoorVisibility()) {
        context.beginPath()
        context.ellipse(spawn.x + 10, spawn.y + 10, 5, 5, 0, 0, Math.PI * 2)
        context.fillStyle = Color.BLACK
        context.fill()

        context.beginPath()
        context.ellipse(spawn.x + 10, spawn.y + 10, 4, 4, 0, 0, Math.PI * 2)
        context.fillStyle = color.drawColor
        context.fill()
    } else {
        context.beginPath()
        context.ellipse(spawn.x + 10, spawn.y + 10, 5, 5, 0, 0, Math.PI * 2)
        context.fillStyle = color.drawColor
        context.fill()
    }
}

function drawSelectionIndicator(context, box, showOutline = true) {
    const width = Math.max(0, box.width ?? 0)
    const height = Math.max(0, box.height ?? 0)
    if (!width || !height) return

    context.save()
    context.beginPath()
    context.rect(box.x, box.y, width, height)
    context.clip()
    context.fillStyle = 'rgba(0, 100, 200, 0.4)'
    context.fillRect(box.x, box.y, width, height)

    if (!showOutline) {
        context.restore()
        return
    }

    const lineWidth = Math.min(3, width, height)
    const x = box.x + lineWidth / 2
    const y = box.y + lineWidth / 2
    const drawWidth = Math.max(0, width - lineWidth)
    const drawHeight = Math.max(0, height - lineWidth)

    context.lineJoin = 'miter'
    context.strokeStyle = 'rgba(0, 0, 0, 0.9)'
    context.lineWidth = lineWidth
    context.strokeRect(x, y, drawWidth, drawHeight)
    context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    context.lineWidth = 1
    context.strokeRect(x, y, drawWidth, drawHeight)
    context.restore()
}

function getEditableProperties(entity, includeInactive = false) {
    if (!entity || typeof entity.getProperties !== 'function') return []

    try {
        const properties = entity.getProperties() ?? []
        if (includeInactive) return properties

        return properties.filter(property => propertyDependencyMatches(entity, properties, property))
    } catch (err) {
        if (err instanceof Error && err.message.startsWith('Entity.getProperties')) {
            console.error(err)
            return []
        }

        throw err
    }
}

function propertyDependencyMatches(entity, properties, property) {
    if (!property.depends) return true

    return Object.entries(property.depends).every(([propertyName, expectedValue]) => {
        const dependencyProperty = properties.find(candidate => candidate.name === propertyName)
        const dependencyValue = dependencyProperty
            ? (dependencyProperty.get ? dependencyProperty.get(entity) : entity[dependencyProperty.name])
            : entity[propertyName]
        return propertyValuesMatch(dependencyValue, expectedValue)
    })
}

function appendPropertyEditorField(form, entity, property) {
    const div = document.createElement('div')
    div.setAttribute('class', 'property-form-group')
    form.appendChild(div)

    const id = `property-${property.name}`
    const label = document.createElement('label')
    label.setAttribute('for', id)
    const fallbackLabel = property.name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase())
    label.textContent = property.label ?? fallbackLabel
    div.appendChild(label)

    const currentValue = property.get ? property.get(entity) : entity[property.name]
    const formValue = currentValue instanceof Color
        ? currentValue.name
        : String(currentValue ?? '')
    const input = createPropertyInput(property, formValue)
    input.setAttribute('id', id)
    input.setAttribute('name', id)
    div.appendChild(input)

    const eventName = property.type === 'select' || property.type === 'color' || property.type === 'boolean'
        ? 'change'
        : 'input'
    input.addEventListener(eventName, (event) => {
        const controlsDependencies = getEditableProperties(entity, true)
            .some(candidate => candidate.depends && Object.prototype.hasOwnProperty.call(candidate.depends, property.name))
        const previousPropertyNames = controlsDependencies
            ? getEditableProperties(entity).map(candidate => candidate.name)
            : null
        const value = readFormValue(event, property)
        if (value == null && property.type === 'number') return
        setPropertyValue(entity, property, value)
        if (controlsDependencies) {
            const nextPropertyNames = getEditableProperties(entity).map(candidate => candidate.name)
            const propertyListChanged = previousPropertyNames.length !== nextPropertyNames.length
                || previousPropertyNames.some((name, index) => name !== nextPropertyNames[index])
            if (propertyListChanged) {
                populatePropertyEditor(entity)
            }
        }
    })

    if (property.type === 'number') {
        input.addEventListener('change', () => {
            const value = readFormValue({ target: input }, property)
            if (value != null) setPropertyValue(entity, property, value)
            const currentValue = property.get ? property.get(entity) : entity[property.name]
            input.value = currentValue instanceof Color
                ? currentValue.name
                : String(currentValue ?? '')
        })
    }
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
        appendPropertyEditorField(form, entity, property)
    }
}

function populateSpawnPropertyEditor(editor) {
    const form = document.getElementById('property-editor-form')
    form.innerHTML = ''

    for (const property of spawnPositionProperties) {
        appendPropertyEditorField(form, editor.spawn, property)
    }

    const div = document.createElement('div')
    div.setAttribute('class', 'property-form-group')
    form.appendChild(div)

    const label = document.createElement('label')
    label.setAttribute('for', 'property-level-color')
    label.textContent = 'Start Color'
    div.appendChild(label)

    const select = createSelect(Color.NAMES, editor.levelColor)
    select.setAttribute('id', 'property-level-color')
    select.setAttribute('name', 'property-level-color')
    select.addEventListener('change', event => editor.setLevelColor(event.target.value))
    div.appendChild(select)
}

function createPropertyInput(property, value) {
    if (property.type === 'color') return createSelect(Color.NAMES, value)
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
        const step = property.step ?? (gridSnappedNumberPropertyNames.has(property.name) ? editorGridSize : null)
        if (step != null) input.setAttribute('step', step)
        if (property.min != null) input.setAttribute('min', property.min)
    }
    input.value = value

    return input
}

function entityToJSON(entity) {
    if (!entity || typeof entity.toJSON !== 'function') return null

    try {
        return entity.toJSON()
    } catch (err) {
        if (err instanceof Error && err.message.startsWith('Entity.toJSON')) {
            console.error(err)
            return null
        }

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

async function writeLevelFile(name, levelJSON) {
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

export default class EditorArea {

    constructor(canvasId = 'editor-canvas') {
        this.canvasId = canvasId

        this.width = null
        this.height = null
        this.editorElement = null
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
        this.currentLevelCanOverwrite = false
        this.canOverwriteLevelFiles = false

        this.editorLevelUIVisible = false
        this.showingLevelUI = false
        this.playingLevel = false
        this.playSnapshot = null
        this.previewPlayer = null
    }

    start() {
        this.editorElement = document.getElementById('editor')
        this.canvas = document.getElementById(this.canvasId)
        this.width = this.canvas.width
        this.height = this.canvas.height
        this.editorLevelUIVisible = false
        this.setLevelUIVisible(this.editorLevelUIVisible)

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

        context.clearRect(0, 0, this.canvas.width, this.canvas.height)
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

            for (const entity of this.entities) {
                context.save()
                entity.draw(context)
                context.restore()
            }

            if (rect) {
                const previewRect = Physics.getNormalizedBox(rect)
                context.fillStyle = 'rgba(0, 100, 200, 0.4)'
                context.fillRect(previewRect.x, previewRect.y, previewRect.width, previewRect.height)
            }

            if (this.selectedSpawn) {
                drawSelectionIndicator(context, getSpawnBox(this.spawn), false)
            } else if (this.selectedEntity) {
                const showResizeOutline = getEditableProperties(this.selectedEntity)
                    .some(property => property.name === 'width' || property.name === 'height')
                drawSelectionIndicator(context, this.selectedEntity, showResizeOutline)
            }

            this.drawLevelUIBoundary(context)
        }

        this.animationFrameId = requestAnimationFrame(nextNow => this.loop(nextNow))
    }

    stop() {
        if (!this.animationFrameId) {
            return
        }

        const animationFrameId = this.animationFrameId
        cancelAnimationFrame(animationFrameId)
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

    drawLevelUIBoundary(context) {
        if (!this.showingLevelUI) return

        context.save()
        context.fillStyle = 'black'
        context.fillRect(0, this.height, this.width, 1)
        context.restore()
    }

    getRoundedPointerPosition(gridSize = editorGridSize) {
        return {
            x: Math.round(this.mouseInfo.position.x / gridSize) * gridSize,
            y: Math.round(this.mouseInfo.position.y / gridSize) * gridSize
        }
    }

    setLevelUIVisible(showingLevelUI) {
        this.showingLevelUI = showingLevelUI
        const visibleLevelUIHeight = showingLevelUI ? levelUiHeight : 0
        this.canvas.height = this.height + visibleLevelUIHeight
        this.syncLevelUIControl()
    }

    toggleEditorLevelUI() {
        if (this.playingLevel) return

        const nextEditorLevelUIVisible = !this.editorLevelUIVisible
        this.editorLevelUIVisible = nextEditorLevelUIVisible
        this.setLevelUIVisible(this.editorLevelUIVisible)
    }

    getVisiblePosition(box) {
        const width = Math.max(0, box.width ?? 0)
        const height = Math.max(0, box.height ?? 0)
        const visibleWidth = Math.min(minimumVisibleDraggedPixels, width)
        const visibleHeight = Math.min(minimumVisibleDraggedPixels, height)
        const editableHeight = this.height + (this.editorLevelUIVisible ? levelUiHeight : 0)

        return {
            x: Math.min(Math.max(box.x, visibleWidth - width), this.width - visibleWidth),
            y: Math.min(Math.max(box.y, visibleHeight - height), editableHeight - visibleHeight)
        }
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

    findEntityAt(point, event) {
        const hitSlop = event?.pointerType === 'touch' ? touchHitSlop : 0
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i]
            const boundingBox = expandBox(Physics.boundingBox(entity, entity), hitSlop)
            if (Physics.pointIntersectsBox(point, boundingBox)) return entity
        }

        return null
    }

    getPlacementRect() {
        const position = this.getRoundedPointerPosition()
        if (this.type === 'Spawn') {
            return {
                ...position,
                width: 20, // PLAYER SIZE
                height: 20,
                fixed: true
            }
        }

        const makeEntity = EntityCreator.registry.get(this.type)
        const entity = makeEntity?.({ type: this.type, ...position, width: 0, height: 0 }) ?? null
        const entityIsResizable = entity
            && getEditableProperties(entity).some(property => property.name === 'width' || property.name === 'height')
        if (entity && !entityIsResizable) {
            return {
                ...position,
                width: entity.width,
                height: entity.height,
                fixed: true
            }
        }
        const gridSize = entityIsResizable ? resizableEntityCreationGridSize : editorGridSize

        return {
            ...this.getRoundedPointerPosition(gridSize),
            width: 0,
            height: 0,
            gridSize
        }
    }

    createDragInfo(target, pointerPosition, event) {
        return {
            target,
            liftOffset: event?.pointerType === 'touch' ? touchDragLiftOffset : noDragLiftOffset,
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

    ensurePendingMoveForTarget(target) {
        if (this.pendingMoveAction && this.pendingMoveAction.target === target) return

        this.commitPendingMove()
        if (this.selectedEntity) {
            this.pendingMoveAction = this.createMoveAction('entity', this.selectedEntity)
        } else if (this.selectedSpawn) {
            this.pendingMoveAction = this.createMoveAction('spawn', this.spawn)
        } else {
            this.pendingMoveAction = null
        }
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

    applyMoveAction(action, position) {
        const canApply = action.targetType === 'spawn'
            ? action.target === this.spawn
            : this.entities.includes(action.target)
        if (!canApply) return false

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

    moveDraggedTarget(target, mouse) {
        const dragTarget = this.getDragTarget(target, mouse.position)
        if (dragTarget) {
            const moved = target.x !== dragTarget.x || target.y !== dragTarget.y
            if (moved) {
                this.selectedEntityMoved = true
                Object.assign(target, dragTarget)
            }
            return
        }

        const dx = mouse.position.x - mouse.previous.x
        const dy = mouse.position.y - mouse.previous.y
        if (dx || dy) {
            this.selectedEntityMoved = true
            Object.assign(target, {
                x: target.x + dx,
                y: target.y + dy
            })
        }
    }

    moveFixedPlacementRect(mouse) {
        const dragTarget = this.getDragTarget(this.rect, mouse.position) ?? mouse.position
        Object.assign(this.rect, {
            x: Math.round(dragTarget.x / editorGridSize) * editorGridSize,
            y: Math.round(dragTarget.y / editorGridSize) * editorGridSize
        })
    }

    nudgeSelected(direction, distance) {
        if (this.playingLevel || (!this.selectedEntity && !this.selectedSpawn)) return false

        const target = this.selectedEntity ?? this.spawn
        this.ensurePendingMoveForTarget(target)

        Object.assign(target, {
            x: target.x + direction.x * distance,
            y: target.y + direction.y * distance
        })

        if (this.selectedEntity) {
            Object.assign(this.selectedEntity, this.getVisiblePosition(this.selectedEntity))
            populatePropertyEditor(this.selectedEntity)
        } else {
            Object.assign(this.spawn, this.getVisiblePosition(getSpawnBox(this.spawn)))
            this.syncPropertyEditor()
        }

        this.rect = false
        this.dragInfo = null
        this.selectedEntityMoved = false
        this.syncSelectionControls()

        return true
    }

    resizeSelectedEntity(direction, distance, shrinking = false) {
        if (this.playingLevel || !this.selectedEntity) return false
        const canResizeSelection = getEditableProperties(this.selectedEntity)
            .some(property => property.name === 'width' || property.name === 'height')
        if (!canResizeSelection) return false
        if (!Number.isFinite(this.selectedEntity.width) || !Number.isFinite(this.selectedEntity.height)) return false

        const target = this.selectedEntity
        const sizeProperty = direction.x ? 'width' : 'height'
        const sizePropertyMetadata = getEditableProperties(target).find(candidate => candidate.name === sizeProperty)
        const minimumSize = Number.isFinite(sizePropertyMetadata?.min) ? sizePropertyMetadata.min : editorGridSize
        const resizeDistance = shrinking
            ? Math.max(0, Math.min(distance, target[sizeProperty] - minimumSize))
            : distance
        if (!resizeDistance) return false

        if (direction.x < 0) {
            this.ensurePendingMoveForTarget(target)
            target.x += shrinking ? resizeDistance : -resizeDistance
            target.width += shrinking ? -resizeDistance : resizeDistance
        } else if (direction.x > 0) {
            this.ensurePendingMoveForTarget(target)
            target.width += shrinking ? -resizeDistance : resizeDistance
        } else if (direction.y < 0) {
            this.ensurePendingMoveForTarget(target)
            target.y += shrinking ? resizeDistance : -resizeDistance
            target.height += shrinking ? -resizeDistance : resizeDistance
        } else if (direction.y > 0) {
            this.ensurePendingMoveForTarget(target)
            target.height += shrinking ? -resizeDistance : resizeDistance
        }

        Object.assign(target, this.getVisiblePosition(target))
        populatePropertyEditor(target)
        this.rect = false
        this.dragInfo = null
        this.selectedEntityMoved = false
        this.syncSelectionControls()

        return true
    }

    onPointerDown(event) {
        if (this.playingLevel) return
        if (event.button != null && event.button !== 0) return

        event.preventDefault()
        this.commitPendingMove()
        this.activePointerId = event.pointerId ?? 'mouse'
        this.capturePointer(this.activePointerId)
        this.updatePointerPosition(event)
        Object.assign(this.mouseInfo, {
            held: true
        })
        const mouse = this.mouseInfo
        const hadSelection = !!this.selectedEntity || this.selectedSpawn
        const entity = this.findEntityAt(mouse.position, event)
        const spawnHitSlop = event?.pointerType === 'touch' ? touchHitSlop : 0
        const spawnBox = expandBox(getSpawnBox(this.spawn), spawnHitSlop)
        const spawn = !entity && Physics.pointIntersectsBox(mouse.position, spawnBox) ? this.spawn : null

        this.selectedEntity = entity
        this.selectedSpawn = !!spawn
        this.selectedEntityMoved = false
        if (entity) {
            this.pendingMoveAction = this.createMoveAction('entity', entity)
        } else if (spawn) {
            this.pendingMoveAction = this.createMoveAction('spawn', this.spawn)
        } else {
            this.pendingMoveAction = null
        }
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
        if (this.activePointerId !== null && (event.pointerId ?? 'mouse') !== this.activePointerId) return
        if (this.activePointerId !== null) event.preventDefault()

        this.updatePointerPosition(event)
        const mouse = this.mouseInfo

        if (this.playingLevel) return

        if (mouse.held) {
            if (this.selectedEntity) {
                this.moveDraggedTarget(this.selectedEntity, mouse)
            } else if (this.selectedSpawn) {
                this.moveDraggedTarget(this.spawn, mouse)
            } else if (this.rect?.fixed) {
                this.moveFixedPlacementRect(mouse)
            } else if (this.rect) {
                const gridSize = this.rect.gridSize ?? editorGridSize
                Object.assign(this.rect, {
                    width: Math.round((mouse.position.x - this.rect.x) / gridSize) * gridSize,
                    height: Math.round((mouse.position.y - this.rect.y) / gridSize) * gridSize
                })
            }
        }
    }

    onPointerUp(event) {
        if (this.activePointerId !== null && (event.pointerId ?? 'mouse') !== this.activePointerId) return

        event.preventDefault()
        this.updatePointerPosition(event)
        this.releasePointer(this.activePointerId)
        this.activePointerId = null
        if (this.selectedEntity && this.selectedEntityMoved) this.moveDraggedTarget(this.selectedEntity, this.mouseInfo)
        if (this.selectedSpawn && this.selectedEntityMoved) this.moveDraggedTarget(this.spawn, this.mouseInfo)
        if (!this.selectedEntity && this.rect?.fixed) this.moveFixedPlacementRect(this.mouseInfo)
        Object.assign(this.mouseInfo, {
            held: false
        })

        if (this.playingLevel) return

        if (this.selectedEntity) {
            if (this.selectedEntityMoved) {
                Object.assign(this.selectedEntity, {
                    x: Math.round(this.selectedEntity.x / editorGridSize) * editorGridSize,
                    y: Math.round(this.selectedEntity.y / editorGridSize) * editorGridSize
                })
                Object.assign(this.selectedEntity, this.getVisiblePosition(this.selectedEntity))
                populatePropertyEditor(this.selectedEntity)
            }
        } else if (this.selectedSpawn) {
            if (this.selectedEntityMoved) {
                Object.assign(this.spawn, {
                    x: Math.round(this.spawn.x / editorGridSize) * editorGridSize,
                    y: Math.round(this.spawn.y / editorGridSize) * editorGridSize
                })
                Object.assign(this.spawn, this.getVisiblePosition(getSpawnBox(this.spawn)))
                this.syncPropertyEditor()
            }
        } else if (this.rect) {
            if (this.rect.fixed) Object.assign(this.rect, this.getVisiblePosition(this.rect))
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
        if (this.activePointerId !== null && (event.pointerId ?? 'mouse') !== this.activePointerId) return

        event.preventDefault()
        this.releasePointer(this.activePointerId)
        this.activePointerId = null
        Object.assign(this.mouseInfo, {
            held: false
        })
        if (this.selectedEntity && this.selectedEntityMoved) {
            Object.assign(this.selectedEntity, {
                x: Math.round(this.selectedEntity.x / editorGridSize) * editorGridSize,
                y: Math.round(this.selectedEntity.y / editorGridSize) * editorGridSize
            })
            Object.assign(this.selectedEntity, this.getVisiblePosition(this.selectedEntity))
            populatePropertyEditor(this.selectedEntity)
        }
        if (this.selectedSpawn && this.selectedEntityMoved) {
            Object.assign(this.spawn, {
                x: Math.round(this.spawn.x / editorGridSize) * editorGridSize,
                y: Math.round(this.spawn.y / editorGridSize) * editorGridSize
            })
            Object.assign(this.spawn, this.getVisiblePosition(getSpawnBox(this.spawn)))
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
        if (this.type === 'Spawn') {
            this.spawn = {
                x: normRect.x,
                y: normRect.y
            }
            this.selectedEntity = null
            this.selectedSpawn = true
            this.syncPropertyEditor()
            this.syncSelectionControls()
            return
        }

        const makeEntity = EntityCreator.registry.get(this.type)
        const entity = makeEntity?.({ type: this.type, ...normRect }) ?? null
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
            const fallbackLabel = type
                .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                .replace(/^./, c => c.toUpperCase())
            button.textContent = type === 'Spawn' ? 'Spawn Point' : fallbackLabel
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

        if (this.selectedSpawn || this.type === 'Spawn') {
            populateSpawnPropertyEditor(this)
            return
        }

        populatePropertyEditor(null)
    }

    syncSelectionControls() {
        const deleteButton = document.getElementById('button-delete-selected')
        const duplicateButton = document.getElementById('button-duplicate-selected')
        const hasEditableSelection = !this.playingLevel && !!this.selectedEntity

        if (deleteButton) {
            deleteButton.hidden = !hasEditableSelection
            deleteButton.disabled = !hasEditableSelection
        }
        if (duplicateButton) {
            duplicateButton.hidden = !hasEditableSelection
            duplicateButton.disabled = !hasEditableSelection
        }
    }

    syncHistoryControls() {
        const undoButton = document.getElementById('button-undo-move')
        const redoButton = document.getElementById('button-redo-move')
        const canEditHistory = !this.playingLevel

        if (undoButton) undoButton.disabled = !canEditHistory || !this.undoStack.length
        if (redoButton) redoButton.disabled = !canEditHistory || !this.redoStack.length
    }

    syncLevelUIControl() {
        const button = document.getElementById('button-level-ui-toggle')
        if (!button) return

        button.disabled = !!this.playingLevel
        button.setAttribute('aria-pressed', this.showingLevelUI ? 'true' : 'false')
        if (this.playingLevel) {
            button.title = 'The bottom 95px helper text space is always shown while playing.'
        } else {
            button.title = this.editorLevelUIVisible
                ? 'Hide bottom 95px helper text space'
                : 'Show bottom 95px helper text space'
        }
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
        if (storedLevelName && storedLevelIndex === -1) {
            try {
                const storedLevelJSON = await fetchLevelJSON(storedLevelName)
                this.levelJSONByName.set(storedLevelName, JSON.parse(JSON.stringify(storedLevelJSON)))
                await this.loadLevelJSON(JSON.parse(JSON.stringify(storedLevelJSON)), storedLevelName, { canOverwrite: true })
                return
            } catch (err) {
                storeCurrentLevelName(null)
                console.error(err)
            }
        }

        const initialLevelIndex = storedLevelIndex === -1 ? 0 : storedLevelIndex

        await this.loadCachedLevelAt(initialLevelIndex, false)
    }

    storeCurrentLevelJSON() {
        const name = this.levelNames[this.currentLevelIndex]
        if (!name) return

        const levelJSON = this.getLevelJSON()
        this.levelJSONByName.set(name, levelJSON)
    }

    async loadCachedLevelAt(index, saveCurrent = true) {
        if (index < 0 || index >= this.levelNames.length) return
        if (saveCurrent) this.storeCurrentLevelJSON()

        const name = this.levelNames[index]
        const levelJSON = this.levelJSONByName.get(name)
        if (!levelJSON) throw new Error(`Level ${name} was not preloaded.`)

        await this.loadLevelJSON(JSON.parse(JSON.stringify(levelJSON)), name)
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
            this.levelJSONByName.set(name, JSON.parse(JSON.stringify(levelJSON)))
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
            window.location.href = 'order-editor.html'
        } catch (err) {
            dialog('There was an error opening level order:', err.message)
        }
    }

    handlePrintClick(type) {
        if (this.playingLevel) return
        if (type !== 'json') return

        const levelJSON = JSON.stringify(this.getLevelJSON(), null, 3)
        copyableDialog('Level JSON', levelJSON)
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
            this.editorElement?.classList.add('editor-playing')
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

        const name = this.currentLevelCanOverwrite ? this.currentLevelName : null
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
            const result = await writeLevelFile(name, levelJSON)
            const savedPath = result.path ?? `resources/levels/${name}.json`
            this.levelJSONByName.set(name, JSON.parse(JSON.stringify(levelJSON)))
            dialog('Level saved:', `Overwrote ${savedPath}.`)
        } catch (err) {
            dialog('There was an error saving your level:', err.message)
        }
    }

    async handleSaveAsNewClick() {
        if (this.playingLevel) return

        const name = await promptInput('Save as new level', 'Level Name or JSON Path:')
        if (!name) return

        const trimmedName = name.trim().replace(/\.json$/i, '')
        const pathParts = trimmedName.split(/[\\/]/)
        const fileBaseName = pathParts[pathParts.length - 1]
        if (!fileBaseName) return

        const append = this.canOverwriteLevelFiles && await confirmDialog(
            `Save as new level`,
            `Append ${fileBaseName} to levelOrder.json?`,
            'Append',
            'Download'
        )

        const levelJSON = this.getLevelJSON()

        if (!append) {
            const levelString = JSON.stringify(levelJSON, null, 3)
            downloadFile(`${fileBaseName}.json`, levelString, 'application/json')
            return
        }

        const levelOrderJSON = await fetchLevelOrderJSON()
        if (levelOrderJSON.levelOrder.includes(fileBaseName)) {
            dialog('Level error:', 'A level by this name already exists in levelOrder.json')
            return
        }

        const levelResult = await writeLevelFile(fileBaseName, levelJSON)
        const savedPath = levelResult.path ?? `resources/levels/${fileBaseName}.json`
        this.levelJSONByName.set(fileBaseName, JSON.parse(JSON.stringify(levelJSON)))

        levelOrderJSON.levelOrder.push(fileBaseName)

        await this.cacheLevelOrderLevels(levelOrderJSON.levelOrder)

        const result = await overwriteLevelOrderFile(levelOrderJSON)
        const orderPath = result.path ?? 'resources/levelOrder.json'
        this.applyLevelOrderJSON(levelOrderJSON)

        dialog('Level saved and appended:', `Appended to ${orderPath}.\nCreated level at ${savedPath}.`)
    }

    handleKeyPress(event) {
        if (this.playingLevel) return
        const nudgeDirection = keyboardNudgeDirections[event.key]
        if (nudgeDirection) {
            event.preventDefault()
            if (event.shiftKey) {
                const resizeDirection = event.metaKey
                    ? { x: -nudgeDirection.x, y: -nudgeDirection.y }
                    : nudgeDirection
                this.resizeSelectedEntity(resizeDirection, keyboardNudgePixels, event.metaKey)
            } else {
                const distance = event.metaKey ? commandKeyboardNudgePixels : keyboardNudgePixels
                this.nudgeSelected(nudgeDirection, distance)
            }
            return
        }

        const key = event.key.toLowerCase()

        if (key === 'z' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            this.commitPendingMove()
            if (event.shiftKey) {
                this.redoMove()
            } else {
                this.undoMove()
            }
            return
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault()
            this.commitPendingMove()
            this.deleteSelectedEntity()
        }

        if (key === 'd' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            this.commitPendingMove()
            this.duplicateSelectedEntity()
        }

        if (key === 's' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            this.commitPendingMove()
            this.handleSaveClick()
        }
    }

    handleKeyRelease(event) {
        const isNudgeKey = !!keyboardNudgeDirections[event.key]
        if (!isNudgeKey) {
            return
        }

        this.commitPendingMove()
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

        const offsetEntity = offsetEntityJSON(entityJSON, 10, 10)
        const makeEntity = EntityCreator.registry.get(offsetEntity.type)
        const entity = makeEntity?.(offsetEntity) ?? null
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

        const hasCurrentLevel = this.currentLevelCanOverwrite && !!this.currentLevelName
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
                editLevelOrderButton.title = 'Reorder Levels is only available when running the local editor server.'
            } else if (this.playingLevel) {
                editLevelOrderButton.title = 'Stop playing before editing the level order.'
            } else {
                editLevelOrderButton.title = 'Change the level order.'
            }
        }
    }

    getLevelJSON() {
        return {
            color: this.levelColor,
            spawn: {
                x: this.spawn.x,
                y: this.spawn.y
            },
            entities: this.entities.map(entityToJSON).filter(Boolean)
        }
    }

    async loadLevelJSON(levelJSON, name = 'noname', options = {}) {
        const unsupportedTypes = getUnsupportedTypes(levelJSON)
        const level = await LevelCreator.loadLevelFromJSON(levelJSON, name)
        const levelIndex = this.levelNames.indexOf(name)
        const canOverwriteCurrentLevel = options.canOverwrite === true || levelIndex !== -1

        this.levelColor = level.color.toString()
        this.spawn = {
            x: level.spawn.x,
            y: level.spawn.y
        }
        this.entities = [...level.entities, ...level.texts]
        this.selectedEntity = null
        this.selectedSpawn = false
        this.rect = false
        this.clearMoveHistory()
        this.currentLevelName = name
        this.currentLevelIndex = levelIndex
        this.currentLevelCanOverwrite = canOverwriteCurrentLevel
        if (canOverwriteCurrentLevel) {
            this.levelJSONByName.set(name, JSON.parse(JSON.stringify(levelJSON)))
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

    createPlayableLevel(levelJSON) {
        if (!levelJSON.spawn) {
            throw new Error('Add a Spawn before playing the level.')
        }

        const entities = levelJSON.entities
            .map((entityJSON) => {
                const makeEntity = EntityCreator.registry.get(entityJSON.type)
                return makeEntity?.(entityJSON) ?? null
            })
            .filter(Boolean)
        const level = new Level('editor-preview', levelJSON.spawn, Color.getColor(levelJSON.color), entities)
        level.levelManager = this
        if (!this.previewPlayer) this.previewPlayer = new Player(0, 0)
        level.setPlayer(this.previewPlayer)
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
        this.setLevelUIVisible(this.editorLevelUIVisible)
        this.editorElement?.classList.remove('editor-playing')
        document.querySelectorAll('#editor-play-controls .mobile-control-button.is-pressed')
            .forEach(button => button.classList.remove('is-pressed'))
        document.getElementById('button-play').textContent = 'Play'
        this.syncLevelNavigationControls()
    }

}
