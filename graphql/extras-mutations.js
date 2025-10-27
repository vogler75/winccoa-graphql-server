// Extra mutation resolvers
// Customers can add their own mutation functions here

function createExtrasMutationResolvers(winccoa, logger) {
  return {
    async testDummy() {
      try {
        logger.info('testDummy mutation called')
        return {
          success: true,
          message: 'Test dummy mutation executed successfully',
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        logger.error('testDummy mutation error:', error)
        throw new Error(`Test dummy mutation failed: ${error.message}`)
      }
    }
  }
}

module.exports = { createExtrasMutationResolvers }
