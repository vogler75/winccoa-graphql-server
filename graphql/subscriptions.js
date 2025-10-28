// Subscription GraphQL resolver functions for WinCC OA

const { v4: uuidv4 } = require('uuid');

/**
 * Creates subscription resolver functions for WinCC OA real-time data updates.
 * Wraps WinCC OA connection functions (dpConnect, dpQueryConnectSingle, dpQueryConnectAll)
 * through the winccoa-manager Node.js binding.
 *
 * @param {WinccoaManager} winccoa - WinCC OA manager instance for API access
 * @param {object} logger - Logger instance for error reporting
 * @returns {object} Resolver object with Subscription resolvers
 */
function createSubscriptionResolvers(winccoa, logger) {
  return {
    Subscription: {
      /**
       * Subscribes to real-time data point changes.
       * Wraps WinCC OA function: dpConnect(callback, dpeNames, answer)
       * and dpDisconnect(connectionId) for cleanup.
       *
       * Creates an async iterator that yields updates whenever subscribed data points change.
       *
       * @param {Array<string>} dpeNames - Array of data point element names to monitor
       * @param {boolean} [answer=true] - Whether to get immediate value and then updates
       * @yields {object} Update object with dpeNames, values, type, and error
       */
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
      
      /**
       * Subscribes to query result updates (single result at a time).
       * Wraps WinCC OA function: dpQueryConnectSingle(callback, answer, query, blockingTime)
       * and dpQueryDisconnect(connectionId) for cleanup.
       *
       * Creates an async iterator that yields query results as updates.
       * Returns only the most recent result set.
       *
       * @param {string} query - dpQuery query string
       * @param {boolean} [answer=true] - Whether to get immediate result and then updates
       * @param {number} [blockingTime] - Blocking time for query updates
       * @yields {object} Update object with values (2D result table), type, and error
       */
      dpQueryConnectSingle: {
        subscribe: async (_, { query, answer = true, blockingTime }, context) => {
          logger.info(`Subscribing to query: ${query}`);

          // Create a channel for this subscription
          const channel = `dpQueryConnectSingle-${uuidv4()}`;
          let cleanup = null;

          try {
            // Create async iterator first
            const asyncIterator = context.pubsub.asyncIterator(channel);

            // Set up the connection callback
            // WinCC OA dpQueryConnectSingle callback receives: resultTable (2D array)
            // where resultTable has headers in row 1, data starting at row 2
            const callback = (resultTable) => {
              logger.debug(`Received dpQueryConnectSingle update:`, resultTable);
              context.pubsub.publish(channel, {
                dpQueryConnectSingle: {
                  values: resultTable,
                  type: 'update',
                  error: null
                }
              });
            };

            // Create WinCC OA query connection
            // Wraps WinCC OA function: dpQueryConnectSingle(callback, answer, query, blockingTime)
            // Returns connection ID (>= 0)
            const connectionId = await winccoa.dpQueryConnectSingle(
              callback,
              answer,
              query,
              blockingTime
            );

            if (connectionId < 0) {
              throw new Error(`dpQueryConnectSingle returned error code ${connectionId}`);
            }

            logger.info(`Created dpQueryConnectSingle subscription ${connectionId} for query: ${query}`);

            // Set up cleanup
            cleanup = () => {
              try {
                winccoa.dpQueryDisconnect(connectionId);
                logger.info(`Disconnected dpQueryConnectSingle subscription ${connectionId}`);
              } catch (error) {
                logger.error(`Error disconnecting dpQueryConnectSingle ${connectionId}:`, error);
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
            logger.error('dpQueryConnectSingle subscription error:', error);
            if (cleanup) cleanup();
            throw new Error(`Failed to create query connection: ${error.message}`);
          }
        }
      },
      
      /**
       * Subscribes to query result updates (all results).
       * Wraps WinCC OA function: dpQueryConnectAll(callback, answer, query, blockingTime)
       * and dpQueryDisconnect(connectionId) for cleanup.
       *
       * Creates an async iterator that yields query results as updates.
       * Always returns the complete result set on each update.
       *
       * @param {string} query - dpQuery query string
       * @param {boolean} [answer=true] - Whether to get immediate result and then updates
       * @param {number} [blockingTime] - Blocking time for query updates
       * @yields {object} Update object with values (2D result table), type, and error
       */
      dpQueryConnectAll: {
         subscribe: async (_, { query, answer = true, blockingTime }, context) => {
           logger.info(`Subscribing to all query results: ${query}`);

           // Create a channel for this subscription
           const channel = `dpQueryConnectAll-${uuidv4()}`;
           let cleanup = null;

           try {
             // Create async iterator first
             const asyncIterator = context.pubsub.asyncIterator(channel);

             // Set up the connection callback
             // WinCC OA dpQueryConnectAll callback receives: resultTable (2D array)
             // where resultTable has headers in row 1, data starting at row 2
             // Note: dpQueryConnectAll always sends the complete result set
             const callback = (resultTable) => {
               logger.debug(`Received dpQueryConnectAll update:`, resultTable);
               context.pubsub.publish(channel, {
                 dpQueryConnectAll: {
                   values: resultTable,
                   type: 'update',
                   error: null
                 }
               });
             };

             // Create WinCC OA query connection
             // Wraps WinCC OA function: dpQueryConnectAll(callback, answer, query, blockingTime)
             // Returns connection ID (>= 0)
             const connectionId = await winccoa.dpQueryConnectAll(
               callback,
               answer,
               query,
               blockingTime
             );

             if (connectionId < 0) {
               throw new Error(`dpQueryConnectAll returned error code ${connectionId}`);
             }

             logger.info(`Created dpQueryConnectAll subscription ${connectionId} for query: ${query}`);

             // Set up cleanup
             cleanup = () => {
               try {
                 winccoa.dpQueryDisconnect(connectionId);
                 logger.info(`Disconnected dpQueryConnectAll subscription ${connectionId}`);
               } catch (error) {
                 logger.error(`Error disconnecting dpQueryConnectAll ${connectionId}:`, error);
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
             logger.error('dpQueryConnectAll subscription error:', error);
             if (cleanup) cleanup();
             throw new Error(`Failed to create query connection: ${error.message}`);
           }
         }
       },

      /**
       * Subscribes to real-time typed tag updates.
       * Wraps WinCC OA function: dpConnect(callback, dpeNames, answer)
       * and dpDisconnect(connectionId) for cleanup.
       *
       * Similar to dpConnect but returns complete tag information including timestamp and status.
       * Creates an async iterator that yields updates whenever subscribed tags change.
       *
       * @param {Array<string>} dpeNames - Array of data point element names to monitor
       * @param {boolean} [answer=true] - Whether to get immediate value and then updates
       * @yields {object} Update object with tags array, type, and error
       */
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