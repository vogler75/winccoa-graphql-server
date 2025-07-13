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
    }
  };
}

module.exports = {
  ElementTypeMap,
  CtrlTypeMap,
  createCommonResolvers
};