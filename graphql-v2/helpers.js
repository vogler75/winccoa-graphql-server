// Common helper functions for V2 resolvers

// Helper: Parse system prefix from dp name
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
