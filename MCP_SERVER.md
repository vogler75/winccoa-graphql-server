# MCP Server for WinCC OA Node.js Functions

## Overview

The MCP (Model Context Protocol) Server exposes WinCC OA Node.js functions as tools through an HTTP-based JSON-RPC 2.0 interface. This allows external applications and clients to execute WinCC OA operations via simple HTTP POST requests.

## Features

- **80+ WinCC OA Functions Exposed**: Data Point (DP), CNS, and Alert operations
- **JSON-RPC 2.0 Protocol**: Standard, well-documented RPC format
- **HTTP Streaming Transport**: Simple HTTP POST requests, no WebSocket required
- **Bearer Token Authentication**: Optional authentication via Authorization header
- **Tool Access Control**: Fine-grained configuration of which tools are available
- **Comprehensive Documentation**: Each tool includes full parameter and return value documentation
- **Error Handling**: WinCC OA errors are properly propagated and documented

## Quick Start

### 1. Enable MCP Server

Add to `.env`:
```env
MCP_ENABLED=true
MCP_PORT=3001
MCP_BEARER_TOKEN=your-secret-token
```

### 2. Configure Available Tools

Edit `.env-mcp-tools` to enable/disable tool categories and individual tools:
```env
# Enable/disable entire categories
DP_FUNCTIONS=true
CNS_FUNCTIONS=true
ALERT_FUNCTIONS=true

# Or disable specific tools
DP_SET=false
```

### 3. Start the Server

```bash
npm run dev
```

Server will output:
```
🔌 MCP Server:
   📋 Tools List:         http://localhost:4000/mcp/tools/list
   🔧 Tool Call:          http://localhost:4000/mcp/tools/call
   🚀 Initialize:         http://localhost:4000/mcp/initialize
   ℹ️  Server Info:        http://localhost:4000/mcp/info
```

### 4. Make API Calls

```bash
# List available tools
curl -X POST http://localhost:4000/mcp/tools/list \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Call a tool
curl -X POST http://localhost:4000/mcp/tools/call \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "dpGet",
      "arguments": {
        "dpeNames": ["ExampleDP_Arg1."]
      }
    },
    "id": 1
  }'
```

## Configuration

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_ENABLED` | `false` | Enable/disable MCP server |
| `MCP_HOST` | `0.0.0.0` | Server binding address |
| `MCP_PORT` | `3001` | Server port |
| `MCP_BEARER_TOKEN` | `` | Optional bearer token for authentication |

### Tool Configuration (.env-mcp-tools)

The `.env-mcp-tools` file uses a simple key=value format:

**Category-level controls** (enable/disable all tools in a category):
```env
DP_FUNCTIONS=true
DP_MANAGEMENT_FUNCTIONS=true
CNS_FUNCTIONS=true
ALERT_FUNCTIONS=true
```

**Individual tool controls** (override category settings):
```env
DP_GET=true
DP_SET=false
DP_CREATE=true
ALERT_GET=true
```

## API Endpoints

### POST /mcp/tools/list

List all available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "dpGet",
        "description": "Get current values of one or more data point elements",
        "category": "DP_FUNCTIONS",
        "inputSchema": { /* JSON Schema */ }
      }
      // ... more tools
    ],
    "count": {
      "total": 85,
      "enabled": 75,
      "disabled": 10
    }
  }
}
```

### POST /mcp/tools/call

Execute a tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "dpGet",
    "arguments": {
      "dpeNames": "ExampleDP_Arg1."
    }
  },
  "id": 1
}
```

**Response (Success):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "toolName": "dpGet",
    "result": 123.456,
    "executedAt": "2024-01-15T10:30:45.123Z"
  }
}
```

**Response (Error):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Tool error: DPE does not exist or user has no read access",
    "data": {
      "winccoaErrorCode": "DPACCESS",
      "winccoaErrorCatalog": "CTRL"
    }
  }
}
```

### POST /mcp/initialize

Get server capabilities and information.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listTools": { "enabled": true },
        "callTool": { "enabled": true }
      }
    },
    "serverInfo": {
      "name": "WinCC OA GraphQL MCP Server",
      "version": "1.0.0",
      "description": "MCP server exposing WinCC OA Node.js functions"
    }
  }
}
```

### GET /mcp/info

Get server information and statistics.

