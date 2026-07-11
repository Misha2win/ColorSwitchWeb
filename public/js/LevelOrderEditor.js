import Color from './entity/Color.js'
import * as LevelCreator from './level/LevelCreator.js'
import {
    fetchLevelOrderJSON,
    overwriteLevelOrderFile,
    validateLevelOrderJSON
} from './level/LevelOrderApi.js'
import { dialog, promptChoices } from './utility/Prompt.js'

const levelWidth = 750
const levelHeight = 600
const previewWidth = 150
const previewHeight = 120
const dragStartThreshold = 5
const autoScrollEdgeSize = 80
const autoScrollSpeed = 12
const gridRowTolerance = 4

const orderedListElement = document.getElementById('level-order-list')
const unusedListElement = document.getElementById('unused-level-list')
const mobileListElement = document.getElementById('mobile-level-list')
const levelListElements = [orderedListElement, unusedListElement]
const orderedCountElement = document.getElementById('level-order-count')
const unusedCountElement = document.getElementById('unused-level-count')
const mobileCountElement = document.getElementById('mobile-level-count')
const viewButtons = [...document.querySelectorAll('.order-view-button')]
const addButton = document.getElementById('button-add-level')
const editSelectedButton = document.getElementById('button-edit-selected-level')
const saveButton = document.getElementById('button-save-order')
const orderedSectionElement = document.querySelector('[data-level-section="ordered"]')
const unusedSectionElement = document.querySelector('[data-level-section="unused"]')
const mobileSectionElement = document.querySelector('[data-level-section="mobile"]')
const sectionElementsByListType = {
    ordered: orderedSectionElement,
    unused: unusedSectionElement,
    mobile: mobileSectionElement
}
const listElementsByType = {
    ordered: orderedListElement,
    unused: unusedListElement
}

let loadedLevelOrderJSON = null
let savedLevelOrder = []
let savedNotUsed = []
let savedMobileLevels = {}
let activeListType = 'ordered'
let selectedCard = null
let dragState = null

viewButtons.forEach(button => {
    button.addEventListener('click', () => setActiveListType(button.dataset.levelList))
})
addButton.addEventListener('click', addLevel)
editSelectedButton.addEventListener('click', editSelectedLevel)
saveButton.addEventListener('click', saveOrder)
window.addEventListener('beforeunload', event => {
    if (!hasUnsavedChanges()) return

    event.preventDefault()
    event.returnValue = ''
})

start()

async function start() {
    syncActionButtons()

    try {
        loadedLevelOrderJSON = await fetchLevelOrderJSON()
        validateLevelOrderJSON(loadedLevelOrderJSON)
        savedLevelOrder = [...loadedLevelOrderJSON.levelOrder]
        savedMobileLevels = getMobileLevelsObject(loadedLevelOrderJSON.mobileLevels)
        savedNotUsed = getUnassociatedUnusedLevelNames(loadedLevelOrderJSON.NotUsed ?? [], savedMobileLevels)
        renderLevelCards(savedLevelOrder, savedNotUsed, savedMobileLevels)
        setActiveListType(activeListType)
        syncStatus()
    } catch (err) {
        dialog('There was an error loading level order:', err.message)
    } finally {
        syncActionButtons()
    }
}

function getCurrentOrder() {
    return getLevelNamesFromList(orderedListElement)
}

function getCurrentUnused() {
    return getLevelNamesFromList(unusedListElement)
}

function getMobileLevelsObject(mobileLevels) {
    return mobileLevels && typeof mobileLevels === 'object' && !Array.isArray(mobileLevels)
        ? { ...mobileLevels }
        : {}
}

function getMobileLevelMappings(mobileLevels = savedMobileLevels) {
    return Object.entries(mobileLevels)
        .filter(([levelName, mobileLevelName]) => typeof levelName === 'string' && typeof mobileLevelName === 'string')
}

function getAssociatedMobileLevelNames(mobileLevels) {
    return new Set(getMobileLevelMappings(mobileLevels).map(([, mobileLevelName]) => mobileLevelName))
}

function getUnassociatedUnusedLevelNames(unusedNames, mobileLevels) {
    const associatedMobileLevelNames = getAssociatedMobileLevelNames(mobileLevels)
    return unusedNames.filter(name => !associatedMobileLevelNames.has(name))
}

