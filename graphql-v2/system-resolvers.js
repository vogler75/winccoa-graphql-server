// System type resolvers

const { parseDataPointName, getSystemInfo } = require('./helpers')
const { convertAlertTimes } = require('../graphql-v1/alerting')

function createSystemResolvers(winccoa, logger) {
  return {
    async dp(system, { name }) {
      const fullName = system.isLocal ? name : `${system.name}:${name}`
      const parsed = parseDataPointName(fullName)
      return {
        name: parsed.dpName,
        fullName,
        system
      }
    },

    async dps(system, { pattern, type, limit, offset }) {
      try {
        const names = await winccoa.dpNames(pattern || '*', type)

        // Apply pagination
        const start = offset || 0
        const end = limit ? start + limit : names.length
        const paginatedNames = names.slice(start, end)

        return paginatedNames.map(name => {
          const parsed = parseDataPointName(name)
          return {
            name: parsed.dpName,
            fullName: name,
            system
          }
        })
      } catch (error) {
        logger.error('System.dataPoints error:', error)
        return []
      }
    },

    async dpType(system, { name }) {
      try {
        const types = await winccoa.dpTypes(name)
        if (!types || types.length === 0) return null

        return {
          name: types[0],
          system
        }
      } catch (error) {
        logger.error('System.dpType error:', error)
        return null
      }
    },

    async dpTypes(system, { pattern, includeEmpty }) {
      try {
        const types = await winccoa.dpTypes(pattern)
        return types.map(name => ({
          name,
          system
        }))
      } catch (error) {
        logger.error('System.dataPointTypes error:', error)
        return []
      }
    },

    async alerts(system, { startTime, endTime, lastMinutes, dataPoint, limit, offset }) {
      try {
        const names = dataPoint ? [dataPoint] : []

        // Calculate time range
        let rangeStart, rangeEnd
        if (lastMinutes) {
          rangeEnd = new Date()
          rangeStart = new Date(rangeEnd.getTime() - lastMinutes * 60 * 1000)
        } else if (startTime && endTime) {
          rangeStart = new Date(startTime)
          rangeEnd = new Date(endTime)
        } else {
          throw new Error('Either provide (startTime and endTime) or lastMinutes')
        }

        const result = await winccoa.alertGetPeriod(
          rangeStart,
          rangeEnd,
          names
        )

        const alertTimes = convertAlertTimes(result.alertTimes)

        // Build alert objects
        const alerts = alertTimes.map((at, index) => ({
          time: at.time,
          count: at.count,
          dpeName: at.dpe,
          values: result.values[index] || {},
          system
        }))

        // Apply pagination
        const start = offset || 0
        const end = limit ? start + limit : alerts.length
        return alerts.slice(start, end)
      } catch (error) {
        logger.error('System.alerts error:', error)
        return []
      }
    },

    cns(system) {
      return { system }
    },

    version(system) {
      return winccoa.getVersionInfo()
    },

    redundancy(system) {
      try {
        return {
          isConfigured: winccoa.isRedundant(),
          isActive: winccoa.isReduActive()
        }
      } catch (error) {
        logger.error('System.redundancy error:', error)
        return {
          isConfigured: false,
          isActive: false
        }
      }
    }
  }
}

module.exports = { createSystemResolvers }
