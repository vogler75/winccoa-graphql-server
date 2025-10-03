// Common GraphQL resolver functions for WinCC OA

// Element type mapping from WinCC OA numeric values to GraphQL enum
const ElementTypeMap = {
  0: 'BOOL',
  1: 'UINT8',
  2: 'INT32',
  3: 'INT64',
  4: 'FLOAT',
  5: 'DOUBLE',
  6: 'BIT',
  7: 'BIT32',
  8: 'BIT64',
  9: 'STRING',
  10: 'TIME',
  11: 'DPID',
  12: 'LANGSTRING',
  13: 'BLOB',
  14: 'MIXED',
  15: 'DYN_BOOL',
  16: 'DYN_UINT8',
  17: 'DYN_INT32',
  18: 'DYN_INT64',
  19: 'DYN_FLOAT',
  20: 'DYN_DOUBLE',
  21: 'DYN_BIT',
  22: 'DYN_BIT32',
  23: 'DYN_BIT64',
  24: 'DYN_STRING',
  25: 'DYN_TIME',
  26: 'DYN_DPID',
  27: 'DYN_LANGSTRING',
  28: 'DYN_BLOB'
};

// WinCC OA Control type mapping with correct IDs from WinccoaCtrlType documentation
const CtrlTypeMap = {
  196608: 'TIME_VAR',
  262144: 'BOOL_VAR',
  327680: 'INT_VAR',
  393216: 'UINT_VAR',
  458752: 'FLOAT_VAR',
  524288: 'STRING_VAR',
  589824: 'BIT32_VAR',
  655360: 'CHAR_VAR',
  851968: 'DYN_TIME_VAR',
  917504: 'DYN_BOOL_VAR',
  983040: 'DYN_INT_VAR',
  1048576: 'DYN_UINT_VAR',
  1114112: 'DYN_FLOAT_VAR',
  1179648: 'DYN_STRING_VAR',
  1245184: 'DYN_BIT32_VAR',
  1310720: 'DYN_CHAR_VAR',
  1703936: 'DYN_DYN_TIME_VAR',
  1769472: 'DYN_DYN_BOOL_VAR',
  1835008: 'DYN_DYN_INT_VAR',
  1900544: 'DYN_DYN_UINT_VAR',
  1966080: 'DYN_DYN_FLOAT_VAR',
  2031616: 'DYN_DYN_STRING_VAR',
  2097152: 'DYN_DYN_BIT32_VAR',
  2162688: 'DYN_DYN_CHAR_VAR',
  2424832: 'ATIME_VAR',
  2490368: 'DYN_ATIME_VAR',
  2555904: 'DYN_DYN_ATIME_VAR',
  2621440: 'LANGSTRING_VAR',
  2686976: 'DYN_LANGSTRING_VAR',
  2752512: 'DYN_DYN_LANGSTRING_VAR',
  3014656: 'BLOB_VAR',
  4587520: 'LONG_VAR',
  4653056: 'DYN_LONG_VAR',
  4718592: 'DYN_DYN_LONG_VAR',
  4784128: 'ULONG_VAR',
  4849664: 'DYN_ULONG_VAR',
  4915200: 'DYN_DYN_ULONG_VAR',
  4980736: 'BIT64_VAR',
  5046272: 'DYN_BIT64_VAR',
  5111808: 'DYN_DYN_BIT64_VAR'
};

