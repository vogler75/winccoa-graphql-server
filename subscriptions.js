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
              logger.debug(`Received update for ${dpeNames.join(', ')}:`, values);
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
       },

       tagSubscribe: {
         subscribe: async (_, { dpeNames, answer = true }, context) => {
           logger.info(`Subscribing to typed tags: ${dpeNames.join(', ')}`);

           // Create a channel for this subscription
           const channel = `tagSubscribe-${uuidv4()}`;
           let connectionId = null;
           let cleanup = null;

           try {
             // Create async iterator first
             const asyncIterator = context.pubsub.asyncIterator(channel);

             // Set up the connection
             const callback = async (dpeNames, values, type, error) => {
               try {
                 // For typed connections, we need to get the complete information for each tag
                 const tags = [];

                 for (let i = 0; i < dpeNames.length; i++) {
                   const dpeName = dpeNames[i];
                   const value = values[i];

                   // Get timestamp and status for this tag
                   const timeAttr = `${dpeName}:_online.._stime`;
                   const statusAttr = `${dpeName}:_online.._status`;

                   try {
                     const [timestamp, status] = await winccoa.dpGet([timeAttr, statusAttr]);

                     tags.push({
                       name: dpeName,
                       value: value,
                       timestamp: timestamp,
                       status: status
                     });
                   } catch (attrError) {
                     logger.warn(`Failed to get attributes for ${dpeName}:`, attrError);
                     // Still include the tag with available data
                     tags.push({
                       name: dpeName,
                       value: value,
                       timestamp: null,
                       status: null
                     });
                   }
                 }

                 // Emit the update through the pubsub
                 logger.debug(`Received typed update for ${dpeNames.join(', ')}:`, tags);
                 context.pubsub.publish(channel, {
                   tagSubscribe: {
                     tags: tags,
                     type: type,
                     error: error || null
                   }
                 });
               } catch (callbackError) {
                 logger.error('tagSubscribe callback error:', callbackError);
                 context.pubsub.publish(channel, {
                   tagSubscribe: {
                     tags: [],
                     type: 'error',
                     error: callbackError.message
                   }
                 });
               }
             };

             // Create WinCC OA connection
             connectionId = await winccoa.dpConnect(callback, dpeNames, answer);
             logger.info(`Created tagSubscribe subscription ${connectionId}`);

             // Set up cleanup
             cleanup = () => {
               if (connectionId !== null) {
                 try {
                   winccoa.dpDisconnect(connectionId);
                   logger.info(`Disconnected tagSubscribe subscription ${connectionId}`);
                 } catch (error) {
                   logger.error(`Error disconnecting typed subscription ${connectionId}:`, error);
                 }
               }
             };

             // Add cleanup to iterator
             asyncIterator.cleanup = cleanup;

             return asyncIterator;
           } catch (error) {
             logger.error('tagSubscribe subscription error:', error);
             throw new Error(`Failed to create typed tag subscription: ${error.message}`);
           }
         }
       }
     }
  };
}

module.exports = {
  createSubscriptionResolvers
};