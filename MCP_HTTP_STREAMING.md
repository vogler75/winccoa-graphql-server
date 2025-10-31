# MCP Server with HTTP Streaming Transport

## Overview

This is a **proper MCP (Model Context Protocol) server** implementation using the official `@modelcontextprotocol/sdk` package with **HTTP Streaming transport (Server-Sent Events/SSE)**.

The server exposes 80+ WinCC OA Node.js functions as MCP tools through a standard HTTP streaming interface.

## Features

✅ **Official MCP SDK**: Uses `@modelcontextprotocol/sdk` v1.20.2+
✅ **HTTP Streaming Transport**: Server-Sent Events (SSE) for proper streaming
✅ **80+ Tools Exposed**: DP, CNS, Alert functions
✅ **Fine-grained Access Control**: Enable/disable tools via `.env-mcp-tools`
✅ **Comprehensive Documentation**: Each tool includes full schema and examples

## Configuration

### 1. Enable MCP in .env

```env
MCP_ENABLED=true
MCP_HOST=0.0.0.0
MCP_PORT=3001
MCP_BEARER_TOKEN=         # Optional, leave empty to disable auth
```

### 2. Configure Tools (.env-mcp-tools)

```env
DP_FUNCTIONS=true
DP_MANAGEMENT_FUNCTIONS=true
CNS_FUNCTIONS=true
ALERT_FUNCTIONS=true

# Disable specific tools if needed
DP_SET=false
```

### 3. Start Server

```bash
npm run dev
```

You should see:
```
🔌 MCP Server (HTTP Streaming):
   📨 Messages (SSE):     http://localhost:3001/mcp/messages
   💚 Health Check:       http://localhost:3001/mcp/health
   ℹ️  Server Info:        http://localhost:3001/mcp/info
```

## API Endpoints

### POST /mcp/messages

Send MCP requests and receive streaming responses via Server-Sent Events (SSE).

**Request Format (JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list" | "tools/call",
  "params": { /* method-specific params */ },
  "id": 1
}
```

**Response Format (SSE):**
```
data: {json response}\n\n
```

### GET /mcp/health

Health check endpoint.

```bash
curl http://localhost:3001/mcp/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "mcp-server"
}
```

### GET /mcp/info

Server information.

```bash
curl http://localhost:3001/mcp/info
```

**Response:**
```json
{
  "name": "WinCC OA MCP Server",
  "version": "1.0.0",
  "protocol": "MCP",
  "transport": "HTTP-SSE"
}
```

## Usage Examples

### List Available Tools

```bash
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

**Response (SSE):**
```
data: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}\n\n
```

### Call a Tool (Get Data Point Value)

```bash
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "dpGet",
      "arguments": {
        "dpeNames": "ExampleDP_Arg1."
      }
    },
    "id": 2
  }'
```

**Response (SSE):**
```
data: {"jsonrpc":"2.0","id":2,"content":[{"type":"text","text":"123.456"}]}\n\n
```

### JavaScript Client Example

```javascript
async function callMCPTool(toolName, args) {
  const response = await fetch('http://localhost:3001/mcp/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN' // if configured
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      },
      id: 1
    })
  });

  const text = await response.text();

  // Parse SSE format
  if (text.startsWith('data: ')) {
    const jsonData = text.replace('data: ', '').trim();
    const result = JSON.parse(jsonData);

    // Extract result
    if (result.content?.[0]?.text) {
      const output = JSON.parse(result.content[0].text);
      console.log('Result:', output);
    } else if (result.error) {
      console.error('Error:', result.error.message);
    }
  }
}

// Usage
await callMCPTool('dpGet', { dpeNames: 'ExampleDP_Arg1.' });
```

## Testing

### Quick Test Script

```bash
node test-mcp-streaming.js
```

This will test:
1. ✅ Health endpoint
2. ✅ Server info endpoint
3. ✅ Tools list via SSE
4. ✅ Tool call via SSE

### Manual Testing with curl

```bash
# Test health
curl http://localhost:3001/mcp/health

# List tools
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Get data point value
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "dpGet",
      "arguments": {"dpeNames": "ExampleDP_Arg1."}
    },
    "id": 1
  }'
```

## Exposed Tools

