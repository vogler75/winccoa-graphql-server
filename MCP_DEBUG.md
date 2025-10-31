# MCP Server Debugging Guide

## Quick Diagnostics

### 1. Check if MCP is Enabled

```bash
grep "MCP_ENABLED" .env
```

**Must show:** `MCP_ENABLED=true`

If it shows `MCP_ENABLED=false` or is missing, add this to `.env`:
```env
MCP_ENABLED=true
MCP_PORT=3001
MCP_HOST=0.0.0.0
MCP_BEARER_TOKEN=          # Leave empty for no auth
```

### 2. Check Your Ports

```bash
grep "GRAPHQL_PORT\|MCP_PORT" .env
```

**Important:** MCP server runs on a SEPARATE port from GraphQL
- GraphQL: `GRAPHQL_PORT=4000` (default)
- MCP: `MCP_PORT=3001` (default)

So MCP endpoints are at:
- `http://localhost:3001/mcp/messages` (POST - main endpoint)
- `http://localhost:3001/mcp/health` (GET - health check)
- `http://localhost:3001/mcp/info` (GET - server info)

### 3. Check Server Startup Logs

When you start the server with `npm run dev`, look for:

```
🔌 MCP Server Configuration:
   Enabled: ✅ Yes
   Host: 0.0.0.0:3001
   Bearer Token: ❌ Disabled (no authentication)
   Tools Config: /path/to/.env-mcp-tools
```

And later (after GraphQL starts):

```
🔌 MCP Server (HTTP Streaming):
   📨 Messages (SSE):     http://hostname:3001/mcp/messages
   💚 Health Check:       http://hostname:3001/mcp/health
   ℹ️  Server Info:        http://hostname:3001/mcp/info
```

**If you don't see these messages**, then MCP is not initializing. Check:
1. Is `MCP_ENABLED=true` in `.env`?
2. Is `MCP_PORT` set correctly?
3. Did you restart the server?
4. Are there any error messages in the logs?

### 4. Run the Test Script

```bash
node test-mcp-streaming.js
```

This will test all MCP HTTP Streaming endpoints and show you:
- ✅ If server is responding
- ✅ How many tools are available
- ✅ Error messages if something is wrong

### 5. Manual Test with curl

```bash
# Test health endpoint (should always work)
curl http://localhost:3001/mcp/health

# Test server info
curl http://localhost:3001/mcp/info

# Test tools/list via SSE (HTTP Streaming)
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Test with Bearer token (if configured)
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

**Note:** Responses are in SSE format, starting with `data: ` prefix

## Common Issues & Solutions

### Issue: "Cannot POST /mcp/messages" or "404 Not Found"

**Cause:** MCP server is not enabled, not initialized, or wrong port

**Solution:**
1. Check `.env` has `MCP_ENABLED=true`
2. Check `.env` has `MCP_PORT=3001` (or your configured port)
3. Restart server: `npm run dev`
4. Check startup logs for MCP initialization messages
5. Verify you're using the correct port (not GraphQL port)

**Debugging Steps:**
```bash
# 1. Check config
grep "^MCP_" .env

# 2. Start server and look for MCP messages
npm run dev 2>&1 | grep -i "mcp\|listening"

# 3. In another terminal, test health first (should work)
curl http://localhost:3001/mcp/health

# 4. Then test POST endpoint
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Issue: "Connection refused" or "ECONNREFUSED"

**Cause:** Server is not running or wrong port

**Solution:**
1. Start server: `npm run dev`
2. Check `MCP_PORT` in `.env` (default is 3001)
3. Verify no other process is using that port:
   ```bash
   lsof -i :3001
   ```
4. Wait a few seconds for server to fully start

### Issue: No response from POST /mcp/messages endpoint

**Cause:** HTTP request not reaching the handler

**Solution:**
1. Enable debug logging in `.env`:
   ```env
   LOG_LEVEL=debug
   ```
2. Restart server and watch for detailed logs
3. Look for: `🔵 MCP: POST /mcp/messages received`
4. If not present, POST endpoint is not being called
5. Check if firewall is blocking requests
6. Test with simpler requests first (health endpoint)

### Issue: "Unauthorized" error with Bearer Token

**Cause:** Bearer token doesn't match or not sent correctly

**Solution:**
1. If you don't want authentication, ensure `.env` has: `MCP_BEARER_TOKEN=` (empty)
2. If you want authentication, send header: `Authorization: Bearer your-token-here`
3. Make sure token in header matches `MCP_BEARER_TOKEN` in `.env`
4. Verify header is sent correctly:
   ```bash
   curl -X POST http://localhost:3001/mcp/messages \
     -H "Authorization: Bearer my-secret-token" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

### Issue: "Tool not found" or "Tool not available"

**Cause:** Tool is disabled in `.env-mcp-tools`

**Solution:**
1. Check `.env-mcp-tools`
2. Ensure tool is enabled: `DP_GET=true` (for example)
3. Or enable entire category: `DP_FUNCTIONS=true`
4. Restart server
5. Call `/mcp/messages` with `tools/list` to see enabled tools:
   ```bash
   curl -X POST http://localhost:3001/mcp/messages \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

### Issue: WinCC OA Error (e.g., "DPE does not exist")

**Cause:** Data point element doesn't exist in your system

