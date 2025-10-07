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
    async dp(_, { name }) {
      const parsed = parseDataPointName(name)
      const system = await getSystemInfo(winccoa, parsed.systemName)
      return {
        name: parsed.dpName,
        fullName: name,
        system
      }
    },

    async dps(_, { pattern, type, limit, offset }) {
      try {
        const names = await winccoa.dpNames(pattern || '*', type)

        // Apply pagination
        const start = offset || 0
        const end = limit ? start + limit : names.length
        const paginatedNames = names.slice(start, end)

        // Get system once for all data points (assuming same system)
        const localSystem = await getSystemInfo(winccoa)

        // Build data point objects
        const dataPoints = []
        for (const name of paginatedNames) {
          const parsed = parseDataPointName(name)
          const system = parsed.systemName ? await getSystemInfo(winccoa, parsed.systemName) : localSystem
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

    // API - delegate to existing resolvers
    api() {
      return {} // The API type resolvers will handle the rest
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
