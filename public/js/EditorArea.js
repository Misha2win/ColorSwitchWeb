import Color from './entity/Color.js'
import Player from './entity/Player.js'
import { Direction } from './entity/obstacle/Prism.js'
import Level from './level/Level.js'
import * as EntityCreator from './level/EntityCreator.js'
import * as LevelCreator from './level/LevelCreator.js'
import * as Physics from './math/PhysicsEngine.js'
import { promptChoices, promptInput, dialog } from './utility/Prompt.js'

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

const directionChoices = [
    'UP',
    'RIGHT',
    'DOWN',
    'LEFT'
]

const entityDefinitions = {
    Platform: { placement: 'box' },
    MovingPlatform: { placement: 'box' },
    FragilePlatform: { placement: 'box' },
    PhotonicPlatform: { placement: 'box' },
    HealthGate: { placement: 'box' },
    Element: { placement: 'box' },
    Text: { placement: 'box' },
    Spawn: { placement: 'fixed', width: 20, height: 20 },
    Goal: { placement: 'fixed', width: 20, height: 20 },
    Portal: { placement: 'fixed', width: 20, height: 20 },
    Prism: { placement: 'fixed', width: 20, height: 20 },
    ColorChanger: { placement: 'fixed', width: 30, height: 30 },
    ColorMixer: { placement: 'fixed', width: 30, height: 30 },
    Mirror: { placement: 'fixed', width: 30, height: 30 },
    SuperJump: { placement: 'fixed', width: 30, height: 30 },
    Teleporter: { placement: 'fixed', width: 30, height: 30 }
}

const positionProperties = [
    { name: 'x', type: 'number', step: 10, default: rect => rect.x },
    { name: 'y', type: 'number', step: 10, default: rect => rect.y }
]

const sizeProperties = [
    { name: 'width', type: 'number', min: 10, step: 10, roundTo: 10, default: rect => rect.width },
    { name: 'height', type: 'number', min: 10, step: 10, roundTo: 10, default: rect => rect.height }
]

const boxProperties = [
    ...positionProperties,
    ...sizeProperties
]

const colorProperty = (defaultValue = 'black') => ({
    name: 'color',
    type: 'color',
    default: defaultValue
})

const entityProperties = {
    Platform: [
        ...boxProperties,
        colorProperty('black')
    ],
    MovingPlatform: [
        ...boxProperties,
        colorProperty('black'),
        { name: 'startX', type: 'number', step: 10, default: rect => rect.x, get: entity => entity.x1, set: (entity, value) => { entity.x1 = value } },
        { name: 'startY', type: 'number', step: 10, default: rect => rect.y, get: entity => entity.y1, set: (entity, value) => { entity.y1 = value } },
        { name: 'endX', type: 'number', step: 10, default: rect => rect.x + 100, get: entity => entity.x2, set: (entity, value) => { entity.x2 = value } },
        { name: 'endY', type: 'number', step: 10, default: rect => rect.y, get: entity => entity.y2, set: (entity, value) => { entity.y2 = value } }
    ],
    FragilePlatform: [
        ...boxProperties,
        colorProperty('black')
    ],
    PhotonicPlatform: [
        ...boxProperties
    ],
    HealthGate: [
        ...boxProperties,
        { name: 'greaterThan', type: 'boolean', default: true, get: entity => !entity.greaterThan, set: (entity, value) => { entity.greaterThan = !value } },
        { name: 'health', label: 'Health', type: 'number', min: 0, step: 1, default: 50, get: entity => entity.requirement, set: (entity, value) => { entity.requirement = value } }
    ],
    Element: [
        ...boxProperties,
        colorProperty('red'),
        { name: 'health', label: 'Health Change', type: 'number', step: 0.1, default: -1, get: entity => entity.collisionHealth, set: (entity, value) => { entity.collisionHealth = value } }
    ],
    Text: [
        ...boxProperties,
        { name: 'text', type: 'textarea', default: 'Text' },
        { name: 'fontSize', type: 'number', min: 1, step: 1, default: 24 },
        { name: 'color', label: 'Text Color', type: 'text', default: 'black', get: entity => entity.textColor, set: (entity, value) => { entity.textColor = value } },
        { name: 'background', label: 'Background', type: 'text', nullable: true, default: 'white', get: entity => entity.backgroundColor, set: (entity, value) => { entity.backgroundColor = value } }
    ],
    Spawn: [
        ...positionProperties
    ],
    Goal: [
        ...positionProperties,
        colorProperty('green')
    ],
    Portal: [
        ...positionProperties,
        { name: 'id', type: 'number', min: 1, step: 1, default: 1 }
    ],
    Prism: [
        ...positionProperties,
        colorProperty('red'),
        { name: 'direction', type: 'select', options: directionChoices, default: 'RIGHT', get: entity => Direction.toString(entity.direction), set: (entity, value) => { entity.direction = Direction.fromString(value) } }
    ],
    ColorChanger: [
        ...positionProperties,
        colorProperty('red')
    ],
    ColorMixer: [
        ...positionProperties,
        colorProperty('red'),
        { name: 'additive', type: 'boolean', default: true }
    ],
    Mirror: [
        ...positionProperties,
        colorProperty('gray'),
        { name: 'persistOnce', type: 'boolean', default: false }
    ],
    SuperJump: [
        ...positionProperties
    ],
    Teleporter: [
        ...positionProperties,
        { name: 'hasDestination', type: 'boolean', default: false },
        { name: 'endX', type: 'number', step: 10, default: -1 },
        { name: 'endY', type: 'number', step: 10, default: -1 }
    ]
}