function getLevelCardsFromList(listElement) {
    return [...listElement.children].filter(element => element.classList.contains('order-level-card'))
}

function getMobileCards() {
    return [...mobileListElement.children].filter(element => element.classList.contains('order-mobile-card'))
}

function getLevelNamesFromList(listElement) {
    return getLevelCardsFromList(listElement).map(card => card.dataset.levelName)
}

function getCurrentMobileLevels() {
    const mobileLevels = {}

    for (const card of getMobileCards()) {
        mobileLevels[card.dataset.levelName] = card.dataset.mobileLevelName
    }

    return mobileLevels
}

function ordersMatch(first, second) {
    return first.length === second.length && first.every((name, index) => name === second[index])
}

function mobileLevelsMatch(first, second) {
    const firstEntries = getMobileLevelMappings(first)
    const secondEntries = getMobileLevelMappings(second)

    return firstEntries.length === secondEntries.length
        && firstEntries.every(([levelName, mobileLevelName]) => second[levelName] === mobileLevelName)
}

function hasUnsavedChanges() {
    return loadedLevelOrderJSON
        && (!ordersMatch(getCurrentOrder(), savedLevelOrder)
            || !ordersMatch(getCurrentUnused(), savedNotUsed)
            || !mobileLevelsMatch(getCurrentMobileLevels(), savedMobileLevels))
}

function syncStatus() {
    const orderedCount = getCurrentOrder().length
    const unusedCount = getCurrentUnused().length
    const mobileCount = getMobileCards().length
    orderedCountElement.textContent = String(orderedCount)
    unusedCountElement.textContent = String(unusedCount)
    mobileCountElement.textContent = String(mobileCount)
}

function syncActionButtons() {
    const loaded = !!loadedLevelOrderJSON
    const changed = hasUnsavedChanges()
    const unusedCount = getCurrentUnused().length
    const availableMobileSourceCount = getAvailableMobileSourceLevels().length
    const addingMobileAssociation = activeListType === 'mobile'
    const showingAddLevelAction = activeListType !== 'unused'

    addButton.hidden = !showingAddLevelAction
    addButton.disabled = !showingAddLevelAction || !loaded || unusedCount === 0 || (addingMobileAssociation && availableMobileSourceCount === 0)
    editSelectedButton.disabled = !loaded || !selectedCard
    saveButton.disabled = !loaded || !changed

    if (!showingAddLevelAction) {
        addButton.title = ''
    } else if (addingMobileAssociation) {
        if (!availableMobileSourceCount) {
            addButton.title = 'Every ordered level already has a mobile association.'
        } else if (!unusedCount) {
            addButton.title = 'There are no unused levels to use as mobile replacements.'
        } else {
            addButton.title = 'Add a mobile level association.'
        }
    } else {
        addButton.title = unusedCount ? 'Add an unused level to the order.' : 'There are no unused levels to add.'
    }
    editSelectedButton.title = selectedCard ? `Edit ${selectedCard.dataset.levelName}.` : 'Select a level to edit.'

    if (!loaded) {
        saveButton.title = 'Load level order before saving.'
    } else if (!changed) {
        saveButton.title = 'Change the order before saving.'
    } else {
        saveButton.title = 'Save resources/levelOrder.json.'
    }

}

function renderLevelCards(orderedNames, unusedNames, mobileLevels) {
    orderedListElement.replaceChildren()
    unusedListElement.replaceChildren()
    mobileListElement.replaceChildren()
    selectedCard = null

    appendLevelCards(orderedListElement, orderedNames)
    appendLevelCards(unusedListElement, unusedNames)
    appendMobileLevelCards(mobileLevels)

    syncCardIndexes()
    syncSelectedCard()
}

function appendLevelCards(listElement, levelNames) {
    for (const name of levelNames) {
        const card = createLevelCard(name)
        listElement.appendChild(card)
        renderPreview(name, card.querySelector('.order-level-preview'))
    }
}

function appendMobileLevelCards(mobileLevels) {
    for (const [levelName, mobileLevelName] of getMobileLevelMappings(mobileLevels)) {
        const card = createMobileLevelCard(levelName, mobileLevelName)
        mobileListElement.appendChild(card)
    }
}

