# MCP Testing Guide

## Overview

This guide covers how to test the MCP Server implementation with HTTP Streaming (SSE) transport.

## Prerequisites

1. MCP Server is configured in `.env`:
   ```env
   MCP_ENABLED=true
   MCP_PORT=3001
   MCP_HOST=0.0.0.0
   MCP_BEARER_TOKEN=     # (optional)
   ```

2. Server is running:
   ```bash
   npm run dev
   ```

3. You have the test tools available:
   - `curl` command-line tool
   - `node` with test-mcp-streaming.js script
   - Or any HTTP client

## Testing Phases

### Phase 1: Connectivity (Pre-requisite)

Verify the HTTP server is running and responding:

```bash
# Test 1: Health endpoint (always works)
curl http://localhost:3001/mcp/health

# Expected output:
# {"status":"healthy","service":"mcp-server"}

# Test 2: Server info endpoint
curl http://localhost:3001/mcp/info

# Expected output:
# {"name":"WinCC OA MCP Server","version":"1.0.0","protocol":"MCP","transport":"HTTP-SSE"}
```

**If these fail:**
- Server is not running or port is wrong
- Check: `npm run dev` is executed
- Check: `grep MCP_PORT .env` shows correct port
- Check: No firewall blocking the port

### Phase 2: MCP Protocol (SSE Streaming)

Test that the MCP HTTP Streaming (SSE) transport is working:

```bash
# Test 1: tools/list method
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Expected output format:
# data: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
#
# The "data: " prefix indicates SSE format is correct
```

**What to check:**
- Response starts with `data: ` (SSE format indicator)
- Response is valid JSON after `data: `
- `result.tools` array contains tool objects
- Each tool has: `name`, `description`, `inputSchema`

**If response shows error:**
- Check server logs for: `🔵 MCP: POST /mcp/messages received`
- If not present, request isn't reaching the handler
- Check firewall or routing

### Phase 3: Tool Availability

Verify that tools are loaded and accessible:

```bash
# Run automated test
node test-mcp-streaming.js

# Or manually get tools count:
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  grep -o '"name":"' | wc -l

# This shows how many tools are available
```

**Interpretation:**
- 0 tools: Check `.env-mcp-tools` - all tools may be disabled
- 1-20 tools: Some categories may be disabled
- 50+ tools: Normal (all categories enabled)
- 80 tools: Maximum (all categories + all individual tools enabled)

### Phase 4: Tool Configuration

Verify tools are correctly enabled/disabled:

```bash
# Check current tool configuration
grep "DP_FUNCTIONS\|DP_MANAGEMENT\|CNS_FUNCTIONS\|ALERT_FUNCTIONS" .env-mcp-tools | head -10

# Check which DP functions are enabled
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  grep -o '"name":"dp[^"]*"' | head -20
```

**To enable/disable tools:**
1. Edit `.env-mcp-tools`
2. Find the tool or category you want to change
3. Set to `true` or `false`
4. Restart server: `npm run dev`
5. Re-run test to verify

### Phase 5: Authentication (Optional)

If Bearer token authentication is enabled:

```bash
# Get your token from .env
grep MCP_BEARER_TOKEN .env

# Test WITH correct token
curl -X POST http://localhost:3001/mcp/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Test WITH wrong token (should fail)
curl -X POST http://localhost:3001/mcp/messages \
  -H "Authorization: Bearer WRONG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Test WITHOUT token when required (should fail)
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

**Expected behavior:**
- With correct token: Returns tools list
- With wrong token: Returns authentication error
- Without token (when required): Returns authentication error
- Without token (when disabled): Returns tools list

### Phase 6: Tool Execution

Test that tools actually execute:

```bash
# Simple tool: dpNames (lists data points)
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"dpNames",
      "arguments":{"dpPattern":"*"}
    },
    "id":1
  }'

# Expected output format:
# data: {"jsonrpc":"2.0","id":1,"content":[{"type":"text","text":"..."}],"isError":false}
```

**What to check:**
- Response has `content` array
- `content[0].type` is `"text"`
- `content[0].text` contains the tool output (JSON-encoded)
- `isError` is `false` for success

### Phase 7: WinCC OA Integration

Test actual WinCC OA function calls:

```bash
# Example: Get a data point value
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"dpGet",
      "arguments":{"dpeNames":"ExampleDP_Arg1."}
    },
    "id":1
  }'

# If successful:
# Returns the data point value in SSE format

# If WinCC OA error:
# Returns error in SSE format: "DPE does not exist", "Access denied", etc.
```

**Troubleshooting WinCC OA errors:**
1. Verify DPE name is correct: Use `dpNames` to list available DPEs
2. Check user permissions in WinCC OA
3. Ensure DPE is in current project
4. Check WinCC OA system is running

## Automated Testing

Run the provided test script:

```bash
node test-mcp-streaming.js
```

**This tests:**
1. ✅ `/mcp/health` endpoint
2. ✅ `/mcp/info` endpoint
3. ✅ `/mcp/messages` with `tools/list`
4. ✅ `/mcp/messages` with tool call (`dpNames`)

**Output example:**
```
🧪 Testing MCP Server with HTTP Streaming Transport

