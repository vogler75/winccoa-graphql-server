// Alert type resolvers

const { parseDataPointName, getSystemInfo } = require('./helpers')

function createAlertResolvers(winccoa, logger) {
  return {
    async dataPoint(alert) {
      const parsed = parseDataPointName(alert.dpeName)
      const system = alert.system || await getSystemInfo(winccoa, parsed.systemName)
      const typeName = await winccoa.dpTypeName(parsed.dpName)

      return {
        name: parsed.dpName,
        fullName: alert.dpeName,
        system,
        typeName
      }
    },

    dataPointElementName(alert) {
      return alert.dpeName
    },

    attribute(alert, { name }) {
      return alert.values && alert.values[name] !== undefined ? alert.values[name] : null
    },

    text(alert) {
      return alert.values && alert.values['_alert_hdl.._text'] || null
    },

    acknowledged(alert) {
      const ackState = alert.values && alert.values['_alert_hdl.._ack_state']
      return ackState !== undefined && ackState !== 0
    },

    acknowledgedBy(alert) {
      return alert.values && alert.values['_alert_hdl.._ack_user'] || null
    },

    acknowledgedAt(alert) {
      return alert.values && alert.values['_alert_hdl.._ack_time'] || null
    },

    priority(alert) {
      return alert.values && alert.values['_alert_hdl.._prior'] || null
    },

    severity(alert) {
      const priority = alert.values && alert.values['_alert_hdl.._prior']
      if (priority === undefined || priority === null) return null

      // Map priority to severity string
      if (priority >= 0 && priority <= 20) return 'INFO'
      if (priority <= 40) return 'WARNING'
      if (priority <= 60) return 'ERROR'
      return 'CRITICAL'
    },

    attributes(alert) {
      if (!alert.values) return []

      return Object.entries(alert.values).map(([key, value]) => ({
        name: key,
        value
      }))
    }
  }
}

module.exports = { createAlertResolvers }