function createCommonResolvers(winccoa, logger) {
  return {
    Query: {
      async dpGet(_, { dpeNames }) {
        try {
          const result = await winccoa.dpGet(dpeNames);
          return result;
        } catch (error) {
          logger.error('dpGet error:', error);
          throw new Error(`Failed to get data points: ${error.message}`);
        }
      },
      
      async dpNames(_, { dpPattern, dpType, ignoreCase = false }) {
        try {
          const result = await winccoa.dpNames(dpPattern, dpType);
          return result;
        } catch (error) {
          logger.error('dpNames error:', error);
          throw new Error(`Failed to get data point names: ${error.message}`);
        }
      },
      
      async dpTypes(_, { pattern, systemId, includeEmpty = true }) {
        try {
          const result = await winccoa.dpTypes(pattern, systemId);
          return result;
        } catch (error) {
          logger.error('dpTypes error:', error);
          throw new Error(`Failed to get data point types: ${error.message}`);
        }
      },
      
      async dpGetMaxAge(_, { age, dpeNames }) {
        try {
          const result = await winccoa.dpGetMaxAge(age, dpeNames);
          return result;
        } catch (error) {
          logger.error('dpGetMaxAge error:', error);
          throw new Error(`Failed to get data points with max age: ${error.message}`);
        }
      },
      
      async dpElementType(_, { dpeName }) {
        try {
          const result = await winccoa.dpElementType(dpeName);
          const enumValue = ElementTypeMap[result];
          if (enumValue === undefined) {
            logger.warn(`Unknown element type value: ${result} for ${dpeName}`);
            throw new Error(`Unknown element type value: ${result}`);
          }
          return enumValue;
        } catch (error) {
          logger.error('dpElementType error:', error);
          throw new Error(`Failed to get element type: ${error.message}`);
        }
      },
      
      async dpAttributeType(_, { dpAttributeName }) {
        try {
          const result = await winccoa.dpAttributeType(dpAttributeName);
          const ctrlType = CtrlTypeMap[result];
          if (ctrlType === undefined) {
            logger.warn(`Unknown control type value: ${result} for ${dpAttributeName}`);
            throw new Error(`Unknown control type value: ${result}`);
          }
          return ctrlType;
        } catch (error) {
          logger.error('dpAttributeType error:', error);
          throw new Error(`Failed to get attribute type: ${error.message}`);
        }
      },
      
      async dpTypeName(_, { dp }) {
        try {
          const result = await winccoa.dpTypeName(dp);
          return result;
        } catch (error) {
          logger.error('dpTypeName error:', error);
          throw new Error(`Failed to get type name: ${error.message}`);
        }
      },
      
      async dpTypeRefName(_, { dpe }) {
        try {
          const result = await winccoa.dpTypeRefName(dpe);
          return result || '';
        } catch (error) {
          logger.error('dpTypeRefName error:', error);
          throw new Error(`Failed to get type reference name: ${error.message}`);
        }
      },
      
      async dpExists(_, { dpeName }) {
        try {
          const result = await winccoa.dpExists(dpeName);
          return result;
        } catch (error) {
          logger.error('dpExists error:', error);
          throw new Error(`Failed to check if data point exists: ${error.message}`);
        }
      },
      
      async dpGetPeriod(_, { startTime, endTime, dpeNames }) {
        try {
          const result = await winccoa.dpGetPeriod(new Date(startTime), new Date(endTime), dpeNames);
          return result;
        } catch (error) {
          logger.error('dpGetPeriod error:', error);
          throw new Error(`Failed to get historic data point values: ${error.message}`);
        }
      },

      // Manager and System Information Functions
      isReduActive() {
        try {
          const result = winccoa.isReduActive();
          return result;
        } catch (error) {
          logger.error('isReduActive error:', error);
          throw new Error(`Failed to check redundancy active status: ${error.message}`);
        }
      },

      isRedundant() {
        try {
          const result = winccoa.isRedundant();
          return result;
        } catch (error) {
          logger.error('isRedundant error:', error);
          throw new Error(`Failed to check redundancy configuration: ${error.message}`);
        }
      },

      getSystemId(_, { systemName }) {
        try {
          const result = winccoa.getSystemId(systemName);
          return result;
        } catch (error) {
          logger.error('getSystemId error:', error);
          throw new Error(`Failed to get system ID: ${error.message}`);
        }
      },

      getSystemName(_, { systemId }) {
        try {
          const result = winccoa.getSystemName(systemId);
          return result;
        } catch (error) {
          logger.error('getSystemName error:', error);
          throw new Error(`Failed to get system name: ${error.message}`);
        }
      },

       getVersionInfo() {
         try {
           const result = winccoa.getVersionInfo();
           return result;
         } catch (error) {
           logger.error('getVersionInfo error:', error);
           throw new Error(`Failed to get version information: ${error.message}`);
         }
       },

       async tagGet(_, { dpeNames }) {
         try {
           const results = [];

           for (const dpeName of dpeNames) {
             // Construct the attribute names for value, timestamp, and status
             const valueAttr = `${dpeName}:_online.._value`;
             const timeAttr = `${dpeName}:_online.._stime`;
             const statusAttr = `${dpeName}:_online.._status`;

             // Get all three attributes in a single dpGet call
             const [value, timestamp, status] = await winccoa.dpGet([valueAttr, timeAttr, statusAttr]);

             results.push({
               name: dpeName,
               value: value,
               timestamp: timestamp,
               status: status
             });
           }

           return results;
         } catch (error) {
           logger.error('tagGet error:', error);
           throw new Error(`Failed to get typed tags: ${error.message}`);
         }
       },

       async tagGetHistory(_, { startTime, endTime, dpeNames }) {
         try {
           logger.debug(`Getting bulk history for tags ${dpeNames.join(', ')} from ${startTime} to ${endTime}`);

           const result = await winccoa.dpGetPeriod(new Date(startTime), new Date(endTime), dpeNames);

           logger.debug('tagGetHistory dpGetPeriod result:', JSON.stringify(result, null, 2));

           // Transform the result into TagHistory format
           const historyResults = [];

           for (const dpeName of dpeNames) {
             const tagValues = [];

             // Handle different possible return formats from dpGetPeriod
             if (result) {
               if (Array.isArray(result)) {
                 // Result is an array of entries
                 logger.debug(`Result is an array with ${result.length} entries`);

                 for (const entry of result) {
                   // Check if this entry belongs to our dpeName
                   if (entry.dpe === dpeName || entry.name === dpeName) {
                     if (entry.timestamp && entry.value !== undefined) {
                       tagValues.push({
                         timestamp: new Date(entry.timestamp),
                         value: entry.value,
                         status: entry.status || null
                       });
                     }
                   }
                 }
               } else if (typeof result === 'object' && result[dpeName]) {
                 // Format: { dpeName: data }
                 const dpeData = result[dpeName];
                 logger.debug(`Found data for ${dpeName}:`, dpeData);

                 if (Array.isArray(dpeData)) {
                   for (const entry of dpeData) {
                     if (entry.timestamp && entry.value !== undefined) {
                       tagValues.push({
                         timestamp: new Date(entry.timestamp),
                         value: entry.value,
                         status: entry.status || null
                       });
                     }
                   }
                 } else if (typeof dpeData === 'object') {
                   // Object with timestamp keys
                   for (const [timestamp, valueData] of Object.entries(dpeData)) {
                     tagValues.push({
                       timestamp: new Date(parseInt(timestamp)),
                       value: valueData.value || valueData,
                       status: valueData.status || null
                     });
                   }
                 }
               } else {
                 logger.warn(`No data found for ${dpeName} in result:`, result);
               }
             } else {
               logger.warn(`No result returned from dpGetPeriod for bulk query`);
             }

             logger.debug(`Found ${tagValues.length} historical values for ${dpeName}`);

             historyResults.push({
               name: dpeName,
               values: tagValues
             });
           }

           return historyResults;
         } catch (error) {
           logger.error('tagGetHistory error:', error);
           throw new Error(`Failed to get tag history: ${error.message}`);
         }
       }
     },
    
    Mutation: {
      async dpCreate(_, { dpeName, dpType, systemId, dpId }) {
        try {
          const result = await winccoa.dpCreate(dpeName, dpType, systemId, dpId);
          return result;
        } catch (error) {
          logger.error('dpCreate error:', error);
          throw new Error(`Failed to create data point: ${error.message}`);
        }
      },
      
      async dpDelete(_, { dpName }) {
        try {
          const result = await winccoa.dpDelete(dpName);
          return result;
        } catch (error) {
          logger.error('dpDelete error:', error);
          throw new Error(`Failed to delete data point: ${error.message}`);
        }
      },
      
      async dpCopy(_, { source, destination, driver = 1 }) {
        try {
          const result = await winccoa.dpCopy(source, destination, driver);
          return result;
        } catch (error) {
          logger.error('dpCopy error:', error);
          throw new Error(`Failed to copy data point: ${error.message}`);
        }
      },
      
      async dpSet(_, { dpeNames, values }) {
        try {
          const result = await winccoa.dpSet(dpeNames, values);
          return result;
        } catch (error) {
          logger.error('dpSet error:', error);
          throw new Error(`Failed to set data point values: ${error.message}`);
        }
      },
      
      async dpSetWait(_, { dpeNames, values }) {
        try {
          const result = await winccoa.dpSetWait(dpeNames, values);
          return result;
        } catch (error) {
          logger.error('dpSetWait error:', error);
          throw new Error(`Failed to set data point values with wait: ${error.message}`);
        }
      },
      
      async dpSetTimed(_, { time, dpeNames, values }) {
        try {
          const result = await winccoa.dpSetTimed(time, dpeNames, values);
          return result;
        } catch (error) {
          logger.error('dpSetTimed error:', error);
          throw new Error(`Failed to set timed data point values: ${error.message}`);
        }
      },
      
      async dpSetTimedWait(_, { time, dpeNames, values }) {
        try {
          const result = await winccoa.dpSetTimedWait(time, dpeNames, values);
          return result;
        } catch (error) {
          logger.error('dpSetTimedWait error:', error);
          throw new Error(`Failed to set timed data point values with wait: ${error.message}`);
        }
       }
     },

     Tag: {
       async history(tag, { startTime, endTime }) {
         try {
           logger.debug(`Getting history for tag ${tag.name} from ${startTime} to ${endTime}`);

           // Get historical data for this specific tag
           const result = await winccoa.dpGetPeriod(new Date(startTime), new Date(endTime), [tag.name]);

           logger.debug(`dpGetPeriod result for ${tag.name}:`, JSON.stringify(result, null, 2));

           const tagValues = [];

           // Handle different possible return formats from dpGetPeriod
           if (result) {
             // Check if result is an array (common format for historical data)
             if (Array.isArray(result)) {
               logger.debug(`Result is an array with ${result.length} entries`);

               for (const entry of result) {
                 // Try different possible formats
                 if (entry.timestamp && entry.value !== undefined) {
                   // Format: { timestamp, value, status? }
                   tagValues.push({
                     timestamp: new Date(entry.timestamp),
                     value: entry.value,
                     status: entry.status || null
                   });
                 } else if (typeof entry === 'object' && entry !== null) {
                   // Try to extract from object keys
                   const timestamp = entry.time || entry.timestamp || entry.ts;
                   const value = entry.value || entry.val || entry.data;
                   const status = entry.status || entry.stat || null;

                   if (timestamp && value !== undefined) {
                     tagValues.push({
                       timestamp: new Date(timestamp),
                       value: value,
                       status: status
                     });
                   }
                 }
               }
             } else if (typeof result === 'object' && result[tag.name]) {
               // Format: { dpeName: data }
               const dpeData = result[tag.name];
               logger.debug(`Found data for ${tag.name}:`, dpeData);

               if (Array.isArray(dpeData)) {
                 for (const entry of dpeData) {
                   if (entry.timestamp && entry.value !== undefined) {
                     tagValues.push({
                       timestamp: new Date(entry.timestamp),
                       value: entry.value,
                       status: entry.status || null
                     });
                   }
                 }
               } else if (typeof dpeData === 'object') {
                 // Object with timestamp keys
                 for (const [timestamp, valueData] of Object.entries(dpeData)) {
                   tagValues.push({
                     timestamp: new Date(parseInt(timestamp)),
                     value: valueData.value || valueData,
                     status: valueData.status || null
                   });
                 }
               }
             } else {
               logger.warn(`Unexpected result format for ${tag.name}:`, result);
             }
           } else {
             logger.warn(`No result returned from dpGetPeriod for ${tag.name}`);
           }

           logger.debug(`Returning ${tagValues.length} historical values for ${tag.name}`);

           return {
             name: tag.name,
             values: tagValues
           };
         } catch (error) {
           logger.error('Tag.history error:', error);
           // Return empty history instead of throwing to avoid null errors
           logger.warn(`Returning empty history for ${tag.name} due to error: ${error.message}`);
           return {
             name: tag.name,
             values: []
           };
         }
       }
     }
   };
 }

module.exports = {
  ElementTypeMap,
  CtrlTypeMap,
  createCommonResolvers
};