Target: http://localhost:3001
Bearer Token: NOT SET

1️⃣  Testing /mcp/health...
   Status: 200
   Response: { status: 'healthy', service: 'mcp-server' }

2️⃣  Testing /mcp/info...
   Status: 200
   Response: { name: 'WinCC OA MCP Server', version: '1.0.0', ... }

3️⃣  Testing MCP tools/list via /mcp/messages (SSE)...
   Status: 200
   Response Type: text/event-stream
   ✅ Received SSE format response
   Tools found: 80
   First 3 tools: [ 'dpGet', 'dpSet', 'dpCreate' ]

4️⃣  Testing MCP tool call (dpNames) via /mcp/messages...
   Status: 200
   ✅ Received SSE format response
   Response contains: 1 content blocks
   Result preview: ["dp1", "dp2", "dp3"]...

✅ MCP Server tests completed!
```

## Debugging Failed Tests

If tests fail, follow this checklist:

### Test Fails at Phase 1 (Health)
- **Issue:** Server not responding
- **Check:**
  - Is server running? `npm run dev`
  - Is port correct? `grep MCP_PORT .env`
  - Is port blocked? `lsof -i :3001`

### Test Fails at Phase 2 (SSE Format)
- **Issue:** Response format wrong
- **Check:**
  - Enable debug logging: `LOG_LEVEL=debug`
  - Restart server
  - Look for: `🔵 MCP: POST /mcp/messages received`
  - Look for: `🟢 MCP: Sending response`

### Test Fails at Phase 3 (Tool Count)
- **Issue:** No tools available
- **Check:**
  - `cat .env-mcp-tools | head`
  - Are categories enabled? `DP_FUNCTIONS=true`?
  - Were changes applied? (Server restart required)

### Test Fails at Phase 6 (Tool Execution)
- **Issue:** Tool not executing or returning errors
- **Check:**
  - Is tool enabled? Check `.env-mcp-tools`
  - Is WinCC OA running?
  - Check server logs for tool execution errors
  - Verify tool name is correct

### Test Fails at Phase 7 (WinCC OA)
- **Issue:** WinCC OA returns errors
- **Check:**
  - DPE name correct? Use `dpNames` to verify
  - User has permissions in WinCC OA?
  - DPE exists in current project?
  - WinCC OA system is operational?

## Performance Testing

Test server load and response times:

```bash
# Single request
time curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' > /dev/null

# Multiple sequential requests
for i in {1..10}; do
  curl -s -X POST http://localhost:3001/mcp/messages \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/list\",\"id\":$i}" > /dev/null
  echo "Request $i completed"
done

# Parallel requests (using GNU parallel or xargs)
seq 1 20 | xargs -P 5 -I {} curl -s -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' > /dev/null
```

## Integration Testing

Test with actual client applications:

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3001/mcp/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 1
  })
});
const text = await response.text();
console.log(text); // Should start with "data: "
```

### Python
```python
import requests
import json

response = requests.post(
    'http://localhost:3001/mcp/messages',
    json={
        'jsonrpc': '2.0',
        'method': 'tools/list',
        'id': 1
    },
    headers={'Content-Type': 'application/json'}
)
print(response.text)  # Should start with "data: "
```

### Curl (Shell)
```bash
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Success Criteria

✅ **MCP Server is working if:**
1. Health endpoint responds with `{"status":"healthy",...}`
2. `/mcp/messages` endpoint responds with SSE format (`data: {...}`)
3. `tools/list` returns array of tool objects
4. `tools/call` executes tools and returns results
5. Tool count > 0 (tools are loaded)
6. No errors in server logs

## Testing Checklist

- [ ] Phase 1: Health endpoint works
- [ ] Phase 2: SSE streaming format correct
- [ ] Phase 3: Tools are loaded (count > 0)
- [ ] Phase 4: Can enable/disable tools
- [ ] Phase 5: Authentication works (if enabled)
- [ ] Phase 6: Tools execute and return data
- [ ] Phase 7: WinCC OA functions work
- [ ] Automated test passes: `node test-mcp-streaming.js`
- [ ] Debug logging works: `LOG_LEVEL=debug`
- [ ] No errors in server logs

## What's Next After Testing

1. **Integrate into applications** - Use the `/mcp/messages` endpoint
2. **Configure production** - Set secure bearer token if needed
3. **Deploy** - Copy configuration to production server
4. **Monitor** - Watch server logs for errors
5. **Optimize** - Adjust tool access based on usage

## Need Help?

If tests fail:
1. Read `MCP_DEBUG.md` for detailed troubleshooting
2. Check server logs with `LOG_LEVEL=debug`
3. Verify configuration in `.env` and `.env-mcp-tools`
4. Run `test-mcp-streaming.js` to isolate issues
5. Consult `MCP_QUICK_START.md` for setup verification