function createLevelCard(name) {
    const card = document.createElement('article')
    card.className = 'order-level-card'
    card.dataset.levelName = name
    card.tabIndex = 0

    const header = document.createElement('div')
    header.className = 'order-level-header'

    const indexElement = document.createElement('div')
    indexElement.className = 'order-level-index'

    const preview = document.createElement('canvas')
    preview.className = 'order-level-preview'
    preview.width = previewWidth
    preview.height = previewHeight
    preview.setAttribute('aria-label', `${name} preview`)

    const nameElement = document.createElement('div')
    nameElement.className = 'order-level-name'
    nameElement.textContent = name

    const actionButton = document.createElement('button')
    actionButton.type = 'button'
    actionButton.className = 'order-card-action-button'
    actionButton.addEventListener('click', event => {
        event.stopPropagation()
        toggleLevelCardSection(card)
    })

    header.append(indexElement, nameElement, actionButton)
    card.append(header, preview)
    card.addEventListener('pointerdown', handlePointerDown)
    card.addEventListener('click', event => {
        if (dragState?.active || event.target.closest('button')) return

        selectLevelCard(card)
    })
    card.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return

        event.preventDefault()
        moveCard(card, event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1)
    })

    return card
}

function createMobileLevelCard(levelName, mobileLevelName) {
    const card = document.createElement('article')
    card.className = 'order-mobile-card'
    card.dataset.levelName = levelName
    card.dataset.mobileLevelName = mobileLevelName

    const levelPanel = createMobileLevelPanel(levelName, `${levelName} level preview`)
    levelPanel.classList.add('order-mobile-level-source')
    const arrow = document.createElement('div')
    arrow.className = 'order-mobile-arrow'
    arrow.textContent = '→'
    arrow.setAttribute('aria-hidden', 'true')
    const mobilePanel = createMobileLevelPanel(mobileLevelName, `${mobileLevelName} mobile level preview`)
    mobilePanel.classList.add('order-mobile-level-target')

    const actionButton = document.createElement('button')
    actionButton.type = 'button'
    actionButton.className = 'order-card-action-button order-mobile-remove-button'
    actionButton.textContent = '×'
    actionButton.setAttribute('aria-label', `Remove mobile association for ${levelName}`)
    actionButton.title = 'Remove association'
    actionButton.addEventListener('click', event => {
        event.stopPropagation()
        removeMobileLevelAssociation(card)
    })

    card.append(levelPanel, arrow, mobilePanel, actionButton)
    card.setAttribute('aria-label', `${levelName} uses ${mobileLevelName} on mobile`)

    renderPreview(levelName, levelPanel.querySelector('.order-mobile-preview'))
    renderPreview(mobileLevelName, mobilePanel.querySelector('.order-mobile-preview'))

    return card
}

function createMobileLevelPanel(name, previewLabel) {
    const panel = document.createElement('button')
    panel.type = 'button'
    panel.className = 'order-mobile-level'
    panel.dataset.levelName = name
    panel.title = `Select ${name}`

    const nameElement = document.createElement('div')
    nameElement.className = 'order-mobile-name'
    nameElement.textContent = name

    const preview = document.createElement('canvas')
    preview.className = 'order-mobile-preview'
    preview.width = previewWidth
    preview.height = previewHeight
    preview.setAttribute('aria-label', previewLabel)

    panel.append(nameElement, preview)
    panel.addEventListener('click', () => selectLevelCard(panel))

    return panel
}

function setActiveListType(type) {
    if (!sectionElementsByListType[type]) return

    activeListType = type
    for (const button of viewButtons) {
        const active = button.dataset.levelList === type
        button.classList.toggle('is-active', active)
        button.setAttribute('aria-pressed', active ? 'true' : 'false')
    }

    for (const [sectionType, section] of Object.entries(sectionElementsByListType)) {
        section.classList.toggle('is-active', sectionType === type)
    }

    syncActionButtons()
}

function selectLevelCard(card) {
    if (selectedCard === card) return

    selectedCard?.classList.remove('is-selected')
    selectedCard = card
    selectedCard.classList.add('is-selected')
    selectedCard.focus()
    syncActionButtons()
}