### Data Point Functions (DP)
- `dpGet` - Get current values
- `dpSet` - Set values
- `dpCreate` - Create data point
- `dpDelete` - Delete data point
- `dpConnect` - Monitor changes
- `dpDisconnect` - Stop monitoring
- `dpExists` - Check existence
- `dpGetId`, `dpGetName` - Get identifiers
- `dpGetDescription`, `dpSetDescription` - Description management
- `dpGetFormat`, `dpSetFormat` - Format management
- `dpGetUnit`, `dpSetUnit` - Unit management
- `dpGetAlias`, `dpSetAlias` - Alias management
- `dpAliasToName` - Alias conversion
- `dpNames`, `dpTypes` - List matching names/types
- `dpQuery` - Query archives
- `dpGetPeriod` - Get values in time period
- `dpSetWait`, `dpSetTimed`, `dpSetTimedWait` - Advanced set operations
- `dpCopy`, `dpSubStr` - Utility operations
- `dpWaitForValue`, `dpSetAndWaitForValue` - Condition-based operations
- And more...

### Data Point Type Functions
- `dpTypeCreate`, `dpTypeChange`, `dpTypeDelete` - Type management
- `dpTypeGet`, `dpTypeName` - Type information

### CNS Functions (Component Name System)
- `cnsAddNode`, `cnsAddTree` - Add to tree
- `cnsGetChildren`, `cnsGetProperty` - Query tree
- `cnsSetProperty`, `cnsSetUserData` - Modify tree
- `cnsNodeExists`, `cnsTreeExists` - Check existence
- `cnsCreateView`, `cnsDeleteView` - View management
- `cnsGetViews`, `cnsGetTrees` - List views/trees
- And 25+ more CNS functions

### Alert Functions
- `alertGet` - Get alert attributes
- `alertSet` - Set alert attributes
- `alertSetWait`, `alertSetTimed`, `alertSetTimedWait` - Advanced set operations
- `alertGetPeriod` - Get alerts from time period

## Architecture

```
HTTP Client
    ↓
Express Server (Port 3001)
    ↓
/mcp/messages endpoint
    ↓
MCP Server (official SDK)
    ↓
Tool Loader (loads enabled tools)
    ↓
WinCC OA Manager
    ↓
WinCC OA Node.js functions
```

## Error Handling

### WinCC OA Errors

When a tool fails, the response will include error details:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "content": [{
    "type": "text",
    "text": "Error executing dpGet: WinCC OA Error: DPE does not exist (Code: DPACCESS)"
  }],
  "isError": true
}
```

### Parameter Validation

If parameters don't match the tool schema:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "content": [{
    "type": "text",
    "text": "Tool dpGet is not available"
  }],
  "isError": true
}
```

## Security

- **No Authentication by Default**: Leave `MCP_BEARER_TOKEN` empty
- **Optional Bearer Token**: Set `MCP_BEARER_TOKEN` to require authentication
- **Tool Access Control**: Use `.env-mcp-tools` to disable sensitive operations
- **Input Validation**: All parameters validated against MCP schemas
- **WinCC OA Permissions**: Respects user permissions from WinCC OA

## Performance

- **Non-blocking**: All operations are async
- **Streaming Responses**: SSE allows streaming large results
- **Connection Pooling**: Reuses WinCC OA manager instance
- **Efficient Tool Loading**: Tools loaded once at startup

## Troubleshooting

### MCP Server Not Starting

Check logs for:
```
❌ Failed to initialize MCP Server:
   Ensure @modelcontextprotocol/sdk is installed: npm install
```

**Solution**: Install SDK
```bash
npm install
```

### "Cannot POST /mcp/messages"

**Cause**: Server is not running or port is wrong

**Solution**:
1. Verify `MCP_ENABLED=true` in `.env`
2. Check port in logs
3. Restart server: `npm run dev`

### Tool Not Available Error

**Cause**: Tool is disabled in `.env-mcp-tools`

**Solution**:
1. Edit `.env-mcp-tools`
2. Set tool to enabled: `DP_GET=true`
3. Restart server

### SSE Not Streaming Properly

**Cause**: Client not handling SSE format

**Solution**:
1. Look for `data:` prefix in response
2. Parse JSON after `data: `
3. Handle `\n\n` as message delimiter

## File Structure

```
mcp/
├── mcp-http-server.js      # HTTP Streaming implementation
├── tools-registry.js       # Tool definitions
├── tool-loader.js          # Tool access control
├── auth-handler.js         # Authentication
└── mcp-server.js           # Old implementation (deprecated)

.env-mcp-tools             # Tool configuration
test-mcp-streaming.js      # Test client
MCP_HTTP_STREAMING.md      # This documentation
```

## References

- **MCP Specification**: https://modelcontextprotocol.io/
- **SDK Documentation**: https://github.com/modelcontextprotocol/python-sdk
- **WinCC OA Node.js API**: https://www.winccoa.com/documentation/

## Future Enhancements

- [ ] Persistent connections
- [ ] Request/response streaming for large data
- [ ] Tool result caching
- [ ] Rate limiting per token
- [ ] Audit logging
- [ ] OpenAPI/Swagger generation
