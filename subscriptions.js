// Subscription GraphQL resolver functions for WinCC OA

const { v4: uuidv4 } = require('uuid');

function createSubscriptionResolvers(winccoa, logger) {
  return {
    Subscription: {
      dpConnect: {
        subscribe: async (_, { dpeNames, answer = true }, context) => {
          logger.info(`Subscribing to data points: ${dpeNames.join(', ')}`);
          
          // Create a channel for this subscription
          const channel = `dpConnect-${uuidv4()}`;
          let connectionId = null;
          let cleanup = null;
          
          try {
            // Create async iterator first
            const asyncIterator = context.pubsub.asyncIterator(channel);
            
            // Set up the connection
            const callback = (dpeNames, values, type, error) => {
              // Emit the update through the pubsub
              console.log(`Received update for ${dpeNames.join(', ')}:`, values);
              context.pubsub.publish(channel, {
                dpConnect: {
                  dpeNames,
                  values,
                  type: type,
                  error: error || null
                }
              });
            };
            
            // Create WinCC OA connection
            connectionId = await winccoa.dpConnect(callback, dpeNames, answer);
            logger.info(`Created dpConnect subscription ${connectionId}`);
            
            // Set up cleanup
            cleanup = () => {
              if (connectionId !== null) {
                try {
                  winccoa.dpDisconnect(connectionId);
                  logger.info(`Disconnected dpConnect subscription ${connectionId}`);
                } catch (error) {
                  logger.error(`Error disconnecting subscription ${connectionId}:`, error);
                }
              }
            };
            
            // Add cleanup to iterator
            const originalReturn = asyncIterator.return;
            asyncIterator.return = async () => {
              cleanup();
              if (originalReturn) {
                return originalReturn.call(asyncIterator);
              }
              return { done: true, value: undefined };
            };
            
            return asyncIterator;
            
          } catch (error) {
            logger.error('dpConnect subscription error:', error);
            if (cleanup) cleanup();
            throw new Error(`Failed to create data point connection: ${error.message}`);
          }
        }
      },
      
      dpQueryConnectSingle: {
        subscribe: async function* (_, { query, answer = true, blockingTime }, context) {
          logger.info(`Subscribing to query: ${query}`);
          
          // Implementation would be similar to dpConnect
          // This is a placeholder - actual implementation depends on WinCC OA API
          throw new Error('dpQueryConnectSingle not yet implemented');
        }
      },
      
      dpQueryConnectAll: {
        subscribe: async function* (_, { query, answer = true, blockingTime }, context) {
          logger.info(`Subscribing to all query results: ${query}`);
          
          // Implementation would be similar to dpConnect
          // This is a placeholder - actual implementation depends on WinCC OA API
          throw new Error('dpQueryConnectAll not yet implemented');
        }
      }
    }
  };
}

module.exports = {
  createSubscriptionResolvers
};