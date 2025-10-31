#!/usr/bin/env node

// Test script for MCP Server
// Run with: node test-mcp.js

const http = require('http');

const MCP_HOST = 'localhost';
const MCP_PORT = 3000; // Change if your GraphQL port is different
const MCP_BEARER_TOKEN = ''; // Set if you configured a token

function makeRequest(method, path, data) {
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
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing MCP Server\n');
  console.log(`Target: http://${MCP_HOST}:${MCP_PORT}`);
  console.log(`Bearer Token: ${MCP_BEARER_TOKEN ? 'SET' : 'NOT SET'}\n`);

  try {
    // Test 1: Initialize
    console.log('1️⃣  Testing /mcp/initialize...');
    const initRes = await makeRequest('POST', '/mcp/initialize', {
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1
    });
    console.log(`   Status: ${initRes.status}`);
    console.log(`   Response:`, JSON.stringify(initRes.body, null, 2));
    console.log();

    // Test 2: List tools
    console.log('2️⃣  Testing /mcp/tools/list...');
    const listRes = await makeRequest('POST', '/mcp/tools/list', {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 2
    });
    console.log(`   Status: ${listRes.status}`);
    if (listRes.body.result) {
      console.log(`   Available tools: ${listRes.body.result.tools.length}`);
      console.log(`   First 5 tools:`, listRes.body.result.tools.slice(0, 5).map(t => t.name));
    } else {
      console.log(`   Error:`, listRes.body.error);
    }
    console.log();

    // Test 3: Get server info
    console.log('3️⃣  Testing /mcp/info...');
    const infoRes = await makeRequest('GET', '/mcp/info', null);
    console.log(`   Status: ${infoRes.status}`);
    console.log(`   Response:`, JSON.stringify(infoRes.body, null, 2));
    console.log();

    console.log('✅ MCP Server tests completed!');

  } catch (error) {
    console.error('❌ Error testing MCP Server:', error.message);
    console.error('\nPossible issues:');
    console.error('1. Server is not running');
    console.error('2. Port is incorrect (check GRAPHQL_PORT in .env)');
    console.error('3. MCP_ENABLED is not set to true');
    console.error('4. Check server logs for startup messages');
  }
}

test();