function syncSelectedCard() {
    if (selectedCard?.isConnected) {
        selectedCard.classList.add('is-selected')
    } else {
        selectedCard = null
    }
    syncActionButtons()
}

async function addLevel() {
    if (activeListType === 'mobile') {
        await addMobileLevelAssociation()
        return
    }
    if (activeListType === 'unused') return

    const unusedNames = getCurrentUnused()
    if (!loadedLevelOrderJSON || !unusedNames.length) return

    const name = await promptChoices(
        'Add Level',
        'Level:',
        unusedNames.map(levelName => ({ value: levelName, display: levelName })),
        unusedNames[0]
    )
    if (!name || getCurrentOrder().includes(name)) return

    const card = getLevelCardsFromList(unusedListElement)
        .find(levelCard => levelCard.dataset.levelName === name)
    if (card) moveLevelCardToList(card, orderedListElement)
}

function getAvailableMobileSourceLevels() {
    const mobileLevels = getCurrentMobileLevels()
    return getCurrentOrder().filter(levelName => !mobileLevels[levelName])
}

async function addMobileLevelAssociation() {
    const sourceLevelNames = getAvailableMobileSourceLevels()
    const unusedNames = getCurrentUnused()

    if (!loadedLevelOrderJSON || !sourceLevelNames.length || !unusedNames.length) return

    const levelName = await promptChoices(
        'Add Mobile Level',
        'Replace level:',
        sourceLevelNames.map(name => ({ value: name, display: name })),
        sourceLevelNames[0]
    )
    if (!levelName) return

    const mobileLevelName = await promptChoices(
        'Add Mobile Level',
        'With mobile level:',
        unusedNames.map(name => ({ value: name, display: name })),
        unusedNames[0]
    )
    if (!mobileLevelName || getCurrentMobileLevels()[levelName]) return

    removeLevelCardFromList(unusedListElement, mobileLevelName)

    const card = createMobileLevelCard(levelName, mobileLevelName)
    mobileListElement.appendChild(card)
    selectLevelCard(card.querySelector(`[data-level-name="${mobileLevelName}"]`))
    syncCardIndexes()
    syncStatus()
    syncActionButtons()
}

function toggleLevelCardSection(card) {
    const targetList = card.parentElement === orderedListElement ? unusedListElement : orderedListElement
    moveLevelCardToList(card, targetList)
}

function moveLevelCardToList(card, targetList, options = {}) {
    const previousList = card.parentElement

    targetList.appendChild(card)
    if (previousList === orderedListElement && targetList === unusedListElement) {
        removeMobileLevelAssociationForLevel(card.dataset.levelName)
    }
    if (options.activateTarget) setActiveListType(targetList.dataset.levelList)
    selectLevelCard(card)
    card.focus()
    syncCardIndexes()
    syncStatus()
    syncActionButtons()
}

function moveCard(card, direction) {
    const sibling = direction < 0 ? card.previousElementSibling : card.nextElementSibling
    if (!sibling) return

    if (direction < 0) {
        card.parentElement.insertBefore(card, sibling)
    } else {
        card.parentElement.insertBefore(sibling, card)
    }

    card.focus()
    selectLevelCard(card)
    syncCardIndexes()
    syncStatus()
    syncActionButtons()
}

function syncCardIndexes() {
    for (const [index, card] of getLevelCardsFromList(orderedListElement).entries()) {
        const number = index + 1
        card.querySelector('.order-level-index').textContent = String(number)
        card.querySelector('.order-card-action-button').textContent = '×'
        card.querySelector('.order-card-action-button').setAttribute('aria-label', `Move ${card.dataset.levelName} to unused levels`)
        card.querySelector('.order-card-action-button').title = 'Move to unused'
        card.setAttribute('aria-label', `${number}. ${card.dataset.levelName}`)
    }

    for (const card of getLevelCardsFromList(unusedListElement)) {
        card.querySelector('.order-level-index').textContent = ''
        card.querySelector('.order-card-action-button').textContent = '+'
        card.querySelector('.order-card-action-button').setAttribute('aria-label', `Add ${card.dataset.levelName} to level order`)
        card.querySelector('.order-card-action-button').title = 'Add to order'
        card.setAttribute('aria-label', `Unused. ${card.dataset.levelName}`)
    }
}

