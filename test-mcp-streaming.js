#!/usr/bin/env node

// Test script for MCP Server with HTTP Streaming (SSE)
// Run with: node test-mcp-streaming.js

const http = require('http');

const MCP_HOST = 'localhost';
const MCP_PORT = parseInt(process.env.MCP_PORT || '3001');
const MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || '';

console.log('🧪 Testing MCP Server with HTTP Streaming Transport\n');
console.log(`Target: http://${MCP_HOST}:${MCP_PORT}`);
console.log(`Bearer Token: ${MCP_BEARER_TOKEN ? 'SET' : 'NOT SET'}\n`);

/**
 * Make a request to the MCP server
 */
function mcpRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: MCP_HOST,
      port: MCP_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (MCP_BEARER_TOKEN) {
      options.headers['Authorization'] = `Bearer ${MCP_BEARER_TOKEN}`;
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            rawBody: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function test() {
  try {
    // Test 1: Health check
    console.log('1️⃣  Testing /mcp/health...');
    const healthRes = await mcpRequest('GET', '/mcp/health', null);
    console.log(`   Status: ${healthRes.status}`);
    console.log(`   Response:`, healthRes.body);
    console.log();

    // Test 2: Server info
    console.log('2️⃣  Testing /mcp/info...');
    const infoRes = await mcpRequest('GET', '/mcp/info', null);
    console.log(`   Status: ${infoRes.status}`);
    console.log(`   Response:`, infoRes.body);
    console.log();

    // Test 3: List tools (tools/list request)
    console.log('3️⃣  Testing MCP tools/list via /mcp/messages (SSE)...');
    const listRes = await mcpRequest('POST', '/mcp/messages', {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1
    });
    console.log(`   Status: ${listRes.status}`);
    console.log(`   Response Type: ${listRes.headers['content-type']}`);

    if (listRes.rawBody && listRes.rawBody.startsWith('data:')) {
      console.log('   ✅ Received SSE format response');
      const dataLine = listRes.rawBody.replace('data: ', '').trim();
      try {
        const data = JSON.parse(dataLine);
        console.log(`   Tools found: ${data.result?.tools?.length || 0}`);
        if (data.result?.tools?.length > 0) {
          console.log(`   First 3 tools:`, data.result.tools.slice(0, 3).map(t => t.name));
        }
      } catch (e) {
        console.log('   Response:', listRes.rawBody.substring(0, 200));
      }
    } else {
      console.log('   Response:', JSON.stringify(listRes.body, null, 2).substring(0, 300));
    }
    console.log();

    // Test 4: Call a tool (dpNames)
    console.log('4️⃣  Testing MCP tool call (dpNames) via /mcp/messages...');
    const callRes = await mcpRequest('POST', '/mcp/messages', {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'dpNames',
        arguments: {
          dpPattern: '*'
        }
      },
      id: 2
    });
    console.log(`   Status: ${callRes.status}`);

    if (callRes.rawBody && callRes.rawBody.startsWith('data:')) {
      console.log('   ✅ Received SSE format response');
      const dataLine = callRes.rawBody.replace('data: ', '').trim();
      try {
        const data = JSON.parse(dataLine);
        console.log(`   Response contains: ${data.content?.length || 0} content blocks`);
        if (data.content?.[0]?.text) {
          const preview = data.content[0].text.substring(0, 100);
          console.log(`   Result preview: ${preview}...`);
        }
      } catch (e) {
        console.log('   Error parsing response:', e.message);
        console.log('   Raw:', callRes.rawBody.substring(0, 200));
      }
    } else {
      console.log('   Response:', JSON.stringify(callRes.body, null, 2).substring(0, 300));
    }
    console.log();

    console.log('✅ MCP Server tests completed!');
    console.log('\n📝 Note: MCP uses HTTP Streaming (SSE) for responses');
    console.log('   Responses are sent as: data: {json}\n\n');

  } catch (error) {
    console.error('❌ Error testing MCP Server:', error.message);
    console.error('\nPossible issues:');
    console.error('1. MCP Server is not running');
    console.error('2. Port is incorrect (check MCP_PORT in .env, defaults to 3001)');
    console.error('3. MCP_ENABLED might not be true');
    console.error('4. Check server logs for startup errors');
    console.error('\nMake sure to:');
    console.error('1. Set MCP_ENABLED=true in .env');
    console.error('2. Start server: npm run dev');
    console.error('3. Wait for startup messages');
    console.error('4. Run this test: node test-mcp-streaming.js');
  }
}

test();
