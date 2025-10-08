// Top-level Query resolvers

function createQueryResolvers(winccoa, logger, existingResolvers) {
  return {
    // API - delegate to existing resolvers
    api() {
      return {} // The API type resolvers will handle the rest
    },

    // Version info
    version() {
      const versionInfo = winccoa.getVersionInfo()
      return {
        api: { version: 2 },
        winccoa: versionInfo.winccoa
      }
    }
  }
}

module.exports = { createQueryResolvers }