function handlePointerDown(event) {
    if (event.button !== 0 || event.target.closest('button')) return
    if (dragState) return

    event.preventDefault()

    dragState = {
        card: event.currentTarget,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        active: false
    }
    dragState.card.focus()
    selectLevelCard(dragState.card)

    try {
        dragState.card.setPointerCapture?.(event.pointerId)
    } catch {
        // Pointer capture can fail for synthetic events; dragging still works without it.
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)
}

function handlePointerMove(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return

    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY)
    if (!dragState.active && distance < dragStartThreshold) return

    event.preventDefault()
    if (!dragState.active) {
        dragState.active = true
        dragState.card.classList.add('is-dragging')
        document.body.classList.add('is-order-dragging')
    }

    const targetList = getDropList(event.clientX, event.clientY) ?? dragState.card.parentElement
    if (targetList !== dragState.card.parentElement) setActiveListType(targetList.dataset.levelList)
    const afterElement = getDragAfterElement(targetList, event.clientX, event.clientY)
    if (afterElement) {
        targetList.insertBefore(dragState.card, afterElement)
    } else {
        targetList.appendChild(dragState.card)
    }

    autoScroll(event.clientY)
    syncCardIndexes()
    syncStatus()
}

function handlePointerEnd(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return

    try {
        dragState.card.releasePointerCapture?.(event.pointerId)
    } catch {
        // Pointer capture may already be released if the browser cancels the gesture.
    }
    if (dragState.card.parentElement === unusedListElement) {
        removeMobileLevelAssociationForLevel(dragState.card.dataset.levelName)
    }
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerEnd)
    window.removeEventListener('pointercancel', handlePointerEnd)
    dragState.card.classList.remove('is-dragging')
    document.body.classList.remove('is-order-dragging')
    dragState = null
    syncCardIndexes()
    syncStatus()
    syncActionButtons()
}

function getDropList(pointerX, pointerY) {
    return levelListElements.find(listElement => {
        const box = listElement.getBoundingClientRect()
        return pointerX >= box.left
            && pointerX <= box.right
            && pointerY >= box.top
            && pointerY <= box.bottom
    }) ?? getDropListFromViewButton(pointerX, pointerY)
}

function getDropListFromViewButton(pointerX, pointerY) {
    const button = viewButtons.find(viewButton => {
        const box = viewButton.getBoundingClientRect()
        return pointerX >= box.left
            && pointerX <= box.right
            && pointerY >= box.top
            && pointerY <= box.bottom
    })

    return button ? listElementsByType[button.dataset.levelList] ?? null : null
}

function getDragAfterElement(listElement, pointerX, pointerY) {
    const cards = getLevelCardsFromList(listElement)
        .filter(card => !card.classList.contains('is-dragging'))
    const rows = []

    for (const card of cards) {
        const box = card.getBoundingClientRect()
        const row = rows.find(candidate => Math.abs(candidate.top - box.top) <= gridRowTolerance)

        if (row) {
            row.cards.push({ card, box })
            row.top = Math.min(row.top, box.top)
            row.bottom = Math.max(row.bottom, box.bottom)
        } else {
            rows.push({ top: box.top, bottom: box.bottom, cards: [{ card, box }] })
        }
    }

    rows.sort((first, second) => first.top - second.top)

    for (const [index, row] of rows.entries()) {
        row.cards.sort((first, second) => first.box.left - second.box.left)

        if (pointerY < row.top) return row.cards[0].card
        if (pointerY > row.bottom) continue

        for (const { card, box } of row.cards) {
            if (pointerX < box.left + box.width / 2) return card
        }

        return rows[index + 1]?.cards[0]?.card ?? null
    }

    return null
}

function autoScroll(pointerY) {
    if (pointerY < autoScrollEdgeSize) {
        window.scrollBy(0, -autoScrollSpeed)
    } else if (pointerY > window.innerHeight - autoScrollEdgeSize) {
        window.scrollBy(0, autoScrollSpeed)
    }
}

