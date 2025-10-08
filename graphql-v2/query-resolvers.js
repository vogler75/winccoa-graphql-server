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
