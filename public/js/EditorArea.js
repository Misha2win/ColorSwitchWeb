import Level from './level/Level.js'
import * as EntityCreator from './level/EntityCreator.js'
import * as LevelCreator from './level/LevelCreator.js'
import * as Physics from './math/PhysicsEngine.js'
import { promptChoices, promptInput, dialog } from './utility/Prompt.js'

const entityProperties = {
}

function populatePropertyEditor(entity) {
    const form = document.getElementById('property-editor-form')
    form.innerHTML = ''

    if (!entity) {
        form.textContent = 'Selected entity properties will go here.'
        return
    }

    const editableProperties = (entityProperties[entity.type] ?? []).filter(prop => prop.display ?? true)
    if (!editableProperties.length) {
        form.textContent = 'This entity does not have editable properties.'
        return
    }

    const camelToTitle = (input) => {
        return input
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/^./, c => c.toUpperCase())
    }

    for (const property of editableProperties) {
        if (property.display === false) continue

        const div = document.createElement('div')
        div.setAttribute('class', 'property-form-group')
        form.appendChild(div)

        const label = document.createElement('label')
        label.setAttribute('for', `property-${property.name}`)
        label.textContent = camelToTitle(property.name)
        div.appendChild(label)

        if (property.type !== 'color') {
            const isRequirement = property.name === 'requirement'

            const input = document.createElement('input')
            input.setAttribute('id', `property-${property.name}`)
            input.setAttribute('name', `property-${property.name}`)
            input.setAttribute('type', property.type)
            if (property.type === 'number') {
                input.setAttribute('step', isRequirement ? 1 : 10)
                input.setAttribute('min', isRequirement ? 1 : 10)
            }
            input.value = entity[property.name]
            div.appendChild(input)

            input.addEventListener('input', (event) => {
                const num = event.target.valueAsNumber
                entity[property.name] = property.type === 'number'
                    ? Number.isFinite(num) ? num : (isRequirement ? 1 : 10)
                    : event.target.value
                if (isRequirement) entity.clicks = entity[property.name]
            })
        } else {
            const select = document.createElement('select')
            select.setAttribute('id', `property-${property.name}`)
            select.setAttribute('name', `property-${property.name}`)
            select.innerHTML = `
                <option value="black">black</option>
                <option value="red">red</option>
                <option value="green">green</option>
                <option value="blue">blue</option>
                <option value="yellow">yellow</option>
                <option value="magenta">magenta</option>
                <option value="cyan">cyan</option>
                <option value="white">white</option>`
            select.value = entity[property.name]
            div.appendChild(select)

            select.addEventListener('change', (event) => {
                entity[property.name] = event.target.value
            })
        }
    }

}

