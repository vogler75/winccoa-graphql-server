// Tag type resolvers

const { getSystemInfo } = require('./helpers')

function createTagResolvers(winccoa, logger, existingResolvers) {
  return {
    // Re-use existing Tag resolver from v1
    ...existingResolvers.Tag,

    async element(tag) {
      return {
        name: tag.name,
        path: '',
        dataPoint: {
          name: tag.name,
          fullName: tag.name,
          system: await getSystemInfo(winccoa),
          typeName: null
        },
        value: tag.value
      }
    }
  }
}

module.exports = { createTagResolvers }