**Response:**
```json
{
  "name": "WinCC OA MCP Server",
  "version": "1.0.0",
  "description": "Model Context Protocol server for WinCC OA Node.js functions",
  "tools": {
    "total": 85,
    "enabled": 75,
    "disabled": 10
  },
  "authentication": {
    "enabled": true,
    "type": "bearer_token"
  }
}
```

## Exposed Tools

### Data Point Functions (DP)

**Read Operations:**
- `dpGet` - Get current DPE values
- `dpExists` - Check if DPE exists
- `dpGetId` - Get data point ID
- `dpGetName` - Get DPE name from ID
- `dpGetDescription` - Get DPE description
- `dpGetFormat` - Get DPE format string
- `dpGetUnit` - Get DPE unit
- `dpGetAlias` - Get DPE alias
- `dpNames` - List DPEs matching pattern
- `dpTypes` - List data point types
- `dpQuery` - Execute query on archives
- `dpGetPeriod` - Get values in time period
- `dpAliasToName` - Convert alias to DPE name
- `dpAttributeType` - Get attribute type
- `dpElementType` - Get element type

**Write Operations:**
- `dpSet` - Set DPE values
- `dpSetWait` - Set values and wait for confirmation
- `dpSetTimed` - Set values with timestamp
- `dpSetTimedWait` - Set timed values and wait
- `dpSetDescription` - Set DPE description
- `dpSetFormat` - Set format string
- `dpSetUnit` - Set unit
- `dpSetAlias` - Set alias

**Connection Operations:**
- `dpConnect` - Monitor DPE changes
- `dpDisconnect` - Stop monitoring
- `dpQueryConnectAll` - Connect to query results
- `dpQueryConnectSingle` - Connect to single query result
- `dpQueryDisconnect` - Stop query monitoring

**Utility:**
- `dpCopy` - Copy data point
- `dpSubStr` - Extract substring from DP name
- `dpWaitForValue` - Wait for conditions
- `dpSetAndWaitForValue` - Set and wait for conditions
- `nameCheck` - Validate name

### Data Point Management Functions

- `dpCreate` - Create data point
- `dpDelete` - Delete data point
- `dpTypeCreate` - Create data point type
- `dpTypeChange` - Modify data point type
- `dpTypeDelete` - Delete data point type
- `dpTypeGet` - Get type structure
- `dpTypeName` - Get DPE type name

### CNS Functions (Component Name System)

**Node Operations:**
- `cnsAddNode` - Add node to tree
- `cnsAddTree` - Add tree
- `cnsChangeTree` - Modify tree
- `cnsDeleteTree` - Delete tree
- `cnsDeleteView` - Delete view
- `cnsCreateView` - Create view

**Query Operations:**
- `cnsGetChildren` - Get child nodes
- `cnsGetDisplayNames` - Get display names
- `cnsGetId` - Get node ID
- `cnsGetProperty` - Get node property
- `cnsGetPropertyKeys` - List property keys
- `cnsGetUserData` - Get user data
- `cnsGetParent` - Get parent node
- `cnsGetRoot` - Get root node
- `cnsGetSystemNames` - Get system names
- `cnsGetTrees` - Get trees for view
- `cnsGetViews` - Get views for system
- `cnsGetViewDisplayNames` - Get view display names
- `cnsGetViewSeparators` - Get path separators

**Property Operations:**
- `cnsSetProperty` - Set node property
- `cnsSetUserData` - Set user data

**Validation:**
- `cnsCheckName` - Validate name
- `cnsNodeExists` - Check node existence
- `cnsTreeExists` - Check tree existence
- `cnsIsNode` - Check if path is node
- `cnsIsTree` - Check if path is tree
- `cnsIsView` - Check if path is view

**Access Control:**
- `cnsGetAccessRight` - Get access rights
- `cnsGetOPCAccessRight` - Get OPC access rights

**Observers:**
- `cnsAddObserver` - Add change observer
- `cnsRemoveObserver` - Remove observer

### Alert Functions

- `alertGet` - Get alert attributes
- `alertSet` - Set alert attributes
- `alertSetWait` - Set and wait for confirmation
- `alertSetTimed` - Set with timestamp
- `alertSetTimedWait` - Set timed and wait
- `alertGetPeriod` - Get alerts from time period

## Authentication

### Disabling Authentication

