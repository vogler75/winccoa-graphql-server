// Common helper functions for V2 resolvers

/**
 * Parses a data point name to extract system prefix and local name.
 * WinCC OA data points can be prefixed with system name (e.g., "SystemName:DpName").
 * This helper separates the system name from the actual data point name.
 *
 * @param {string} fullName - Full data point name, optionally with system prefix
 * @returns {object} Object with systemName (string or null) and dpName (string)
 */
function parseDataPointName(fullName) {
  const match = fullName.match(/^(?:([^:]+):)?(.+)$/)
  return {
    systemName: match[1] || null,
    dpName: match[2]
  }
}

module.exports = {
  parseDataPointName
}
