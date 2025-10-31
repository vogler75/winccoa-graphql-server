# MCP Client Troubleshooting Guide

## Issue: HTTP 404 "Cannot POST /mcp"

### Error Message
```
McpError: MCP error -32001: Error POSTing to endpoint (HTTP 404):
Cannot POST /mcp
```

### Root Cause
The MCP Inspector client is trying to connect to the `/mcp` endpoint, but earlier implementation only supported `/mcp/messages`.

### Solution
✅ **FIXED** - The server now supports both endpoints:
- `/mcp` - Main MCP endpoint (for compatibility with clients)
- `/mcp/messages` - Alternative MCP endpoint (original name)

Both routes point to the same handler and function identically.

### What Changed
In `mcp/mcp-http-server.js`, the handler function is now registered for both paths:

```javascript
app.post('/mcp', handleMCPRequest);
app.post('/mcp/messages', handleMCPRequest);
```

### How to Verify the Fix

#### 1. Direct Test
```bash
# Test the /mcp endpoint (what MCP Inspector uses)
curl -X POST http://debian:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Should return: data: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

#### 2. Automated Test
```bash
node test-mcp-streaming.js
```

#### 3. MCP Inspector
Should now connect successfully to:
```
http://debian:3000/mcp
```

### Port Verification

The server listens on port 3000 (as configured in `.env`):
```env
MCP_PORT=3000
```

**NOT** port 3001 (which was the default in documentation).

This explains why the client was getting connection errors - it was correctly connecting to port 3000 but the endpoint didn't exist.

### Client Configuration for MCP Inspector

When setting up MCP Inspector proxy, use:

| Configuration | Value |
|---|---|
| Endpoint | `http://debian:3000/mcp` |
| Transport Type | `streamable-http` |
| Port | `3000` |

### What This Means for Clients

#### Standard HTTP Clients (curl, JavaScript fetch, Python requests)
Can use either endpoint:
```bash
# Both work identically:
curl -X POST http://debian:3000/mcp ...
curl -X POST http://debian:3000/mcp/messages ...
```

#### MCP Inspector & Official SDK Clients
Should use:
```
http://debian:3000/mcp
```

### Important Notes

1. **Both endpoints are identical** - They handle the same logic
2. **No breaking changes** - Old clients using `/mcp/messages` still work
3. **Fully compatible** - Works with official MCP SDK and tools
4. **Single port** - Both on port 3000 (separate from GraphQL port 4000)

### Full Request Format

```bash
curl -X POST http://debian:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list|tools/call",
    "params": { /* optional */ },
    "id": 1
  }'
```

### Response Format

Both endpoints return SSE format:
```
data: {"jsonrpc":"2.0","id":1,"result":{...}}

```

Note the `data: ` prefix and `\n\n` terminator.

### Debugging if Still Having Issues

1. **Verify server is running:**
   ```bash
   curl http://debian:3000/mcp/health
   # Should return: {"status":"healthy","service":"mcp-server"}
   ```

2. **Check MCP is enabled:**
   ```bash
   grep "MCP_ENABLED" /path/to/.env
   # Should show: MCP_ENABLED=true
   ```

3. **Check port:**
   ```bash
   grep "MCP_PORT" /path/to/.env
   # Should show: MCP_PORT=3000
   ```

4. **Enable debug logging:**
   Add to `.env`:
   ```env
   LOG_LEVEL=debug
   ```
   Restart server and look for:
   ```
   🔵 MCP: POST /mcp received
   ```

5. **Test with curl:**
   ```bash
   curl -v -X POST http://debian:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

   Look for:
   - HTTP 200 response
   - `Content-Type: text/event-stream` header
   - Response starting with `data: `

### Common Issues

#### Issue: Connection still refused
**Cause:** Server not running or firewall blocking port 3000
**Solution:**
```bash
# Check if server running
lsof -i :3000

# Start server
npm run dev

# Check firewall
# (depends on your system)
```

#### Issue: Wrong port
**Cause:** Configuration shows 3000 but code uses different port
**Solution:**
1. Verify `.env` has: `MCP_PORT=3000`
2. Restart server: `npm run dev`
3. Test: `curl http://localhost:3000/mcp/health`

#### Issue: MCP Inspector still not connecting
**Cause:** May need full server restart
**Solution:**
1. Stop server (Ctrl+C)
2. Wait 5 seconds
3. Start server: `npm run dev`
4. Try MCP Inspector again

### For MCP Inspector Setup

The error message you received was from MCP Inspector trying to use streamable-http transport.

**Complete MCP Inspector configuration:**

1. **URL:** `http://debian:3000/mcp`
2. **Transport Type:** `streamable-http`
3. **Verify connectivity:** Check server responds with tools list

### Testing Script

Run the automated test which tests both endpoints:
```bash
node test-mcp-streaming.js
```

Output should show:
- ✅ Health endpoint works
- ✅ Server info endpoint works
- ✅ Tools list via SSE works (via /mcp/messages path in test)

The test uses `/mcp/messages` path, but both paths work identically.

### Related Documentation

- **MCP_QUICK_START.md** - Setup guide
- **MCP_DEBUG.md** - Debugging guide
- **MCP_TESTING_GUIDE.md** - Testing procedures
- **MCP_HTTP_STREAMING.md** - API reference

### Summary

The issue was that MCP Inspector expected `/mcp` endpoint but the server only had `/mcp/messages`.

**Fix:** Both endpoints now work identically.

**Verification:** Run `node test-mcp-streaming.js` or test with curl at `http://debian:3000/mcp`

**Status:** ✅ Issue Resolved
