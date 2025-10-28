// Alert GraphQL resolver functions for WinCC OA

const { WinccoaAlertTime } = require('winccoa-manager');

/**
 * Converts GraphQL AlertTimeInput to WinccoaAlertTime object.
 * Used as input converter for alertGet(), alertSet(), and related WinCC OA functions.
 * @param {object} alertTimeInput - Alert time input with time, count, and dpe properties
 * @returns {WinccoaAlertTime} WinCC OA alert time object
 */
function convertAlertTimeInput(alertTimeInput) {
  return new WinccoaAlertTime(
    new Date(alertTimeInput.time),
    alertTimeInput.count,
    alertTimeInput.dpe
  );
}

/**
 * Converts single or array of AlertTimeInput objects.
 * @param {object|Array<object>} alertTimeInputs - Single or array of alert time inputs
 * @returns {WinccoaAlertTime|Array<WinccoaAlertTime>} Converted alert time object(s)
 */
function convertAlertTimeInputs(alertTimeInputs) {
  if (Array.isArray(alertTimeInputs)) {
    return alertTimeInputs.map(convertAlertTimeInput);
  }
  return convertAlertTimeInput(alertTimeInputs);
}

/**
 * Converts WinccoaAlertTime object to GraphQL output format.
 * @param {WinccoaAlertTime} alertTime - WinCC OA alert time object
 * @returns {object} Alert time object with time (ISO string), count, and dpe
 */
function convertAlertTime(alertTime) {
  return {
    time: alertTime.time.toISOString(),
    count: alertTime.count,
    dpe: alertTime.dpe
  };
}

/**
 * Converts single or array of WinccoaAlertTime objects to output format.
 * @param {WinccoaAlertTime|Array<WinccoaAlertTime>} alertTimes - Single or array of alert times
 * @returns {Array<object>} Array of converted alert time objects
 */
function convertAlertTimes(alertTimes) {
  if (Array.isArray(alertTimes)) {
    return alertTimes.map(convertAlertTime);
  }
  return [convertAlertTime(alertTimes)];
}

/**
 * Creates resolver functions for WinCC OA alert operations.
 * Wraps WinCC OA alert management functions through the winccoa-manager Node.js binding.
 *
 * @param {WinccoaManager} winccoa - WinCC OA manager instance for API access
 * @param {object} logger - Logger instance for error reporting
 * @returns {object} Resolver object with Query and Mutation resolvers
 */
function createAlertResolvers(winccoa, logger) {
  return {
    Query: {
      /**
       * Retrieves alert attributes.
       * Wraps WinCC OA function: alertGet(alertsTime, dpeNames, alertCount)
       *
       * @param {Array<object>} alertsTime - Array of alert time objects
       * @param {Array<string>} dpeNames - Array of data point element names
       * @param {number} alertCount - Number of alerts to retrieve
       * @returns {Promise} Promise resolving to alert data
       */
      async alertGet(_, { alertsTime, dpeNames, alertCount }) {
        try {
          const winccoaAlertTimes = convertAlertTimeInputs(alertsTime);
          const result = await winccoa.alertGet(winccoaAlertTimes, dpeNames, alertCount);
          return result;
        } catch (error) {
          logger.error('alertGet error:', error);
          throw new Error(`Failed to get alert attributes: ${error.message}`);
        }
      },

      /**
       * Retrieves alert data for a time period.
       * Wraps WinCC OA function: alertGetPeriod(startTime, endTime, names)
       *
       * @param {string} startTime - Start time as ISO string
       * @param {string} endTime - End time as ISO string
       * @param {Array<string>} names - Alert names
       * @returns {Promise<object>} Promise resolving to alert period data with alertTimes and values
       */
      async alertGetPeriod(_, { startTime, endTime, names }) {
        try {
          const start = new Date(startTime);
          const end = new Date(endTime);
          const result = await winccoa.alertGetPeriod(start, end, names);
          
          return {
            alertTimes: convertAlertTimes(result.alertTimes),
            values: result.values
          };
        } catch (error) {
          logger.error('alertGetPeriod error:', error);
          throw new Error(`Failed to get alert period data: ${error.message}`);
        }
      }
    },

    Mutation: {
      /**
       * Sets alert attributes immediately.
       * Wraps WinCC OA function: alertSet(alerts, values)
       *
       * @param {Array<object>} alerts - Array of alert objects
       * @param {Array} values - Values to set for the alerts
       * @returns {Promise} Promise resolving to result of alert set operation
       */
      async alertSet(_, { alerts, values }) {
        try {
          const winccoaAlertTimes = convertAlertTimeInputs(alerts);
          const result = await winccoa.alertSet(winccoaAlertTimes, values);
          return result;
        } catch (error) {
          logger.error('alertSet error:', error);
          throw new Error(`Failed to set alert attributes: ${error.message}`);
        }
      },

      /**
       * Sets alert attributes and waits for confirmation.
       * Wraps WinCC OA function: alertSetWait(alerts, values)
       *
       * @param {Array<object>} alerts - Array of alert objects
       * @param {Array} values - Values to set for the alerts
       * @returns {Promise} Promise resolving to result of alert set operation
       */
      async alertSetWait(_, { alerts, values }) {
        try {
          const winccoaAlertTimes = convertAlertTimeInputs(alerts);
          const result = await winccoa.alertSetWait(winccoaAlertTimes, values);
          return result;
        } catch (error) {
          logger.error('alertSetWait error:', error);
          throw new Error(`Failed to set alert attributes with wait: ${error.message}`);
        }
      },

      /**
       * Sets alert attributes at a specific future time.
       * Wraps WinCC OA function: alertSetTimed(time, alerts, values)
       *
       * @param {string} time - Future time as ISO string
       * @param {Array<object>} alerts - Array of alert objects
       * @param {Array} values - Values to set for the alerts
       * @returns {Promise} Promise resolving to result of timed alert set operation
       */
      async alertSetTimed(_, { time, alerts, values }) {
        try {
          const winccoaTime = new Date(time);
          const winccoaAlertTimes = convertAlertTimeInputs(alerts);
          const result = await winccoa.alertSetTimed(winccoaTime, winccoaAlertTimes, values);
          return result;
        } catch (error) {
          logger.error('alertSetTimed error:', error);
          throw new Error(`Failed to set timed alert attributes: ${error.message}`);
        }
      },

      /**
       * Sets alert attributes at a specific future time and waits for confirmation.
       * Wraps WinCC OA function: alertSetTimedWait(time, alerts, values)
       *
       * @param {string} time - Future time as ISO string
       * @param {Array<object>} alerts - Array of alert objects
       * @param {Array} values - Values to set for the alerts
       * @returns {Promise} Promise resolving to result of timed alert set operation
       */
      async alertSetTimedWait(_, { time, alerts, values }) {
        try {
          const winccoaTime = new Date(time);
          const winccoaAlertTimes = convertAlertTimeInputs(alerts);
          const result = await winccoa.alertSetTimedWait(winccoaTime, winccoaAlertTimes, values);
          return result;
        } catch (error) {
          logger.error('alertSetTimedWait error:', error);
          throw new Error(`Failed to set timed alert attributes with wait: ${error.message}`);
        }
      }
    }
  };
}

module.exports = {
  createAlertResolvers,
  convertAlertTimeInput,
  convertAlertTimeInputs,
  convertAlertTime,
  convertAlertTimes
};