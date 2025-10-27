// Extra GraphQL resolver functions for additional WinCC OA functionality

function createExtrasResolvers(winccoa, logger) {
  return {
    Mutation: {
      async dummyExtrasMutation(_, args) {
        try {
          logger.info('dummyExtrasMutation called with args:', args);
          return {
            success: true,
            message: 'Dummy extras mutation executed successfully'
          };
        } catch (error) {
          logger.error('dummyExtrasMutation error:', error);
          throw new Error(`Dummy extras mutation failed: ${error.message}`);
        }
      }
    }
  };
}

module.exports = {
  createExtrasResolvers
};