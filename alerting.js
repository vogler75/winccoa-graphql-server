// Alert GraphQL resolver functions for WinCC OA

const { WinccoaAlertTime } = require('winccoa-manager');

function convertAlertTimeInput(alertTimeInput) {
  return new WinccoaAlertTime(
    new Date(alertTimeInput.time),
    alertTimeInput.count,
    alertTimeInput.dpe
  );
}

function convertAlertTimeInputs(alertTimeInputs) {
  if (Array.isArray(alertTimeInputs)) {
    return alertTimeInputs.map(convertAlertTimeInput);
  }
  return convertAlertTimeInput(alertTimeInputs);
}

function convertAlertTime(alertTime) {
  return {
    time: alertTime.time.toISOString(),
    count: alertTime.count,
    dpe: alertTime.dpe
  };
}

function convertAlertTimes(alertTimes) {
  if (Array.isArray(alertTimes)) {
    return alertTimes.map(convertAlertTime);
  }
  return [convertAlertTime(alertTimes)];
}

function createAlertResolvers(winccoa, logger) {
  return {
    Query: {
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