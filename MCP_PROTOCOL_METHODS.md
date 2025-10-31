# MCP Protocol Methods

## Overview

The MCP (Model Context Protocol) server supports three JSON-RPC 2.0 methods as defined by the official specification.

All requests use Server-Sent Events (SSE) streaming over HTTP POST.

---

## 1. initialize (Required Handshake)

**Purpose:** Client-server protocol negotiation

Called once when client connects to establish the MCP connection.

### Request
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {
      "name": "client-name",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

### Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "winccoa-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

### Example (curl)
```bash
curl -X POST http://debian:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"initialize",
    "params":{
      "protocolVersion":"2024-11-05",
      "clientInfo":{"name":"test-client","version":"1.0.0"}
    },
    "id":1
  }'
```

### Response Format
```
data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05",...}}

```

---

## 2. tools/list (List Available Tools)

**Purpose:** Get list of all enabled MCP tools

Called to discover what tools are available.

### Request
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

### Response
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "dpGet",
        "description": "Get data point value",
        "inputSchema": {
          "type": "object",
          "properties": {
            "dpeNames": {
              "type": "string",
              "description": "Data point element name"
            }
          },
          "required": ["dpeNames"]
        }
      },
      {
        "name": "dpSet",
        "description": "Set data point value",
        "inputSchema": {
          "type": "object",
          "properties": {
            "dpeNames": {"type": "string"},
            "value": {"description": "Value to set"}
          },
          "required": ["dpeNames", "value"]
        }
      },
      // ... 78+ more tools
    ]
  }
}
```

### Example (curl)
```bash
curl -X POST http://debian:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
```

### Response Format
```
data: {"jsonrpc":"2.0","id":2,"result":{"tools":[...]}}

```

---

## 3. tools/call (Execute a Tool)

**Purpose:** Call a specific tool with parameters

Executes a WinCC OA function through the MCP interface.

### Request
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "dpGet",
    "arguments": {
      "dpeNames": "MyDataPoint."
    }
  },
  "id": 3
}
```

### Response (Success)
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "content": [
    {
      "type": "text",
      "text": "123.45"
    }
  ]
}
```

### Response (Error - Tool Disabled)
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "content": [
    {
      "type": "text",
      "text": "Tool dpGet is not available"
    }
  ],
  "isError": true
}
```

### Response (Error - WinCC OA Error)
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "content": [
    {
      "type": "text",
      "text": "Error executing dpGet: WinCC OA Error: DPE does not exist (Code: DPACCESS)"
    }
  ],
  "isError": true
}
```

### Example (curl)
```bash
curl -X POST http://debian:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"dpGet",
      "arguments":{"dpeNames":"MyDataPoint."}
    },
    "id":3
  }'
```

### Response Format
```
data: {"jsonrpc":"2.0","id":3,"content":[{"type":"text","text":"..."}]}

```

---

## Request/Response Flow

### Typical Client Connection Sequence

1. **Client connects and sends initialize**
   ```
   POST /mcp
   → initialize method
   ← capabilities and protocol version
   ```

2. **Client discovers available tools**
   ```
   POST /mcp
   → tools/list method
   ← array of 80+ tools
   ```

3. **Client calls specific tools**
   ```
   POST /mcp
   → tools/call with dpGet
   ← data point value

   POST /mcp
   → tools/call with dpSet
   ← success confirmation
   ```

---

## JSON-RPC 2.0 Error Format

### Invalid Method Error
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found: unknown_method"
  }
}
```

### Invalid Request Error
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request: missing jsonrpc field"
  }
}
```

### Internal Server Error
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal server error",
    "data": {"message": "detailed error message"}
  }
}
```

---

## Server-Sent Events (SSE) Format

All responses are streamed over SSE:

```
data: {json_response}\n\n
```

The response is a single JSON object prefixed with `data: ` and terminated with two newlines.

### Parsing SSE in Different Languages

**JavaScript/Node.js:**
```javascript
const text = await response.text();
if (text.startsWith('data: ')) {
  const json = text.replace('data: ', '').trim();
  const data = JSON.parse(json);
}
```

**Python:**
```python
response = requests.post(url, json=body)
if response.text.startswith('data: '):
  data = json.loads(response.text.replace('data: ', '').strip())
```

**curl:**
```bash
curl ... | grep '^data:' | sed 's/^data: //'
```

---

## Method Parameters

### initialize
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| protocolVersion | string | Yes | MCP protocol version (e.g., "2024-11-05") |
| clientInfo | object | No | Client metadata (name, version) |

### tools/list
No parameters required.

### tools/call
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Tool name (e.g., "dpGet") |
| arguments | object | No | Tool-specific arguments |

---

## Authentication

If `MCP_BEARER_TOKEN` is configured:

```bash
curl -X POST http://debian:3000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

Without token when required returns authentication error.

---

## Available Tools (80+)

See `MCP_HTTP_STREAMING.md` for complete list of all 80+ available tools:

- **Data Point Functions** (40+): dpGet, dpSet, dpCreate, dpDelete, dpConnect, etc.
- **Type Functions** (5): dpTypeCreate, dpTypeChange, dpTypeDelete, etc.
- **CNS Functions** (30+): cnsAddNode, cnsGetChildren, cnsSetProperty, etc.
- **Alert Functions** (6): alertGet, alertSet, alertGetPeriod, etc.

---

## Testing

### Test All Methods

```bash
# 1. Initialize
curl -X POST http://debian:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"1.0"}},"id":1}'

# 2. List tools
curl -X POST http://debian:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'

# 3. Call tool
curl -X POST http://debian:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"dpNames","arguments":{"dpPattern":"*"}},"id":3}'
```

### Automated Testing

```bash
node test-mcp-streaming.js
```

---

## Common Issues

### "Method not found: initialize"
**Cause:** initialize method not registered
**Solution:** Ensure mcp-http-server.js is updated
**Status:** ✅ Fixed in latest version

### "Method not found: unknown_method"
**Cause:** Invalid method name
**Solution:** Use only: initialize, tools/list, tools/call
**Error Code:** -32601

### "Invalid Request: missing jsonrpc field"
**Cause:** Request missing jsonrpc field
**Solution:** Always include: `"jsonrpc": "2.0"`
**Error Code:** -32600

---

## Protocol Version

Current implementation: **2024-11-05**

This is the official MCP protocol version supported by the SDK.

---

## References

- **MCP Specification:** https://modelcontextprotocol.io/
- **MCP HTTP Streaming Documentation:** MCP_HTTP_STREAMING.md
- **Quick Reference:** MCP_QUICK_REFERENCE.txt
- **Testing Guide:** MCP_TESTING_GUIDE.md
