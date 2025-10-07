// Common helper functions for V2 resolvers

// Helper: Parse system prefix from dp name
function parseDataPointName(fullName) {
  const match = fullName.match(/^(?:([^:]+):)?(.+)$/)
  return {
    systemName: match[1] || null,
    dpName: match[2]
  }
}

// Helper: Get system info
async function getSystemInfo(winccoa, systemName) {
  try {
    const systemId = systemName ? winccoa.getSystemId(systemName) : winccoa.getSystemId()
    const name = systemName || winccoa.getSystemName(systemId)
    const localSystemId = winccoa.getSystemId()

    return {
      id: systemId,
      name: name,
      isLocal: systemId === localSystemId,
      isActive: true // TODO: Could check system connectivity
    }
  } catch (error) {
    throw error
  }
}

module.exports = {
  parseDataPointName,
  getSystemInfo
}
