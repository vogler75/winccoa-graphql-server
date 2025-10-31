// MCP Server Implementation
// Handles JSON-RPC 2.0 protocol over HTTP streaming
// Executes WinCC OA Node.js functions through configured tools

const { initializeToolLoader } = require('./tool-loader');
const { validateBearerToken, extractBearerToken } = require('./auth-handler');

/**
 * Main MCP Server class
 * Manages tool execution and JSON-RPC communication
 */
class MCPServer {
  /**
   * Constructor
   *
   * @param {object} winccoa - WinCC OA Manager instance
   * @param {object} logger - Logger instance
   * @param {string} envMcpToolsPath - Path to .env-mcp-tools file
   * @param {string} mcpBearerToken - Configured bearer token (may be empty)
   */
  constructor(winccoa, logger, envMcpToolsPath, mcpBearerToken) {
    this.winccoa = winccoa;
    this.logger = logger;
    this.mcpBearerToken = mcpBearerToken;

    // Initialize tool loader
    const toolLoader = initializeToolLoader(envMcpToolsPath, logger);
    this.tools = toolLoader.tools;
    this.getEnabledTools = toolLoader.getEnabledTools;
    this.isToolEnabled = toolLoader.isToolEnabled;
    this.getToolDefinition = toolLoader.getToolDefinition;
    this.getToolCount = toolLoader.getToolCount;

    // Request counter for logging
    this.requestCounter = 0;
  }

  /**
   * Handles incoming JSON-RPC 2.0 request
   *
   * @param {object} jsonRpcRequest - JSON-RPC 2.0 request object
   * @param {object} authContext - Authentication context
   * @returns {Promise<object>} JSON-RPC 2.0 response object
   */
  async handleRequest(jsonRpcRequest, authContext) {
    const requestId = ++this.requestCounter;

    try {
      // Validate JSON-RPC structure
      if (!jsonRpcRequest.jsonrpc || jsonRpcRequest.jsonrpc !== '2.0') {
        this.logger.warn(`[MCP-${requestId}] Invalid JSON-RPC version`);
        return this.errorResponse(null, -32600, 'Invalid Request: missing or invalid jsonrpc field');
      }

      // Handle notifications (no id field)
      const isNotification = jsonRpcRequest.id === undefined || jsonRpcRequest.id === null;

      // Validate required fields
      if (!jsonRpcRequest.method) {
        if (!isNotification) {
          return this.errorResponse(jsonRpcRequest.id, -32600, 'Invalid Request: missing method');
        }
        return null;
      }

      this.logger.debug(`[MCP-${requestId}] Processing ${isNotification ? 'notification' : 'request'}: ${jsonRpcRequest.method}`);

      // Route to appropriate handler
      if (jsonRpcRequest.method === 'tools/list') {
        return this.handleToolsList(jsonRpcRequest.id, authContext);
      } else if (jsonRpcRequest.method === 'tools/call') {
        return this.handleToolCall(jsonRpcRequest.id, jsonRpcRequest.params, authContext);
      } else if (jsonRpcRequest.method === 'initialize') {
        return this.handleInitialize(jsonRpcRequest.id);
      } else {
        return this.errorResponse(jsonRpcRequest.id, -32601, `Method not found: ${jsonRpcRequest.method}`);
      }
    } catch (error) {
      this.logger.error(`[MCP-${requestId}] Error handling request:`, error);
      return this.errorResponse(
        jsonRpcRequest.id,
        -32603,
        'Internal error',
        { message: error.message }
      );
    }
  }

  /**
   * Handles tools/list request
   * Returns list of available tools
   *
   * @param {number} id - JSON-RPC request ID
   * @param {object} authContext - Authentication context
   * @returns {object} JSON-RPC response
   */
  handleToolsList(id, authContext) {
    this.logger.debug('Handling tools/list request');

    const enabledTools = this.getEnabledTools();
    const tools = enabledTools.map(toolName => {
      const toolDef = this.getToolDefinition(toolName);
      return {
        name: toolDef.name,
        description: toolDef.description,
        inputSchema: toolDef.inputSchema,
        category: toolDef.category
      };
    });

    const result = {
      tools,
      count: this.getToolCount()
    };

    this.logger.info(`Returning list of ${tools.length} available tools`);

    return this.successResponse(id, result);
  }

