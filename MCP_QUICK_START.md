# MCP Server Quick Start Guide

## ✅ What's Implemented

A **proper MCP (Model Context Protocol) server** with:
- ✅ Official `@modelcontextprotocol/sdk` implementation
- ✅ HTTP Streaming transport (Server-Sent Events/SSE)
- ✅ 80+ WinCC OA Node.js functions as tools
- ✅ Fine-grained tool access control
- ✅ Bearer token authentication (optional)

## 🚀 Quick Setup (3 Steps)

### Step 1: Enable MCP in .env

Add or update in `.env`:
```env
MCP_ENABLED=true
MCP_PORT=3001
MCP_HOST=0.0.0.0
MCP_BEARER_TOKEN=         # Leave empty for no auth
```

### Step 2: Start the Server

```bash
npm run dev
```

Watch for the startup message:
```
✅ MCP Server initialized with HTTP Streaming Transport
🔌 MCP Server (HTTP Streaming):
   📨 Messages (SSE):     http://localhost:3001/mcp/messages
   💚 Health Check:       http://localhost:3001/mcp/health
   ℹ️  Server Info:        http://localhost:3001/mcp/info
```

### Step 3: Test It

In another terminal:
```bash
node test-mcp-streaming.js
```

## 📡 Using the MCP Server

### Simple curl Example

**List Available Tools:**
```bash
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

**Call a Tool (Get Data Point Value):**
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

### Response Format (Server-Sent Events)

Responses are sent as SSE:
```
data: {json response}\n\n
```

**Example response:**
```
data: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"dpGet",...}]}}\n\n
```

## 🎯 Configuring Tools

Edit `.env-mcp-tools` to control which tools are available:

**Enable all functions by category:**
```env
DP_FUNCTIONS=true              # All data point functions
DP_MANAGEMENT_FUNCTIONS=true   # Create/Delete/Type functions
CNS_FUNCTIONS=true             # CNS tree functions
ALERT_FUNCTIONS=true           # Alert functions
```

**Disable specific tools:**
```env
DP_SET=false                   # Disable dpSet
ALERT_GET=false                # Disable alertGet
```

## 📚 Available Tools

### Data Point Tools (40+)
- `dpGet`, `dpSet` - Read/write values
- `dpCreate`, `dpDelete` - Create/delete data points
- `dpConnect`, `dpDisconnect` - Monitor changes
- `dpNames`, `dpTypes` - List matching items
- `dpQuery`, `dpGetPeriod` - Historical data
- And 30+ more...

### CNS Tools (30+)
- `cnsAddNode`, `cnsGetChildren` - Tree navigation
- `cnsGetProperty`, `cnsSetProperty` - Property access
- `cnsCreateView`, `cnsDeleteView` - View management
- And 25+ more...

### Alert Tools (6)
- `alertGet`, `alertSet` - Alert attributes
- `alertSetWait`, `alertSetTimed` - Advanced operations
- `alertSetTimedWait`, `alertGetPeriod` - More options

## 🔐 Authentication

### Without Authentication (Default)

Leave `.env` as:
```env
MCP_BEARER_TOKEN=
```

No auth header needed in requests.

### With Bearer Token

Set in `.env`:
```env
MCP_BEARER_TOKEN=my-secret-key-123
```

Include in requests:
```bash
curl -X POST http://localhost:3001/mcp/messages \
  -H "Authorization: Bearer my-secret-key-123" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## 🐛 Troubleshooting

### Server Not Showing MCP Messages

**Check:** Is `MCP_ENABLED=true` in `.env`?

```bash
grep "MCP_ENABLED" .env
```

If missing or false, add to `.env`:
```env
MCP_ENABLED=true
```

### Connection Refused

**Check:** Is server running and port is correct?

```bash
# In new terminal, check if port 3001 is listening
lsof -i :3001

# If not, server not running
npm run dev
```

### Tool "Not Available" Error

**Check:** Is tool enabled in `.env-mcp-tools`?

```bash
grep "DP_GET" .env-mcp-tools
```

If set to false, change to true:
```env
DP_GET=true
```

### "Cannot read property 'handleRequest'"

**Issue:** Old code still loaded

**Solution:**
1. Stop server (Ctrl+C)
2. Clear node cache: `rm -rf node_modules/.cache`
3. Restart: `npm run dev`

## 📖 Full Documentation

See:
- **MCP_HTTP_STREAMING.md** - Complete API reference
- **MCP_SERVER.md** - Old documentation (for reference)
- **.env-mcp-tools** - Tool configuration file

## 🔗 Integration Example

```javascript
// JavaScript client to call MCP tools
async function callTool(toolName, args, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('http://localhost:3001/mcp/messages', {
    method: 'POST',
    headers,
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

  // Parse SSE format: "data: {json}\n\n"
  if (text.startsWith('data: ')) {
    const json = text.replace('data: ', '').trim();
    const result = JSON.parse(json);

    if (result.content?.[0]?.text) {
      return JSON.parse(result.content[0].text);
    } else if (result.error) {
      throw new Error(result.error.message);
    }
  }

  throw new Error('Unexpected response format');
}

// Usage
const value = await callTool('dpGet', { dpeNames: 'MyDP.' });
console.log('Data point value:', value);
```

## ✨ Key Differences from Old Implementation

| Feature | Old | New |
|---------|-----|-----|
| SDK | Custom | Official MCP SDK |
| Transport | Custom HTTP POST | HTTP Streaming (SSE) |
| Specification | Non-standard | MCP 2024-11-05 |
| Response Format | JSON | SSE (data: prefix) |
| Streaming | No | Yes |
| Official Support | No | Yes |

## 🎓 Learning More

- [MCP Specification](https://modelcontextprotocol.io/)
- [SDK GitHub](https://github.com/modelcontextprotocol/python-sdk)
- [WinCC OA Node.js Docs](https://www.winccoa.com/documentation/)

---

**Ready?** Start the server and test:
```bash
npm run dev          # In terminal 1
node test-mcp-streaming.js   # In terminal 2
```
