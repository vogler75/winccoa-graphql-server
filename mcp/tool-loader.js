// Tool Loader
// Dynamically loads and filters tools based on .env-mcp-tools configuration

const { toolsRegistry } = require('./tools-registry');
const fs = require('fs');
const path = require('path');

/**
 * Loads the .env-mcp-tools configuration file
 * Parses environment variable style configuration
 *
 * @param {string} envMcpPath - Path to .env-mcp-tools file
 * @returns {object} Configuration object with all enabled settings
 */
function loadToolsConfig(envMcpPath) {
  const config = {};

  try {
    if (!fs.existsSync(envMcpPath)) {
      console.warn(`⚠️  .env-mcp-tools file not found at ${envMcpPath}, using defaults`);
      return getDefaultConfig();
    }

    const content = fs.readFileSync(envMcpPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }

      const [key, value] = line.split('=');
      if (key && value) {
        const trimmedKey = key.trim();
        const trimmedValue = value.trim().toLowerCase();
        config[trimmedKey] = trimmedValue === 'true';
      }
    }

    return config;
  } catch (error) {
    console.error(`Error loading .env-mcp-tools: ${error.message}`);
    return getDefaultConfig();
  }
}

/**
 * Returns default configuration (all tools enabled)
 *
 * @returns {object} Default configuration
 */
function getDefaultConfig() {
  const defaultConfig = {};

  // Set all tools to enabled by default
  for (const toolName of Object.keys(toolsRegistry)) {
    const categoryKey = toolsRegistry[toolName].category;
    if (!defaultConfig[categoryKey]) {
      defaultConfig[categoryKey] = true;
    }

    // Individual tool setting
    const toolKey = toolsRegistry[toolName].name.toUpperCase();
    if (!defaultConfig[toolKey]) {
      defaultConfig[toolKey] = true;
    }
  }

  return defaultConfig;
}

/**
 * Filters tools based on configuration
 * Respects both category-level and tool-level settings
 *
 * @param {object} config - Configuration object
 * @returns {object} Filtered tools registry
 */
function filterTools(config) {
  const filteredTools = {};

  for (const [toolName, toolDef] of Object.entries(toolsRegistry)) {
    const categoryKey = toolDef.category;
    const toolKey = toolName.toUpperCase();

    // Check category-level setting first (default true if not specified)
    const categoryEnabled = config[categoryKey] !== false;

    // Check individual tool setting (default to category setting if not specified)
    const toolEnabled = config[toolKey] !== undefined ? config[toolKey] : categoryEnabled;

    if (toolEnabled) {
      filteredTools[toolName] = {
        ...toolDef,
        enabled: true
      };
    } else {
      filteredTools[toolName] = {
        ...toolDef,
        enabled: false
      };
    }
  }

  return filteredTools;
}

/**
 * Gets list of enabled tools
 *
 * @param {object} filteredTools - Filtered tools registry
 * @returns {string[]} Array of enabled tool names
 */
function getEnabledTools(filteredTools) {
  return Object.keys(filteredTools).filter(name => filteredTools[name].enabled);
}

/**
 * Gets list of disabled tools
 *
 * @param {object} filteredTools - Filtered tools registry
 * @returns {string[]} Array of disabled tool names
 */
function getDisabledTools(filteredTools) {
  return Object.keys(filteredTools).filter(name => !filteredTools[name].enabled);
}

/**
 * Logs tool loading summary
 *
 * @param {object} filteredTools - Filtered tools registry
 * @param {object} logger - Logger instance
 */
function logToolSummary(filteredTools, logger) {
  const enabled = getEnabledTools(filteredTools);
  const disabled = getDisabledTools(filteredTools);

  logger.info(`📋 MCP Tools Registry Loaded`);
  logger.info(`   ✅ Enabled tools: ${enabled.length}`);
  if (enabled.length > 0 && enabled.length <= 10) {
    enabled.forEach(tool => logger.debug(`      - ${tool}`));
  } else if (enabled.length > 10) {
    enabled.slice(0, 5).forEach(tool => logger.debug(`      - ${tool}`));
    logger.debug(`      ... and ${enabled.length - 5} more`);
  }

  logger.info(`   ❌ Disabled tools: ${disabled.length}`);
  if (disabled.length > 0 && disabled.length <= 10) {
    disabled.forEach(tool => logger.debug(`      - ${tool}`));
  } else if (disabled.length > 10) {
    disabled.slice(0, 5).forEach(tool => logger.debug(`      - ${tool}`));
    logger.debug(`      ... and ${disabled.length - 5} more`);
  }
}

/**
 * Checks if a specific tool is enabled
 *
 * @param {string} toolName - Tool name to check
 * @param {object} filteredTools - Filtered tools registry
 * @returns {boolean} true if tool is enabled
 */
function isToolEnabled(toolName, filteredTools) {
  if (!filteredTools[toolName]) {
    return false;
  }
  return filteredTools[toolName].enabled === true;
}

/**
 * Gets tool definition by name
 *
 * @param {string} toolName - Tool name
 * @param {object} filteredTools - Filtered tools registry
 * @returns {object|null} Tool definition or null if not found/disabled
 */
function getToolDefinition(toolName, filteredTools) {
  const tool = filteredTools[toolName];
  if (tool && tool.enabled) {
    return tool;
  }
  return null;
}

/**
 * Main loader function - loads and initializes tools
 *
 * @param {string} envMcpToolsPath - Path to .env-mcp-tools file
 * @param {object} logger - Logger instance
 * @returns {object} Object containing filtered tools and utility functions
 */
function initializeToolLoader(envMcpToolsPath, logger) {
  logger.info('🔧 Initializing MCP Tool Loader...');

  const config = loadToolsConfig(envMcpToolsPath);
  const filteredTools = filterTools(config);

  logToolSummary(filteredTools, logger);

  return {
    tools: filteredTools,
    getEnabledTools: () => getEnabledTools(filteredTools),
    getDisabledTools: () => getDisabledTools(filteredTools),
    isToolEnabled: (toolName) => isToolEnabled(toolName, filteredTools),
    getToolDefinition: (toolName) => getToolDefinition(toolName, filteredTools),
    getToolCount: () => ({
      total: Object.keys(toolsRegistry).length,
      enabled: getEnabledTools(filteredTools).length,
      disabled: getDisabledTools(filteredTools).length
    })
  };
}

module.exports = {
  initializeToolLoader,
  loadToolsConfig,
  filterTools,
  getEnabledTools,
  getDisabledTools,
  isToolEnabled,
  getToolDefinition,
  logToolSummary
};
