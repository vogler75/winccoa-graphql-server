// Usage Tracker Module
// Tracks GraphQL and REST API function calls

const fs = require('fs')
const path = require('path')

const USAGE_FILE = path.join(__dirname, 'usage-stats.json')
const SAVE_INTERVAL_MS = 10000 // Save every 10 seconds

class UsageTracker {
  constructor(logger) {
    this.logger = logger
    this.stats = new Map()
    this.saveTimer = null

    // Load existing stats from file
    this.loadStats()

    // Start periodic saving
    this.startPeriodicSave()
  }

  // Load stats from file
  loadStats() {
    try {
      if (fs.existsSync(USAGE_FILE)) {
        const data = fs.readFileSync(USAGE_FILE, 'utf8')
        const parsed = JSON.parse(data)

        // Convert object to Map
        for (const [key, value] of Object.entries(parsed)) {
          this.stats.set(key, value)
        }

        this.logger.info(`📊 Loaded ${this.stats.size} usage statistics from file`)
      } else {
        this.logger.info('📊 No existing usage statistics file found, starting fresh')
      }
    } catch (error) {
      this.logger.error('Failed to load usage statistics:', error.message)
    }
  }

  // Save stats to file
  saveStats() {
    try {
      // Convert Map to object for JSON serialization
      const statsObject = {}
      for (const [key, value] of this.stats.entries()) {
        statsObject[key] = value
      }

      fs.writeFileSync(USAGE_FILE, JSON.stringify(statsObject, null, 2), 'utf8')
      this.logger.debug(`💾 Saved ${this.stats.size} usage statistics to file`)
    } catch (error) {
      this.logger.error('Failed to save usage statistics:', error.message)
    }
  }

  // Start periodic saving
  startPeriodicSave() {
    this.saveTimer = setInterval(() => {
      this.saveStats()
    }, SAVE_INTERVAL_MS)
  }

  // Stop periodic saving
  stopPeriodicSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
  }

  // Track a function call
  track(type, name) {
    const key = `${type}/${name}`
    const current = this.stats.get(key) || 0
    this.stats.set(key, current + 1)
  }

  // Get all stats
  getStats() {
    const result = []

    for (const [key, count] of this.stats.entries()) {
      result.push({ name: key, count })
    }

    return result
  }

  // Get stats sorted by name
  getStatsSortedByName() {
    return this.getStats().sort((a, b) => a.name.localeCompare(b.name))
  }

  // Get stats sorted by count
  getStatsSortedByCount() {
    return this.getStats().sort((a, b) => b.count - a.count)
  }

  // Shutdown - save stats and stop timer
  shutdown() {
    this.stopPeriodicSave()
    this.saveStats()
    this.logger.info('📊 Usage tracker shutdown complete')
  }
}

module.exports = { UsageTracker }