function removeLevelCardFromList(listElement, levelName) {
    const card = getLevelCardsFromList(listElement).find(levelCard => levelCard.dataset.levelName === levelName)
    if (!card) return null

    if (selectedCard === card) selectedCard = null
    card.remove()
    return card
}

function addUnusedLevelCard(levelName) {
    if (getCurrentUnused().includes(levelName) || getCurrentOrder().includes(levelName)) return null

    const card = createLevelCard(levelName)
    unusedListElement.appendChild(card)
    renderPreview(levelName, card.querySelector('.order-level-preview'))
    return card
}

function removeMobileLevelAssociation(card) {
    if (!card) return

    const mobileLevelName = card.dataset.mobileLevelName
    if (selectedCard && card.contains(selectedCard)) selectedCard = null
    card.remove()
    addUnusedLevelCard(mobileLevelName)
    syncCardIndexes()
    syncStatus()
    syncActionButtons()
}

function removeMobileLevelAssociationForLevel(levelName) {
    const card = getMobileCards().find(mobileCard => mobileCard.dataset.levelName === levelName)
    if (card) removeMobileLevelAssociation(card)
}

async function saveOrder() {
    if (!loadedLevelOrderJSON || saveButton.disabled) return

    const mobileLevels = getCurrentMobileLevels()
    const nextLevelOrderJSON = {
        ...loadedLevelOrderJSON,
        levelOrder: getCurrentOrder(),
        mobileLevels,
        NotUsed: getCurrentUnused()
    }

    try {
        saveButton.disabled = true
        const result = await overwriteLevelOrderFile(nextLevelOrderJSON)
        loadedLevelOrderJSON = nextLevelOrderJSON
        savedLevelOrder = [...nextLevelOrderJSON.levelOrder]
        savedNotUsed = [...nextLevelOrderJSON.NotUsed]
        savedMobileLevels = { ...nextLevelOrderJSON.mobileLevels }
        syncStatus()
        syncActionButtons()
        dialog('Level order saved:', `Overwrote ${result.path ?? 'resources/levelOrder.json'}.`)
    } catch (err) {
        syncActionButtons()
        dialog('There was an error saving level order:', err.message)
    }
}

function editSelectedLevel() {
    if (!selectedCard) return

    window.location.href = `editor.html?level=${encodeURIComponent(selectedCard.dataset.levelName)}`
}

async function renderPreview(name, canvas) {
    const context = canvas.getContext('2d')
    drawPreviewMessage(context, 'Loading')

    try {
        const response = await fetch(`resources/levels/${name}.json`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Failed to load ${name}: ${response.status}`)

        const levelJSON = await response.json()
        const level = await LevelCreator.loadLevelFromJSON(levelJSON, name)
        drawLevelPreview(canvas, level, levelJSON)
    } catch (err) {
        drawPreviewMessage(context, 'Missing')
        canvas.classList.add('has-preview-error')
        canvas.closest('.order-level-card, .order-mobile-card')?.classList.add('has-preview-error')
        console.error(err)
    }
}

function drawPreviewMessage(context, text) {
    context.clearRect(0, 0, previewWidth, previewHeight)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, previewWidth, previewHeight)
    context.fillStyle = '#5d6b7a'
    context.font = '16px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, previewWidth / 2, previewHeight / 2)
}

function drawLevelPreview(canvas, level, levelJSON) {
    const context = canvas.getContext('2d')
    const scale = Math.min(canvas.width / levelWidth, canvas.height / levelHeight)
    const scaledWidth = levelWidth * scale
    const scaledHeight = levelHeight * scale
    const offsetX = (canvas.width - scaledWidth) / 2
    const offsetY = (canvas.height - scaledHeight) / 2
    const previousDebug = globalThis.debug

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.save()
    try {
        context.translate(offsetX, offsetY)
        context.scale(scale, scale)
        context.fillStyle = '#fbfcfe'
        context.fillRect(0, 0, levelWidth, levelHeight)

        try {
            globalThis.debug = false
            level.draw(context)
            drawSpawnMarker(context, levelJSON.spawn, Color.getColor(levelJSON.color))
        } finally {
            globalThis.debug = previousDebug
        }
    } finally {
        context.restore()
    }
}

function drawSpawnMarker(context, spawn, color) {
    if (!spawn || !color) return

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
