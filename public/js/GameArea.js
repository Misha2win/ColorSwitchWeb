import * as Physics from './math/PhysicsEngine.js'
import * as LevelLoader from './level/LevelCreator.js'
import Player from './entity/Player.js'

export default class GameArea {

    constructor(canvasId = 'game', levels = []) {
        this.canvasId = canvasId

        this.width = null
        this.height = null
        this.canvas = null
        this.context = null
        this.intervalId = null
        this.lastTime = 0
        this.levels = levels
        this.currentLevel = 0
        this.allowedLevels = []
    }

    start() {
        this.canvas = document.getElementById(this.canvasId)
        this.width = this.canvas.width
        this.height = this.canvas.height

        this.context = this.canvas.getContext('2d')

        this.ensureLevelsLoaded().then(() => {
            this.allowedLevels = Array(this.levels.length).fill(false)
            this.allowedLevels[0] = true
            if (!this.levels[this.currentLevel]) return

            const player = new Player(0, 0)
            const currentLevel = this.levels[this.currentLevel]
            currentLevel.setPlayer(player)
            currentLevel.respawnPlayer()

            this.lastTime = performance.now()
            if (this.intervalId) clearInterval(this.intervalId)
            this.intervalId = setInterval(() => {
                const now = performance.now()
                const delta = (now - this.lastTime) / 1000
                this.lastTime = now

                this.updateLevel(this.levels[this.currentLevel], true, delta)
            }, 0)
        })
    }

    async ensureLevelsLoaded() {
        if (!this.levels.length) {
            const levelNames = await LevelLoader.getLevelOrderLevels()
            for (const levelName of levelNames) {
                const level = await LevelLoader.loadLevel(levelName)
                level.levelManager = this
                this.levels.push(level)
            }
        }
    }

    updateLevel(level, draw, delta) {
        level.preparePhysics(delta)

        Physics.calculatePhysics(delta, level)

        level.update(delta)

        if (draw) {
            this.clear()
            level.draw(this.context)
        }

        if (level.player?.requestRestart) {
            this.restartLevel()
            level.player.requestRestart = false
        }
    }

    restartLevel() {
        const currentLevel = this.levels[this.currentLevel]
        const player = currentLevel.player
        LevelLoader.loadLevel(currentLevel.name, { forceLoad: true }).then((level) => {
            this.levels[this.currentLevel] = level
            level.levelManager = this
            level.setPlayer(player)
            level.respawnPlayer()
        })
    }

    advanceLevel(currentLevel) {
        const levelIndex = this.levels.indexOf(currentLevel)
        if (levelIndex != -1 && levelIndex < this.levels.length - 1) {
            const player = this.levels[levelIndex].player
            if (player) {
                this.levels[levelIndex].setPlayer(null)
                this.levels[levelIndex + 1].setPlayer(player)
                this.levels[levelIndex + 1].respawnPlayer()
                this.allowedLevels[levelIndex + 1] = true
                this.currentLevel++
            }
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

}