function camelToTitle(input) {
    return input
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase())
}

function pointIntersectsBox(point, box) {
    return point.x >= box.x
        && point.x <= box.x + box.width
        && point.y >= box.y
        && point.y <= box.y + box.height
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

function hasDefault(property) {
    return Object.prototype.hasOwnProperty.call(property, 'default')
}

function getDefaultValue(property, rect) {
    if (!hasDefault(property)) return undefined
    if (typeof property.default === 'function') return property.default(rect)

    return property.default
}

function valueToFormValue(value) {
    if (value instanceof Color) return value.toString()
    if (value == null) return ''

    return String(value)
}

function valueToJSONValue(value) {
    if (value instanceof Color) return value.toString()

    return value
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

function populatePropertyEditor(entity) {
    const form = document.getElementById('property-editor-form')
    form.innerHTML = ''

    if (!entity) {
        form.textContent = 'Selected entity properties will go here.'
        return
    }

    const editableProperties = entityProperties[entity.type] ?? []
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
    const properties = entityProperties[entity.type]
    if (!properties) return null

    const json = { type: entity.type }
    for (const property of properties) {
        const key = property.jsonName ?? property.name
        json[key] = valueToJSONValue(getPropertyValue(entity, property))
    }

    return json
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

function copyLevelJSON(levelJSON) {
    return JSON.parse(JSON.stringify(levelJSON))
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

export default class EditorArea {

    constructor(canvasId = 'editor-canvas') {
        this.canvasId = canvasId

        this.width = null
        this.height = null
        this.canvas = null
        this.context = null
        this.intervalId = null
        this.lastTime = 0
        this.mouseInfo = null

        this.rect = false
        this.selectedEntity = null
        this.selectedEntityMoved = false
        this.entities = []

        this.type = 'Spawn'
        this.levelColor = 'red'
        this.levelNames = []
        this.levelJSONByName = new Map()
        this.levelLoadingPromise = null
        this.currentLevelIndex = -1
        this.currentLevelName = null

        this.playingLevel = false
        this.playSnapshot = null
        this.previewPlayer = null
    }

    start() {
        this.canvas = document.getElementById(this.canvasId)
        this.width = this.canvas.width
        this.height = this.canvas.height

        this.context = this.canvas.getContext('2d')

        this.entities = [createEntityFromJSON({ type: 'Spawn', x: 30, y: 30 })].filter(Boolean)
        this.mouseInfo = { held: false, previous: { x: 0, y: 0 }, position: { x: 0, y: 0 } }
        this.syncLevelColorControl()
        this.syncLevelNavigationControls('Loading levels...')

        this.lastTime = performance.now()
        if (this.intervalId) clearInterval(this.intervalId)
        this.intervalId = setInterval(() => this.loop(), 20)

        this.loadUsedLevels().catch((err) => {
            this.syncLevelNavigationControls('Levels failed to load')
            dialog('There was an error loading levels:', err.message)
        })
    }

    advanceLevel() {
        this.stopPlayingLevel()
    }

    loop() {
        const now = performance.now()
        const delta = (now - this.lastTime) / 1000
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
                return
            }

            level.draw(context)
            return
        }

        this.drawGrid(context)

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

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    stop() {
        if (!this.intervalId) return
        clearInterval(this.intervalId)
        this.intervalId = null
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

    updateMousePosition(event) {
        if (!event) return

        Object.assign(this.mouseInfo, {
            previous: { x: this.mouseInfo.position.x, y: this.mouseInfo.position.y },
            position: { x: event.offsetX, y: event.offsetY }
        })
    }

    findEntityAt(point) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i]
            const boundingBox = Physics.boundingBox(entity, entity)
            if (pointIntersectsBox(point, boundingBox)) return entity
        }

        return null
    }

    getPlacementRect() {
        const definition = entityDefinitions[this.type] ?? { placement: 'box' }
        if (definition.placement === 'fixed') {
            return {
                x: this.round(this.mouseInfo.position.x),
                y: this.round(this.mouseInfo.position.y),
                width: definition.width,
                height: definition.height,
                fixed: true
            }
        }

        return {
            x: this.round(this.mouseInfo.position.x),
            y: this.round(this.mouseInfo.position.y),
            width: 0,
            height: 0
        }
    }

    onMousedown(event) {
        this.updateMousePosition(event)
        if (this.playingLevel) return

        Object.assign(this.mouseInfo, {
            held: true
        })
        const mouse = this.mouseInfo
        const entity = this.findEntityAt(mouse.position)

        this.selectedEntity = entity
        this.selectedEntityMoved = false
        populatePropertyEditor(entity)
        if (!entity) this.rect = this.getPlacementRect()
    }

    onMousemove(event) {
        this.updateMousePosition(event)
        const mouse = this.mouseInfo

        if (this.playingLevel) return

        if (mouse.held) {
            if (this.selectedEntity) {
                const dx = mouse.position.x - mouse.previous.x
                const dy = mouse.position.y - mouse.previous.y
                if (dx || dy) {
                    this.selectedEntityMoved = true
                    Object.assign(this.selectedEntity, {
                        x: this.selectedEntity.x + dx,
                        y: this.selectedEntity.y + dy
                    })
                }
            } else if (this.rect?.fixed) {
                Object.assign(this.rect, {
                    x: this.round(mouse.position.x),
                    y: this.round(mouse.position.y)
                })
            } else if (this.rect) {
                Object.assign(this.rect, {
                    width: this.round(mouse.position.x - this.rect.x),
                    height: this.round(mouse.position.y - this.rect.y)
                })
            }
        }
    }

    onMouseup(event) {
        this.updateMousePosition(event)
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
                populatePropertyEditor(this.selectedEntity)
            }
        } else if (this.rect) {
            const shouldCreate = this.rect.fixed || (this.rect.width && this.rect.height)
            if (shouldCreate) this.createEntity()
        }

        this.rect = false
        this.selectedEntityMoved = false
    }

    createEntity() {
        const maker = EntityCreator.registry.get(this.type)
        const properties = entityProperties[this.type]
        if (!maker || !properties) return

        const normRect = Physics.getNormalizedBox(this.rect)
        const entityProps = {}
        for (const property of properties) {
            const key = property.jsonName ?? property.name
            entityProps[key] = getDefaultValue(property, normRect)
        }

        const entity = maker(entityProps)
        this.entities.push(entity)
        this.selectedEntity = entity
        populatePropertyEditor(entity)
    }

    handleEntityClick(event) {
        if (this.playingLevel) return
        document.querySelectorAll('.button-entity.selected')
            .forEach(el => el.classList.remove('selected'))
        event.currentTarget.classList.add('selected')
        this.type = event.currentTarget.dataset.type
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

        await this.loadCachedLevelAt(0, false)
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

    async handleLoadClick() {
        if (this.playingLevel) return

        try {
            await this.loadUsedLevels()
            const choices = this.levelNames.map(name => ({ value: name, display: name }))
            const choice = await promptChoices('Pick a level to load:', 'Level:', choices)
            if (!choice) return

            await this.loadCachedLevelAt(this.levelNames.indexOf(choice))
        } catch (err) {
            dialog('There was an error loading your level:', err.message)
        }
    }

    handlePrintClick(type) {
        if (this.playingLevel) return
        if (type !== 'json') return

        console.log(JSON.stringify(this.getLevelJSON(), null, 3))
    }

    handlePlayClick(event) {
        if (this.playingLevel) {
            this.stopPlayingLevel()
            return
        }

        try {
            this.playSnapshot = this.getLevelJSON()
            this.playingLevel = this.createPlayableLevel(this.playSnapshot)
            event.currentTarget.textContent = 'Stop Playing'
            this.syncLevelNavigationControls()
        } catch (err) {
            dialog('Cannot play level:', err.message)
        }
    }

    async handleSaveClick() {
        if (this.playingLevel) return

        const name = await promptInput('Save level', 'Level Name:')
        if (!name) return

        const levelString = JSON.stringify(this.getLevelJSON(), null, 3)
        downloadFile(`${name}.json`, levelString, 'application/json')
    }

    handleHelpClick() {
        const helpString =
            `This is the Level Editor. Here you can create your own level
            then either save it or play it.<br><br>

            On top of the level display, there is a toolbar with
            options related to your created level.<br><br>

            On the left of the level display, there are buttons which will
            allow you to change what level object type you want to place in
            the level editor. Box-like objects are placed by dragging a box.
            Point and item objects are placed by clicking or dragging to the
            target position.<br><br>

            In the middle is the level editor itself. To select a level
            object, click on it. To move a level object, drag a selected
            level object. You may also remove a level object from the level
            by selecting it and pressing the delete/backspace key on your
            keyboard.<br><br>

            On the right side of the level display, you will see the
            property editor. Whenever you create or click on an entity in
            the level, its properties will be displayed there.<br><br>

            On the bottom of the level editor, you can change the starting
            player color and toggle debug mode.`

        dialog('How to use the level editor:', helpString)
    }

    handleKeyPress(event) {
        if (this.playingLevel) return

        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault()
            const index = this.entities.indexOf(this.selectedEntity)
            if (index !== -1) {
                this.entities.splice(index, 1)
                this.selectedEntity = null
                populatePropertyEditor(null)
            }
        }

        if (event.key === 'd' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            if (!this.selectedEntity) return
            const entityJSON = entityToJSON(this.selectedEntity)
            if (!entityJSON) return

            const entity = createEntityFromJSON(offsetEntityJSON(entityJSON, 10, 10))
            if (!entity) return

            this.entities.push(entity)
            this.selectedEntity = entity
            populatePropertyEditor(entity)
        }
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
    }

    syncLevelColorControl() {
        const select = document.getElementById('select-level-color')
        if (select) select.value = this.levelColor
    }

    getLevelNavigationLabel() {
        if (this.currentLevelIndex !== -1 && this.levelNames.length) {
            return `${this.currentLevelName} (${this.currentLevelIndex + 1}/${this.levelNames.length})`
        }
        if (this.currentLevelName) return this.currentLevelName

        return 'No level loaded'
    }

    syncLevelNavigationControls(statusText = null) {
        const previousButton = document.getElementById('button-previous-level')
        const nextButton = document.getElementById('button-next-level')
        const label = document.getElementById('current-level-label')
        const hasOrderedLevel = this.currentLevelIndex !== -1 && this.levelNames.length > 0

        if (label) label.textContent = statusText ?? this.getLevelNavigationLabel()
        if (previousButton) previousButton.disabled = this.playingLevel || !hasOrderedLevel || this.currentLevelIndex <= 0
        if (nextButton) nextButton.disabled = this.playingLevel || !hasOrderedLevel || this.currentLevelIndex >= this.levelNames.length - 1
    }

    getLevelJSON() {
        return {
            color: this.levelColor,
            entities: this.entities.map(entityToJSON).filter(Boolean)
        }
    }

    async loadLevelJSON(levelJSON, name = 'noname') {
        const unsupportedTypes = getUnsupportedTypes(levelJSON)
        const level = await LevelCreator.loadLevelFromJSON(levelJSON, name)
        const levelIndex = this.levelNames.indexOf(name)

        this.levelColor = level.color.toString()
        this.syncLevelColorControl()
        this.entities = [...level.entities, ...level.texts]
        this.selectedEntity = null
        this.rect = false
        this.currentLevelName = name
        this.currentLevelIndex = levelIndex
        if (levelIndex !== -1) this.levelJSONByName.set(name, copyLevelJSON(levelJSON))
        this.syncLevelNavigationControls()
        populatePropertyEditor(null)

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

    createPlayableLevel(levelJSON) {
        if (!levelJSON.entities.some(entityJSON => entityJSON.type === 'Spawn')) {
            throw new Error('Add a Spawn before playing the level.')
        }

        const entities = levelJSON.entities.map(createEntityFromJSON).filter(Boolean)
        const level = new Level('editor-preview', Color.getColor(levelJSON.color), entities)
        level.levelManager = this
        level.setPlayer(this.getPreviewPlayer())
        level.respawnPlayer()

        return level
    }

    restartPlayingLevel() {
        if (!this.playSnapshot) return
        this.playingLevel = this.createPlayableLevel(this.playSnapshot)
        this.syncLevelNavigationControls()
    }

    stopPlayingLevel() {
        if (this.playingLevel) this.playingLevel.setPlayer(null)
        this.playingLevel = false
        this.playSnapshot = null
        document.getElementById('button-play').textContent = 'Play Level'
        this.syncLevelNavigationControls()
    }

}
