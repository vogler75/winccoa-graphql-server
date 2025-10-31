const { readFileSync } = require('fs')
const { join } = require('path')

/**
 * Loads and parses the MCP tools configuration file.
 *
 * The configuration file should contain boolean flags for each tool,
 * determining whether the tool should be exposed via the MCP server.
 *
 * @param {string} configPath - Path to the configuration file
 * @returns {object} Configuration object with tool flags
 */
function loadToolsConfig(configPath) {
  const config = {}

  try {
    const content = readFileSync(configPath, 'utf8')
    const lines = content.split('\n')

    for (const line of lines) {
      // Skip empty lines and comments
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.+)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().toLowerCase()

        // Convert string values to boolean
        config[key] = value === 'true' || value === '1' || value === 'yes'
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not load tools config from ${configPath}: ${error.message}`)
    console.warn('All tools will be disabled by default')
  }

  return config
}

/**
 * Checks if a specific tool is enabled in the configuration.
 *
 * @param {object} config - Configuration object
 * @param {string} toolName - Name of the tool (e.g., 'TOOL_DP_GET')
 * @returns {boolean} True if the tool is enabled, false otherwise
 */
function isToolEnabled(config, toolName) {
  return config[toolName] === true
}

/**
 * Gets a list of all enabled tools from the configuration.
 *
 * @param {object} config - Configuration object
 * @returns {string[]} Array of enabled tool names
 */
function getEnabledTools(config) {
  return Object.keys(config).filter(key => config[key] === true)
}

module.exports = {
  loadToolsConfig,
  isToolEnabled,
  getEnabledTools
}
