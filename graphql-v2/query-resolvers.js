// Top-level Query resolvers

const { parseDataPointName, getSystemInfo } = require('./helpers')

function createQueryResolvers(winccoa, logger, existingResolvers) {
  return {
    // System queries
    async system(_, { name }) {
      return getSystemInfo(winccoa, name)
    },

    async systems() {
      // For now, return just local system
      // In future, could enumerate distributed systems
      const local = await getSystemInfo(winccoa)
      return [local]
    },

    // Direct data point access (convenience)
    async dataPoint(_, { name }) {
      const parsed = parseDataPointName(name)
      return {
        name: parsed.dpName,
        fullName: name
      }
    },

    async dataPoints(_, { pattern, type, limit, offset }) {
      try {
        const names = await winccoa.dpNames(pattern || '*', type)

        // Apply pagination
        const start = offset || 0
        const end = limit ? start + limit : names.length
        const paginatedNames = names.slice(start, end)

        // Build data point objects
        const dataPoints = []
        for (const name of paginatedNames) {
          const parsed = parseDataPointName(name)
          const system = await getSystemInfo(winccoa, parsed.systemName)
          const typeName = await winccoa.dpTypeName(parsed.dpName)

          dataPoints.push({
            name: parsed.dpName,
            fullName: name,
            system,
            typeName
          })
        }

        return dataPoints
      } catch (error) {
        logger.error('dataPoints error:', error)
        throw new Error(`Failed to get data points: ${error.message}`)
      }
    },

    // Tag queries (convenience)
    async tag(_, { name }) {
      try {
        const tags = await existingResolvers.Query.tagGet(null, { dpeNames: [name] })
        if (!tags || tags.length === 0) return null
        return tags[0]
      } catch (error) {
        logger.error('tag error:', error)
        return null
      }
    },

    async tags(_, { names }) {
      return existingResolvers.Query.tagGet(null, { dpeNames: names })
    },

    // Methods - delegate to existing resolvers
    methods() {
      return {} // The Methods type resolvers will handle the rest
    },

    // Version info
    version() {
      const versionInfo = winccoa.getVersionInfo()
      return {
        api: { version: 2 },
        winccoa: versionInfo
      }
    }
  }
}

module.exports = { createQueryResolvers }