  /**
   * Handles tools/call request
   * Executes a tool and returns result
   *
   * @param {number} id - JSON-RPC request ID
   * @param {object} params - Tool parameters
   * @param {object} authContext - Authentication context
   * @returns {Promise<object>} JSON-RPC response
   */
  async handleToolCall(id, params, authContext) {
    try {
      // Validate params
      if (!params || !params.name) {
        return this.errorResponse(id, -32602, 'Invalid params: missing tool name');
      }

      const toolName = params.name;
      const toolParams = params.arguments || {};

      this.logger.debug(`Executing tool: ${toolName}`);

      // Check if tool is enabled
      if (!this.isToolEnabled(toolName)) {
        this.logger.warn(`Tool access denied (disabled): ${toolName}`);
        return this.errorResponse(id, -32000, `Tool not available: ${toolName}`);
      }

      // Get tool definition
      const toolDef = this.getToolDefinition(toolName);
      if (!toolDef) {
        return this.errorResponse(id, -32000, `Tool not found: ${toolName}`);
      }

      // Validate input parameters against schema
      const validationError = this.validateToolParams(toolDef, toolParams);
      if (validationError) {
        this.logger.warn(`Tool parameter validation failed for ${toolName}: ${validationError}`);
        return this.errorResponse(id, -32602, `Invalid tool parameters: ${validationError}`);
      }

      // Execute tool
      const result = await this.executeTool(toolName, toolParams);

      this.logger.debug(`Tool execution successful: ${toolName}`);

      return this.successResponse(id, {
        toolName,
        result,
        executedAt: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`Tool execution error: ${error.message}`);

      // Check if it's a WinCC OA error
      if (error.constructor.name === 'WinccoaError' || error.code) {
        return this.errorResponse(id, -32000, `Tool error: ${error.message}`, {
          winccoaErrorCode: error.code,
          winccoaErrorCatalog: error.catalog
        });
      }

      return this.errorResponse(id, -32603, 'Internal error executing tool', {
        message: error.message
      });
    }
  }

  /**
   * Handles initialize request
   * Returns server capabilities
   *
   * @param {number} id - JSON-RPC request ID
   * @returns {object} JSON-RPC response
   */
  handleInitialize(id) {
    const toolCount = this.getToolCount();

    const capabilities = {
      tools: {
        listTools: {
          enabled: true
        },
        callTool: {
          enabled: true
        }
      },
      mcp: {
        version: '1.0.0',
        protocolVersion: '2024-11-05'
      }
    };

    const result = {
      protocolVersion: '2024-11-05',
      capabilities,
      serverInfo: {
        name: 'WinCC OA GraphQL MCP Server',
        version: '1.0.0',
        description: 'MCP server exposing WinCC OA Node.js functions'
      },
      resources: {
        tools: {
          total: toolCount.total,
          enabled: toolCount.enabled,
          disabled: toolCount.disabled
        }
      }
    };

    return this.successResponse(id, result);
  }

  /**
   * Validates tool parameters against tool schema
   *
   * @param {object} toolDef - Tool definition
   * @param {object} params - Parameters to validate
   * @returns {string|null} Error message or null if valid
   */
  validateToolParams(toolDef, params) {
    if (!toolDef.inputSchema || toolDef.inputSchema.type !== 'object') {
      return null;
    }

    const requiredFields = toolDef.inputSchema.required || [];
    for (const field of requiredFields) {
      if (!(field in params)) {
        return `Missing required parameter: ${field}`;
      }
    }

    return null;
  }

  /**
   * Executes a WinCC OA tool
   *
   * @param {string} toolName - Tool name
   * @param {object} params - Tool parameters
   * @returns {Promise<unknown>} Tool result
   */
  async executeTool(toolName, params) {
    // Get the tool method from winccoa manager
    const toolMethod = this.winccoa[toolName];

    if (typeof toolMethod !== 'function') {
      throw new Error(`Tool ${toolName} is not a callable method`);
    }

    // Prepare parameters for function call
    const funcParams = this.extractFunctionParams(toolName, params);

    // Call the tool
    this.logger.debug(`Calling winccoa.${toolName} with params:`, funcParams);

    const result = toolMethod.apply(this.winccoa, funcParams);

    // Handle async results
    if (result instanceof Promise) {
      return await result;
    }

    return result;
  }

  /**
   * Extracts parameters in the correct order for function call
   *
   * @param {string} toolName - Tool name
   * @param {object} params - Parameter object
   * @returns {array} Ordered parameters for function call
   */
  extractFunctionParams(toolName, params) {
    // Most WinCC OA functions have straightforward parameter mappings
    // This method maps the JSON object params to function arguments

    const paramKeys = Object.keys(params);

    // For most tools, we can just pass parameters in order of the object keys
    // Since our schema definitions follow the actual function signatures
    return paramKeys.map(key => params[key]);
  }

  /**
   * Creates a successful JSON-RPC response
   *
   * @param {number} id - Request ID
   * @param {unknown} result - Response result
   * @returns {object} JSON-RPC response
   */
  successResponse(id, result) {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  /**
   * Creates an error JSON-RPC response
   *
   * @param {number} id - Request ID
   * @param {number} code - Error code
   * @param {string} message - Error message
   * @param {object} data - Additional error data
   * @returns {object} JSON-RPC error response
   */
  errorResponse(id, code, message, data = null) {
    const error = {
      code,
      message
    };

    if (data) {
      error.data = data;
    }

    return {
      jsonrpc: '2.0',
      id: id || null,
      error
    };
  }

  /**
   * Gets server info
   *
   * @returns {object} Server information
   */
  getServerInfo() {
    const toolCount = this.getToolCount();

    return {
      name: 'WinCC OA MCP Server',
      version: '1.0.0',
      description: 'Model Context Protocol server for WinCC OA Node.js functions',
      tools: {
        total: toolCount.total,
        enabled: toolCount.enabled,
        disabled: toolCount.disabled
      },
      authentication: {
        enabled: !!this.mcpBearerToken,
        type: this.mcpBearerToken ? 'bearer_token' : 'none'
      }
    };
  }
}

module.exports = { MCPServer };