function downloadFile(name, contents, mime='text/plain') {
    const blob = new Blob([contents], {type: mime})
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

        this.type = 'Spawn'
        this.spawnPoint = { x: 30, y: 30 }

        this.playingLevel = false
	}

	start() {
		this.canvas = document.getElementById(this.canvasId)
		this.width = this.canvas.width
		this.height = this.canvas.height

		this.context = this.canvas.getContext('2d')

        this.entities = []

		this.mouseInfo = { held: false, position: { x: 0, y: 0 } }

		this.lastTime = performance.now()
		if (this.intervalId) clearInterval(this.intervalId)
		this.intervalId = setInterval(() => this.loop(), 20)
	}

    advanceLevel(currentLevel, cursor) {
        if (cursor.isPlayer) {
            document.getElementById('button-play').textContent = 'Play Level'
            this.playingLevel = false
        }
    }

	loop() {
		const now = performance.now()
		const delta = (now - this.lastTime) / 1000
		this.lastTime = now

		const { context, rect } = this

		this.clear()
        if (this.playingLevel) {
            const level = this.playingLevel
            Physics.calculatePhysics(level.entities)

            level.update(delta)

            level.draw(context)
        } else {
            this.drawGrid(context)

            for (const entity of this.entities) {
                entity.draw(context)
                if (entity === this.selectedEntity) {
                    context.fillStyle = 'rgba(0, 100, 200, 0.4)'
                    context.fillRect(entity.x - 5, entity.y - 5, entity.width + 10, entity.height + 10)
                }
            }

            if (rect) {
                context.fillStyle = 'rgba(0, 100, 200, 0.4)'
                context.fillRect(rect.x, rect.y, rect.width, rect.height)
            }

            context.beginPath()
            context.arc(this.spawnPoint.x, this.spawnPoint.y, 5, 0, Math.PI * 2)
            context.fillStyle = `rgba(255, 0, 0, 0.5)`
            context.fill()
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
        context.lineWidth = 0.1
        context.lineCap = 'round'
        context.strokeStyle = 'black'

        context.beginPath()
        for (let y = 0; y < this.height; y += 10) {
            context.moveTo(0, y)
            context.lineTo(this.width, y)
        }
        for (let x = 0; x < this.width; x += 10) {
            context.moveTo(x, 0)
            context.lineTo(x, this.height)
        }
        context.stroke()

        context.lineWidth = 0.2
        context.beginPath()
        context.moveTo(this.width / 2, 0)
        context.lineTo(this.width / 2, this.height)
        context.moveTo(0, this.height / 2)
        context.lineTo(this.width, this.height / 2)
        context.stroke()
    }

    round(value) {
        return Math.round(value / 10) * 10
    }

    onMousedown() {
        Object.assign(this.mouseInfo, {
            held: true
        })
        const mouse = this.mouseInfo

        if (this.playingLevel) return

        let entity = null
        for (const contestant of this.entities) {
            const boundingBox = Physics.boundingBox(contestant, contestant)
            if (Physics.pointIntersectsBox(mouse.position, boundingBox)) {
                entity = contestant
            }
        }

        this.selectedEntity = entity // Allowed to be null
        populatePropertyEditor(entity)
        if (!entity) {
            if (this.type === 'Spawn') {
                this.spawnPoint = {
                    x: Math.round(mouse.position.x / 5) * 5,
                    y: Math.round(mouse.position.y / 5) * 5
                }
            } else {
                this.rect = {
                    x: this.round(mouse.position.x),
                    y: this.round(mouse.position.y),
                    width: 0,
                    height: 0
                }
            }
        }
    }

    onMousemove(event) {
        Object.assign(this.mouseInfo, {
            previous: { x: this.mouseInfo.position.x, y: this.mouseInfo.position.y },
            position: { x: event.offsetX, y: event.offsetY }
        })
        const mouse = this.mouseInfo

        if (this.playingLevel) return

        if (mouse.held) {
            if (this.selectedEntity) {
                Object.assign(this.selectedEntity, {
                    x: this.selectedEntity.x + mouse.position.x - mouse.previous.x,
                    y: this.selectedEntity.y + mouse.position.y - mouse.previous.y,
                })
            } else if (this.rect) {
                Object.assign(this.rect, {
                    width: this.round(mouse.position.x - this.rect.x),
                    height: this.round(mouse.position.y - this.rect.y)
                })
            }
        }
    }

    onMouseup() {
        Object.assign(this.mouseInfo, {
            held: false
        })

        if (this.playingLevel) return

        if (this.selectedEntity) {
            Object.assign(this.selectedEntity, {
                x: this.round(this.selectedEntity.x),
                y: this.round(this.selectedEntity.y)
            })
        } else if (this.rect) {
            if (this.rect.width && this.rect.height) {
                this.createEntity()
            }
        }

        this.rect = false
    }

    createEntity() {
        const maker = EntityCreator.registry.get(this.type)
        if (!maker) return

        const normRect = Physics.getNormalizedBox(this.rect)

        // Build properties required for entity
        const entityProps = { ...normRect }
        for (const property of entityProperties[this.type] ?? []) {
            if (entityProps[property.name]) continue
            if (property.default) entityProps[property.name] = property.default
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
        event.target.classList.add('selected')
        this.type = event.target.dataset.type
    }

    handleLoadClick() {
        if (this.playingLevel) return

        LevelCreator.getLevelOrderLevels()
            .then((names) => {
                const choices = names.map(name => ({ value: name, display: name }))
                return promptChoices('Pick a level to load:', 'Level:', choices)
            })
            .then((choice) => {
                if (!choice) return
                return LevelCreator.loadLevel(choice, { forceLoad: true })
            })
            .then((level) => {
                if (!level) return
                this.spawnPoint = level.startPoint
                this.entities = level.entities
            })
    }

    handlePrintClick(type) {
        if (this.playingLevel) return

        const level = new Level('noname', this.spawnPoint, this.entities)
        if (type === 'json') {
            const levelString = JSON.stringify(level, null, 4)
            console.log(levelString)
        }
    }

    handlePlayClick(event) {
        if (!this.playingLevel) {
            const entitiesCopy = []
            for (const entity of this.entities) {
                entitiesCopy.push(EntityCreator.registry.get(entity.type)(entity.toJSON()))
            }

            if (!entitiesCopy.length) return
            this.playingLevel = new Level('noname', this.spawnPoint, entitiesCopy)
            this.playingLevel.levelManager = this
            event.target.textContent = 'Stop Playing'
        } else {
            this.playingLevel = false
            event.target.textContent = 'Play Level'
        }
    }

    handleSaveClick() {
        if (this.playingLevel) return

        promptInput('Save level', 'Level Name:')
            .then((name) => {
                if (!name) return
                const level = new Level(name, this.spawnPoint, this.entities)
                const levelString = JSON.stringify(level, null, 4)
                downloadFile(`${name}.json`, levelString)
            })
    }

    handleHelpClick() {
        const helpString =
            `This is the Level Editor. Here you can create your own level
            then either save it or play it.<br><br>

            On top of the level display, there are a toolbar of with
            options related your created level.<br><br>

            On the left of the level display, there are buttons which will
            allow you to change what level object type you want to place in
            the level editor. Place objects by clicking onto the editor and
            dragging your mouse. When you release your mouse, your selected
            entity type will be created on the box you just created.<br><br>

            In the middle is the level editor itself, this shows you the
            level you created and allows you to create and move level
            objects. To select a level object, click on it without moving
            your mouse. To move a level object, drag a selected level
            object. When you release it, it will be moved. You may also
            remove a level object from the level by selecting it and
            pressing the delete/backspace key on your keyboard.<br><br>

            On the right side of the level display, you will see the
            property editor. Whenever you create or click on an entity in
            the level, its properties will be displayed there. You will
            be able to use the property editor to change the properties
            of the selected entity. There, you will be able to change
            things like: the entity's color, width and height.<br><br>

            On the bottom of the level editor, you will see the toggle for
            the debug mode.`

        dialog('How to use the level editor:', helpString)
    }

    handleKeyPress(event) {
        if (this.playingLevel) return

        if (event.key === 'Backspace') {
            event.preventDefault()
            const index = this.entities.indexOf(this.selectedEntity)
            if (index !== -1) {
                this.entities.splice(index, 1)
                this.selectedEntity = null
                populatePropertyEditor(null)
            }
        }

        if (event.key === 'd' && event.metaKey) {
            event.preventDefault()
            if (!this.selectedEntity) return
            const entity = EntityCreator.registry.get(this.selectedEntity.type)(this.selectedEntity.toJSON())
            this.entities.push(entity)
            this.selectedEntity = entity
            populatePropertyEditor(entity)
        }
    }

    handleLoadStringClick() {
        if (this.playingLevel) return

        promptInput('Load level from string', 'Level String:')
            .then((string) => {
                if (!string) return
                return LevelCreator.loadLevelFromJSON(JSON.parse(string))
            })
            .then((level) => {
                this.spawnPoint = level.startPoint
                this.entities = level.entities
            })
            .catch((err) => {
                dialog('There is was an error loading your level:', err.message)
            })
    }

}
