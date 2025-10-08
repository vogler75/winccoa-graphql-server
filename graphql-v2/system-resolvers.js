// System type resolvers

const { parseDataPointName, getSystemInfo } = require('./helpers')
const { convertAlertTimes } = require('../graphql-v1/alerting')
const { ALERT_ATTRIBUTE_MAP } = require('./alert-resolvers')

function createSystemResolvers(winccoa, logger) {
  return {
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

    async alerts(system, { startTime, endTime, lastMinutes, dpFilter, dpFilters, limit, offset }, context, info) {
      try {
        // Collect requested alert attributes from GraphQL query
        const selections = info.fieldNodes[0].selectionSet?.selections || []
        const alertAttributes = ['_alert_hdl.._last'] // Always include _last

        for (const selection of selections) {
          const fieldName = selection.name.value

          if (fieldName === 'text') {
            alertAttributes.push(ALERT_ATTRIBUTE_MAP.TEXT)
          } else if (fieldName === 'acknowledged') {
            alertAttributes.push(ALERT_ATTRIBUTE_MAP.ACK_STATE)
          } else if (fieldName === 'acknowledgedBy') {
            alertAttributes.push(ALERT_ATTRIBUTE_MAP.ACK_STATE)
            alertAttributes.push(ALERT_ATTRIBUTE_MAP.ACK_USER)
          } else if (fieldName === 'acknowledgedAt') {
            alertAttributes.push(ALERT_ATTRIBUTE_MAP.ACK_STATE)
            alertAttributes.push(ALERT_ATTRIBUTE_MAP.ACK_TIME)
          } else if (fieldName === 'priority' || fieldName === 'severity') {
            alertAttributes.push(ALERT_ATTRIBUTE_MAP.PRIORITY)
          } else if (fieldName === 'attribute') {
            const args = selection.arguments || []
            const nameArg = args.find(arg => arg.name.value === 'name')
            if (nameArg && nameArg.value.value) {
              const attrEnum = nameArg.value.value
              if (ALERT_ATTRIBUTE_MAP[attrEnum]) {
                alertAttributes.push(ALERT_ATTRIBUTE_MAP[attrEnum])
              }
            }
          }
        }

        // Remove duplicates
        const uniqueAttributes = [...new Set(alertAttributes)]
        const attributeList = uniqueAttributes.map(attr => `'${attr}'`).join(',')

        // Build dpQuery SELECT ALERT statement
        // Priority: dpFilters > dpFilter > default "*"
        let dpPattern
        if (dpFilters && dpFilters.length > 0) {
          // Format as {name1,name2,name3}
          dpPattern = `{${dpFilters.join(',')}}`
        } else {
          dpPattern = dpFilter || '*'
        }

        let query = `SELECT ALERT ${attributeList} FROM '${dpPattern}'`

        // Add TIMERANGE clause if time range is provided
        if (lastMinutes || (startTime && endTime)) {
          let rangeStart, rangeEnd
          if (lastMinutes) {
            rangeEnd = new Date()
            rangeStart = new Date(rangeEnd.getTime() - lastMinutes * 60 * 1000)
          } else {
            rangeStart = new Date(startTime)
            rangeEnd = new Date(endTime)
          }
          query += ` TIMERANGE("${rangeStart.toISOString()}","${rangeEnd.toISOString()}",1,0)`
        }

        logger.info(`dpQuery SELECT ALERT: ${query}`)
        const result = await winccoa.dpQuery(query)

        // Parse dpQuery results into Alert objects
        // Format: [header, ...dataRows]
        // Header: ["", "", ":_alert_hdl.._last", ":_alert_hdl.._text", ...]
        // DataRow: [dpeName, lastObject, value1, value2, ...]
        const alerts = []
        if (result && Array.isArray(result) && result.length > 1) {
          const header = result[0]

          // Skip first row (header) and process data rows
          for (let i = 1; i < result.length; i++) {
            const row = result[i]
            const dpeName = row[0]
            const lastObject = row[1] // _alert_hdl.._last contains {time, count, dpe}

            // Build values object mapping attribute names to their values
            const values = {}
            // Start from column 2 (column 0 is dpeName, column 1 is _last)
            for (let col = 2; col < row.length; col++) {
              const attrName = header[col].replace(/^:/, '') // Remove leading ':'
              values[attrName] = row[col]
            }

            // Extract time and count from lastObject
            const time = lastObject && lastObject.time ? new Date(lastObject.time) : new Date()
            const count = lastObject && lastObject.count !== undefined ? lastObject.count : 0

            alerts.push({
              time,
              count,
              dpeName,
              values,
              system
            })
          }
        }

        // Apply pagination
        const start = offset || 0
        const end = limit ? start + limit : alerts.length
        return alerts.slice(start, end)
      } catch (error) {
        logger.error('System.alerts error:', error)
        throw new Error(`Failed to query alerts: ${error.message}`)
      }
    },

    cns(system) {
      return { system }
    },

    version(system) {
      return winccoa.getVersionInfo().winccoa
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