To allow unauthenticated access:
```env
MCP_BEARER_TOKEN=
```

### Enabling Bearer Token Authentication

```env
MCP_BEARER_TOKEN=your-secret-token-here
```

Clients must then include the token in requests:
```bash
curl -X POST http://localhost:4000/mcp/tools/call \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Error Codes

JSON-RPC 2.0 error codes:

| Code | Message | Description |
|------|---------|-------------|
| `-32600` | Invalid Request | Missing jsonrpc field or invalid structure |
| `-32601` | Method not found | Unknown method |
| `-32602` | Invalid params | Missing required parameters |
| `-32603` | Internal error | Server-side error |
| `-32000` | Server error | Tool not available or WinCC OA error |

## Examples

### Getting Data Point Value

```javascript
const response = await fetch('http://localhost:4000/mcp/tools/call', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'dpGet',
      arguments: {
        dpeNames: 'ExampleDP_Arg1.'
      }
    },
    id: 1
  })
});

const data = await response.json();
console.log(data.result.result); // The actual DPE value
```

### Setting Data Point Value

```javascript
const response = await fetch('http://localhost:4000/mcp/tools/call', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'dpSet',
      arguments: {
        dpeNames: ['ExampleDP_Arg1.', 'ExampleDP_Arg2.'],
        values: [123.456, true]
      }
    },
    id: 1
  })
});
```

### Creating a Data Point

```javascript
const response = await fetch('http://localhost:4000/mcp/tools/call', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'dpCreate',
      arguments: {
        dpeName: 'NewDP',
        dpType: 'ExampleDP_Float'
      }
    },
    id: 1
  })
});
```

## File Structure

```
mcp/
├── mcp-server.js          # Main MCP server implementation
├── tools-registry.js      # Tool definitions and documentation
├── tool-loader.js         # Dynamic tool loading and filtering
├── auth-handler.js        # Bearer token authentication
└── transport-handler.js   # HTTP streaming transport (optional)

.env-mcp-tools            # Tool access control configuration
MCP_SERVER.md             # This documentation
```

## Logging

The MCP server logs important events:

- Tool initialization: `📋 MCP Tools Registry Loaded`
- Tool access: `Enabled/Disabled tool counts`
- Server startup: `🔧 Initializing MCP Server...`
- Successful tool execution: `Tool execution successful: <toolName>`
- Authentication failures: `Invalid bearer token`
- Tool access denied: `Tool access denied (disabled): <toolName>`

Set `LOG_LEVEL=debug` in `.env` for verbose logging.

## Security Considerations

1. **Bearer Token**: Keep your `MCP_BEARER_TOKEN` secret and change it from defaults
2. **Tool Access Control**: Use `.env-mcp-tools` to disable sensitive operations if needed
3. **Network Access**: Only expose MCP on trusted networks or behind authentication
4. **Rate Limiting**: Consider implementing rate limiting in reverse proxy
5. **Input Validation**: All tool parameters are validated against JSON schemas
6. **Error Messages**: WinCC OA error details are included for debugging (secure your logs)

## Troubleshooting

### MCP Server Not Starting

Check logs for:
```
🔌 MCP Server Configuration:
   Enabled: ❌ No
```

Ensure `MCP_ENABLED=true` in `.env`.

### Tool Not Found Error

1. Check if tool is in `.env-mcp-tools` and set to `true`
2. Call `/mcp/tools/list` to see available tools
3. Check `/mcp/info` for tool count statistics

### Authorization Failures

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing bearer token"
}
```

Ensure:
1. Token is sent in `Authorization: Bearer <token>` header
2. Token matches `MCP_BEARER_TOKEN` in `.env`

### Invalid Parameters Error

Response includes validation error message. Check:
1. Required parameters are provided
2. Parameter types match schema (string, array, number, etc.)
3. Tool documentation in `/mcp/tools/list` for parameter details

## Performance Notes

- Tool execution is async and non-blocking
- Connection monitoring (dpConnect) maintains open listeners
- Large result sets should be paginated where applicable
- Consider timeout handling for long-running operations

## Future Enhancements

- [ ] WebSocket support for persistent connections
- [ ] Streaming results for large datasets
- [ ] Tool result caching
- [ ] Rate limiting and quotas per token
- [ ] Audit logging for compliance
- [ ] OpenAPI/Swagger documentation generation
