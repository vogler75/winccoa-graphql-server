// DataPoint and DataPointElement resolvers

const { parseDataPointName, getSystemInfo } = require('./helpers')
const { ElementTypeMap } = require('../graphql-v1/common')

function createDataPointResolvers(winccoa, logger) {
  return {
    DataPoint: {
      system(dataPoint) {
        return dataPoint.system
      },

      async type(dataPoint) {
        try {
          const typeName = dataPoint.typeName || await winccoa.dpTypeName(dataPoint.name)
          return {
            name: typeName,
            system: dataPoint.system
          }
        } catch (error) {
          logger.error('DataPoint.type error:', error)
          throw error
        }
      },

      async exists(dataPoint) {
        try {
          return await winccoa.dpExists(dataPoint.fullName)
        } catch (error) {
          logger.error('DataPoint.exists error:', error)
          return false
        }
      },

      async element(dataPoint, { path }) {
        try {
          const fullPath = path ? `${dataPoint.fullName}.${path}` : dataPoint.fullName
          const value = await winccoa.dpGet([fullPath])
          const elementType = await winccoa.dpElementType(fullPath)

          return {
            name: path || dataPoint.name,
            path: path || '',
            dataPoint,
            value: value[0],
            elementTypeValue: elementType
          }
        } catch (error) {
          logger.error('DataPoint.element error:', error)
          return null
        }
      },

      async elements(dataPoint, { pattern }) {
        // For now, return empty array
        // Full implementation would enumerate all elements of the DP type
        return []
      },

      async value(dataPoint) {
        try {
          const result = await winccoa.dpGet([dataPoint.fullName])
          return result[0]
        } catch (error) {
          logger.error('DataPoint.value error:', error)
          return null
        }
      },

      async tag(dataPoint) {
        try {
          // Get tag with value, timestamp, and status
          const valueAttr = `${dataPoint.fullName}:_online.._value`
          const timeAttr = `${dataPoint.fullName}:_online.._stime`
          const statusAttr = `${dataPoint.fullName}:_online.._status`

          const results = await winccoa.dpGet([valueAttr, timeAttr, statusAttr])

          return {
            name: dataPoint.fullName,
            value: results[0],
            timestamp: results[1],
            status: results[2]
          }
        } catch (error) {
          logger.error('DataPoint.tag error:', error)
          return null
        }
      },

      async tagHistory(dataPoint, { startTime, endTime, limit, offset }) {
        try {
          const result = await winccoa.dpGetPeriod(
            new Date(startTime),
            new Date(endTime),
            [dataPoint.fullName]
          )

          const values = []
          if (Array.isArray(result) && result.length > 0) {
            const entry = result[0]
            if (entry.times && entry.values) {
              const minLength = Math.min(entry.times.length, entry.values.length)
              for (let i = 0; i < minLength; i++) {
                values.push({
                  timestamp: new Date(entry.times[i]),
                  value: entry.values[i]
                })
              }
            }
          }

          const start = offset || 0
          const end = limit ? start + limit : values.length

          return {
            name: dataPoint.fullName,
            values: values.slice(start, end)
          }
        } catch (error) {
          logger.error('DataPoint.tagHistory error:', error)
          return {
            name: dataPoint.fullName,
            values: []
          }
        }
      },

      async alerts(dataPoint, { limit, offset }) {
        // Get recent alerts for this data point
        const now = new Date()
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        try {
          const { convertAlertTimes } = require('../graphql-v1/alerting')
          const result = await winccoa.alertGetPeriod(yesterday, now, [dataPoint.fullName])
          const alertTimes = convertAlertTimes(result.alertTimes)

          const alerts = alertTimes.map((at, index) => ({
            time: at.time,
            count: at.count,
            dpeName: at.dpe,
            values: result.values[index] || {},
            dataPoint
          }))

          const start = offset || 0
          const end = limit ? start + limit : alerts.length
          return alerts.slice(start, end)
        } catch (error) {
          logger.error('DataPoint.alerts error:', error)
          return []
        }
      },

      async cnsNodes(dataPoint) {
        try {
          // cnsGetNodesByData expects type and viewPath parameters
          // type: optional (default searches all types)
          // viewPath: optional (default '' searches all views)
          const paths = await winccoa.cnsGetNodesByData(dataPoint.fullName)

          if (!paths || paths.length === 0) {
            logger.debug(`No CNS nodes found for data point: ${dataPoint.fullName}`)
            return []
          }

          return paths.map(path => ({
            path,
            dpName: dataPoint.fullName,
            dataPoint
          }))
        } catch (error) {
          logger.error('DataPoint.cnsNodes error:', error)
          return []
        }
      }
    },

    DataPointElement: {
      dataPoint(element) {
        return element.dataPoint
      },

      async value(element) {
        if (element.value !== undefined) return element.value

        try {
          const fullPath = element.path
            ? `${element.dataPoint.fullName}.${element.path}`
            : element.dataPoint.fullName
          const result = await winccoa.dpGet([fullPath])
          return result[0]
        } catch (error) {
          logger.error('DataPointElement.value error:', error)
          return null
        }
      },

      async timestamp(element) {
        try {
          const fullPath = element.path
            ? `${element.dataPoint.fullName}.${element.path}`
            : element.dataPoint.fullName
          const timeAttr = `${fullPath}:_online.._stime`
          const result = await winccoa.dpGet([timeAttr])
          return result[0]
        } catch (error) {
          logger.error('DataPointElement.timestamp error:', error)
          return null
        }
      },

      async status(element) {
        try {
          const fullPath = element.path
            ? `${element.dataPoint.fullName}.${element.path}`
            : element.dataPoint.fullName
          const statusAttr = `${fullPath}:_online.._status`
          const result = await winccoa.dpGet([statusAttr])
          const statusValue = result[0]

          return {
            raw: statusValue,
            online: statusValue !== null && statusValue !== undefined,
            quality: null // TODO: Extract quality from status bits
          }
        } catch (error) {
          logger.error('DataPointElement.status error:', error)
          return {
            raw: null,
            online: false,
            quality: null
          }
        }
      },

      async elementType(element) {
        try {
          if (element.elementTypeValue !== undefined) {
            return ElementTypeMap[element.elementTypeValue] || 'MIXED'
          }

          const fullPath = element.path
            ? `${element.dataPoint.fullName}.${element.path}`
            : element.dataPoint.fullName
          const typeValue = await winccoa.dpElementType(fullPath)
          return ElementTypeMap[typeValue] || 'MIXED'
        } catch (error) {
          logger.error('DataPointElement.elementType error:', error)
          return 'MIXED'
        }
      },

      async history(element, { startTime, endTime, limit, offset }) {
        try {
          const fullPath = element.path
            ? `${element.dataPoint.fullName}.${element.path}`
            : element.dataPoint.fullName

          const result = await winccoa.dpGetPeriod(
            new Date(startTime),
            new Date(endTime),
            [fullPath]
          )

          const values = []
          if (Array.isArray(result) && result.length > 0) {
            const entry = result[0]
            if (entry.times && entry.values) {
              const minLength = Math.min(entry.times.length, entry.values.length)
              for (let i = 0; i < minLength; i++) {
                values.push({
                  timestamp: new Date(entry.times[i]),
                  value: entry.values[i],
                  status: null
                })
              }
            }
          }

          const start = offset || 0
          const end = limit ? start + limit : values.length

          return {
            element,
            values: values.slice(start, end),
            totalCount: values.length
          }
        } catch (error) {
          logger.error('DataPointElement.history error:', error)
          return {
            element,
            values: [],
            totalCount: 0
          }
        }
      },

      parent(element) {
        // Extract parent path
        if (!element.path || !element.path.includes('.')) return null

        const parts = element.path.split('.')
        parts.pop()
        const parentPath = parts.join('.')

        return {
          name: parts[parts.length - 1] || element.dataPoint.name,
          path: parentPath,
          dataPoint: element.dataPoint
        }
      },

      children(element) {
        // Would need type introspection to list children
        return []
      }
    },

    ElementHistory: {
      element(history) {
        return history.element
      },
      values(history) {
        return history.values
      },
      totalCount(history) {
        return history.totalCount
      }
    },

    DataPointType: {
      async structure(dpType) {
        try {
          const structure = await winccoa.dpTypeGet(dpType.name, false)
          return structure
        } catch (error) {
          logger.error('DataPointType.structure error:', error)
          return {
            name: dpType.name,
            elementType: 'MIXED',
            children: []
          }
        }
      },

      async references(dpType) {
        try {
          const refs = await winccoa.dpGetDpTypeRefs(dpType.name)
          return refs.dptNames.map(name => ({
            name,
            system: dpType.system
          }))
        } catch (error) {
          logger.error('DataPointType.references error:', error)
          return []
        }
      },

      async usedBy(dpType) {
        try {
          const refs = await winccoa.dpGetRefsToDpType(dpType.name)
          return refs.dptNames.map(name => ({
            name,
            system: dpType.system
          }))
        } catch (error) {
          logger.error('DataPointType.usedBy error:', error)
          return []
        }
      },

      async dataPoints(dpType, { limit, offset }) {
        try {
          const names = await winccoa.dpNames('*', dpType.name)

          const start = offset || 0
          const end = limit ? start + limit : names.length
          const paginatedNames = names.slice(start, end)

          return paginatedNames.map(name => {
            const parsed = parseDataPointName(name)
            return {
              name: parsed.dpName,
              fullName: name,
              system: dpType.system,
              typeName: dpType.name
            }
          })
        } catch (error) {
          logger.error('DataPointType.dataPoints error:', error)
          return []
        }
      },

      async count(dpType) {
        try {
          const names = await winccoa.dpNames('*', dpType.name)
          return names.length
        } catch (error) {
          logger.error('DataPointType.count error:', error)
          return 0
        }
      }
    },

    DataPointTypeNode: {
      elementType(node) {
        return node.type
      },
      refType(node) {
        if (!node.refName) return null
        return {
          name: node.refName,
          system: null // Context not available here
        }
      },
      children(node) {
        return node.children || []
      }
    }
  }
}

module.exports = { createDataPointResolvers }