**Solution:**
1. Verify DPE name is correct: Call `dpNames` tool with pattern to list matching DPEs
   ```bash
   curl -X POST http://localhost:3001/mcp/messages \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/call",
       "params": {
         "name": "dpNames",
         "arguments": {"dpPattern": "*Example*"}
       },
       "id": 1
     }'
   ```
2. Check user permissions in WinCC OA
3. Ensure DPE is in current project

## Checking .env-mcp-tools

All functions are organized by category:

```env
# To enable all DP functions:
DP_FUNCTIONS=true

# To disable specific function:
DP_SET=false

# To disable entire category:
ALERT_FUNCTIONS=false
```

Run POST to `/mcp/messages` with `tools/list` method to see which tools are enabled:
```bash
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Getting More Debug Info

### Enable Debug Logging

Add to `.env`:
```env
LOG_LEVEL=debug
```

Restart server and look for MCP-specific logs:
```
🔵 MCP: POST /mcp/messages received
🟢 MCP: Sending response for request 1
MCP: Calling handlers.listTools()
MCP: listTools completed, returning 80 tools
```

If you don't see `🔵 MCP: POST /mcp/messages received`, the request isn't reaching the handler.

### Check Tool Registry Loading

Look for in startup logs:
```
🔧 Initializing MCP Tool Loader...
📋 MCP Tools Registry Loaded
   ✅ Enabled tools: 75
   ❌ Disabled tools: 10
```

If "Enabled tools" is 0, then `.env-mcp-tools` file might be:
- Missing
- Not readable
- All tools set to false

**Check the file exists:**
```bash
ls -la /path/to/.env-mcp-tools
head -20 .env-mcp-tools
```

## Verifying Installation

After server starts, verify (assuming MCP_PORT=3001):

1. **Check health endpoint:**
   ```bash
   curl http://localhost:3001/mcp/health
   # Should return: {"status":"healthy","service":"mcp-server"}
   ```

2. **Check server info:**
   ```bash
   curl http://localhost:3001/mcp/info
   # Should return: {"name":"WinCC OA MCP Server","version":"1.0.0","protocol":"MCP","transport":"HTTP-SSE"}
   ```

3. **Check tools are loaded (SSE format):**
   ```bash
   curl -X POST http://localhost:3001/mcp/messages \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   # Should return: data: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
   ```

4. **Check specific tool execution:**
   ```bash
   curl -X POST http://localhost:3001/mcp/messages \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc":"2.0",
       "method":"tools/call",
       "params":{
         "name":"dpNames",
         "arguments":{"dpPattern":"*"}
       },
       "id":2
     }'
   # Should return: data: {"jsonrpc":"2.0","id":2,"content":[{"type":"text","text":"..."}]}
   ```

## Detailed Debugging Checklist

If the POST /mcp/messages endpoint isn't responding:

```bash
# 1. Verify MCP is enabled
grep "MCP_ENABLED" .env
# Should show: MCP_ENABLED=true

# 2. Check MCP port
grep "MCP_PORT" .env
# Should show something like: MCP_PORT=3001

# 3. Start server and capture all output
npm run dev > /tmp/server.log 2>&1 &

# 4. Wait for startup
sleep 5

# 5. Search for MCP initialization in logs
grep -i "mcp" /tmp/server.log | head -20

# 6. Look specifically for these messages:
grep "HTTP Transport listening\|MCP Server initialized" /tmp/server.log

# 7. Test health endpoint (should always work)
curl http://localhost:3001/mcp/health -v

# 8. Test POST endpoint with debug output
curl -X POST http://localhost:3001/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' -v

# 9. If still no response, enable debug logging and restart:
# - Edit .env and add: LOG_LEVEL=debug
# - Restart: npm run dev
# - Look for: "🔵 MCP: POST /mcp/messages received"
```

## If Still Having Issues

1. **Verify the HTTP server is bound to the port:**
   ```bash
   # Check if port 3001 is listening
   lsof -i :3001
   # Or on non-macOS: netstat -tulpn | grep 3001
   ```

2. **Verify firewall isn't blocking:**
   - If testing remotely, check firewall rules
   - MCP port (3001 by default) must be accessible

3. **Check if there's a port conflict:**
   ```bash
   # Kill any existing process on the port
   lsof -ti :3001 | xargs kill -9
   # Then restart server
   ```

4. **Collect full server logs:**
   ```bash
   npm run dev 2>&1 | tee /tmp/mcp-debug.log
   # Let it run for 10 seconds, then Ctrl+C
   # Share the entire /tmp/mcp-debug.log
   ```

5. **Test without WinCC OA:**
   - The HTTP layer should respond even if WinCC OA functions fail
   - If no response at all, issue is with HTTP server setup

## Integration Points

Key files involved in MCP HTTP Streaming setup:

1. **`index.js` (lines 797-820):** MCP server initialization
2. **`mcp/mcp-http-server.js`:** HTTP streaming implementation with SSE
   - `createMCPServer()` - Creates MCP server with handlers
   - `createHTTPTransport()` - Creates HTTP server and Express routes
3. **`mcp/tool-loader.js`:** Loads enabled tools from `.env-mcp-tools`
4. **`mcp/tools-registry.js`:** Defines all 80+ available tools
5. **`.env-mcp-tools`:** Configuration for tool access control
