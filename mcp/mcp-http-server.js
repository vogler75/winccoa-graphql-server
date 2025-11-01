// MCP Server with HTTP Streaming Transport
// Uses official @modelcontextprotocol/sdk with simple HTTP wrapper

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const express = require('express');
const http = require('http');
const { loadResources, getResourcesList, getResourceContent } = require('./resource-loader.js');
const path = require('path');

/**
 * Creates an MCP Server instance with tool definitions and resources
 *
 * @param {object} winccoa - WinCC OA Manager instance
 * @param {object} logger - Logger instance
 * @param {object} toolLoader - Tool loader with enabled tools
 * @returns {object} Server and handler functions
 */
function createMCPServer(winccoa, logger, toolLoader) {
  logger.info('🔧 Creating MCP Server with official SDK');

  // Load resources from markdown files
  const resourcesDir = path.join(__dirname, '..', 'resources');
  const resources = loadResources(resourcesDir, logger);

  // Create handlers directly (before server initialization)
  const handlers = {
    listTools: async () => {
      logger.debug('MCP: Listing tools');

      const enabledTools = toolLoader.getEnabledTools();
      const tools = enabledTools.map(toolName => {
        const toolDef = toolLoader.getToolDefinition(toolName);
        return {
          name: toolDef.name,
          description: toolDef.description,
          inputSchema: {
            type: 'object',
            properties: toolDef.inputSchema.properties || {},
            required: toolDef.inputSchema.required || []
          }
        };
      });

      logger.info(`📋 Returning ${tools.length} available tools`);

      return {
        tools
      };
    },

    callTool: async (name, args) => {
      logger.debug(`MCP: Calling tool: ${name}`);

      try {
        // Check if tool is enabled
        if (!toolLoader.isToolEnabled(name)) {
          logger.warn(`Tool access denied (disabled): ${name}`);
          return {
            content: [
              {
                type: 'text',
                text: `Tool ${name} is not available`
              }
            ],
            isError: true
          };
        }

        // Get tool definition
        const toolDef = toolLoader.getToolDefinition(name);
        if (!toolDef) {
          return {
            content: [
              {
                type: 'text',
                text: `Tool ${name} not found`
              }
            ],
            isError: true
          };
        }

        // Execute the tool
        logger.debug(`Executing: winccoa.${name}()`);

        const toolMethod = winccoa[name];
        if (typeof toolMethod !== 'function') {
          throw new Error(`${name} is not a callable function`);
        }

        // Call with parameters - order matters!
        const paramValues = Object.values(args || {});
        const result = await toolMethod.apply(winccoa, paramValues);

        logger.info(`✅ Tool ${name} executed successfully`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error(`❌ Tool ${name} error:`, error);

        const errorMsg = error.constructor.name === 'WinccoaError'
          ? `WinCC OA Error: ${error.message} (Code: ${error.code})`
          : error.message;

        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMsg}`
            }
          ],
          isError: true
        };
      }
    },

    listResources: async () => {
      logger.debug('MCP: Listing resources');
      const resourcesList = getResourcesList(resources);
      logger.info(`📚 Returning ${resourcesList.length} available resources`);
      return {
        resources: resourcesList
      };
    },

    readResource: async (uri) => {
      logger.debug(`MCP: Reading resource: ${uri}`);
      const content = getResourceContent(resources, uri);

      if (!content) {
        logger.warn(`Resource not found: ${uri}`);
        throw new Error(`Resource not found: ${uri}`);
      }

      logger.info(`✅ Resource ${uri} read successfully`);
      return {
        contents: [
          {
            uri: uri,
            mimeType: 'text/markdown',
            text: content
          }
        ]
      };
    }
  };

  // Create server with capabilities
  const server = new Server(
    {
      name: 'winccoa-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  // Register handlers
  // Initialize handler (MCP protocol handshake)
  server.setRequestHandler(InitializeRequestSchema, async (request) => {
    logger.info('MCP: Initialize request received');
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: 'winccoa-mcp-server',
        version: '1.0.0'
      }
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return handlers.listTools();
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handlers.callTool(request.params.name, request.params.arguments);
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return handlers.listResources();
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    return handlers.readResource(request.params.uri);
  });

  return { server, handlers };
}

/**
 * Creates an HTTP streaming transport for MCP
 * Uses Server-Sent Events (SSE) for streaming responses
 *
 * @param {object} mcpConfig - Object with server and handlers
 * @param {object} logger - Logger instance
 * @param {number} port - HTTP port
 * @param {string} host - HTTP host
 * @returns {http.Server} HTTP server
 */
function createHTTPTransport(mcpConfig, logger, port, host) {
  const { server, handlers } = mcpConfig;
  const app = express();

  app.use(express.json());

  // Add logging middleware to trace requests
  app.use((req, res, next) => {
    logger.debug(`MCP HTTP ${req.method} ${req.path}`);
    next();
  });

  // SSE endpoint for MCP protocol
  // Support both /mcp and /mcp/messages for compatibility
  const handleMCPRequest = async (req, res) => {
    logger.info('🔵 MCP: POST /mcp received');
    logger.debug('MCP: Request body', { method: req.body?.method, jsonrpc: req.body?.jsonrpc });

    const jsonrpcRequest = req.body;

    // Handle notifications FIRST (before setting SSE headers)
    // Notifications in Streamable HTTP transport should return HTTP 202 Accepted with no body
    if (jsonrpcRequest?.method?.startsWith('notifications/')) {
      logger.info(`📬 MCP: Received notification: ${jsonrpcRequest.method}`);

      // Handle specific notification types
      if (jsonrpcRequest.method === 'notifications/initialized') {
        logger.info('✅ MCP: Client initialized successfully');
      } else if (jsonrpcRequest.method === 'notifications/progress') {
        const progressToken = jsonrpcRequest.params?.progressToken;
        logger.debug(`📊 MCP: Progress notification (token: ${progressToken})`);
      } else if (jsonrpcRequest.method === 'notifications/resources/list_changed') {
        logger.debug('📚 MCP: Resources list changed notification received');
      } else if (jsonrpcRequest.method === 'notifications/tools/list_changed') {
        logger.debug('🔧 MCP: Tools list changed notification received');
      } else {
        logger.debug(`📬 MCP: Notification: ${jsonrpcRequest.method}`);
      }

      // Return HTTP 202 Accepted with no body (Streamable HTTP transport requirement)
      res.status(202).end();
      return;
    }

    // Set up SSE headers for streaming (for non-notification requests)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      logger.debug('MCP: Validating JSON-RPC request');

      // Validate JSON-RPC
      if (!jsonrpcRequest || !jsonrpcRequest.jsonrpc || jsonrpcRequest.jsonrpc !== '2.0') {
        logger.warn('MCP: Invalid JSON-RPC request (missing/invalid jsonrpc field)');
        const errorResponse = {
          jsonrpc: '2.0',
          id: jsonrpcRequest?.id,
          error: {
            code: -32600,
            message: 'Invalid Request: missing or invalid jsonrpc field'
          }
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.end();
        return;
      }

      if (!jsonrpcRequest.method) {
        logger.warn('MCP: Invalid JSON-RPC request (missing method)');
        const errorResponse = {
          jsonrpc: '2.0',
          id: jsonrpcRequest.id,
          error: {
            code: -32600,
            message: 'Invalid Request: missing method'
          }
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.end();
        return;
      }

      logger.info(`MCP: Processing request: ${jsonrpcRequest.method}`);

      let result;

      if (jsonrpcRequest.method === 'initialize') {
        logger.debug('MCP: Calling initialize handler');
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'winccoa-mcp-server',
            version: '1.0.0'
          }
        };
        logger.debug('MCP: Initialize completed');
      } else if (jsonrpcRequest.method === 'tools/list') {
        logger.debug('MCP: Calling handlers.listTools()');
        result = await handlers.listTools();
        logger.debug(`MCP: listTools completed, returning ${result.tools?.length || 0} tools`);
      } else if (jsonrpcRequest.method === 'tools/call') {
        const toolName = jsonrpcRequest.params?.name;
        logger.info(`MCP: Calling tool: ${toolName}`);
        result = await handlers.callTool(
          toolName,
          jsonrpcRequest.params?.arguments
        );
        logger.debug(`MCP: callTool(${toolName}) completed`);
      } else if (jsonrpcRequest.method === 'resources/list') {
        logger.debug('MCP: Calling handlers.listResources()');
        result = await handlers.listResources();
        logger.debug(`MCP: listResources completed, returning ${result.resources?.length || 0} resources`);
      } else if (jsonrpcRequest.method === 'resources/read') {
        const resourceUri = jsonrpcRequest.params?.uri;
        logger.info(`MCP: Reading resource: ${resourceUri}`);
        result = await handlers.readResource(resourceUri);
        logger.debug(`MCP: readResource(${resourceUri}) completed`);
      } else {
        logger.warn(`MCP: Unknown method: ${jsonrpcRequest.method}`);
        const errorResponse = {
          jsonrpc: '2.0',
          id: jsonrpcRequest.id,
          error: {
            code: -32601,
            message: `Method not found: ${jsonrpcRequest.method}`
          }
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.end();
        return;
      }

      // Send successful response as SSE
      const response = {
        jsonrpc: '2.0',
        id: jsonrpcRequest.id,
        result: result
      };

      logger.info(`🟢 MCP: Sending response for request ${jsonrpcRequest.id}`);
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
    } catch (error) {
      logger.error('🔴 MCP request error:', error.message, error.stack);

      const errorResponse = {
        jsonrpc: '2.0',
        id: jsonrpcRequest?.id,
        error: {
          code: -32603,
          message: 'Internal server error',
          data: { message: error.message }
        }
      };

      try {
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.end();
      } catch (writeError) {
        logger.error('MCP: Error writing response:', writeError.message);
      }
    }
  };

  // Register the handler for both /mcp and /mcp/messages paths (for compatibility)
  app.post('/mcp', handleMCPRequest);
  app.post('/mcp/messages', handleMCPRequest);

  // Health check
  app.get('/mcp/health', (req, res) => {
    logger.debug('MCP: Health check requested');
    res.json({ status: 'healthy', service: 'mcp-server' });
  });

  // Server info
  app.get('/mcp/info', (req, res) => {
    logger.debug('MCP: Server info requested');
    res.json({
      name: 'WinCC OA MCP Server',
      version: '1.0.0',
      protocol: 'MCP',
      transport: 'HTTP-SSE'
    });
  });

  const httpServer = http.createServer(app);

  httpServer.on('error', (error) => {
    logger.error('🔴 MCP HTTP Server error:', error.message);
  });

  httpServer.listen(port, host, () => {
    logger.info(`✅ 🌐 MCP HTTP Transport listening on ${host}:${port}`);
    logger.info(`   📨 Messages (SSE):     http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/mcp/messages`);
    logger.info(`   💚 Health Check:       http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/mcp/health`);
    logger.info(`   ℹ️  Server Info:        http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/mcp/info`);
  });

  return httpServer;
}

module.exports = {
  createMCPServer,
  createHTTPTransport
};
