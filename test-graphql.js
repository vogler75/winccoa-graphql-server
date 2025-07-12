const fetch = require('node-fetch');
const WebSocket = require('ws');

const GRAPHQL_URL = 'http://localhost:4000/graphql';
const WS_URL = 'ws://localhost:4000/graphql';

async function testLogin() {
  console.log('Testing login...');
  
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation {
          login(username: "testuser", password: "testpass") {
            token
            expiresAt
          }
        }
      `
    })
  });
  
  const result = await response.json();
  
  if (result.data && result.data.login) {
    console.log('Login successful!');
    console.log('Token:', result.data.login.token.substring(0, 20) + '...');
    console.log('Expires at:', result.data.login.expiresAt);
    return result.data.login.token;
  } else {
    console.error('Login failed:', result);
    return null;
  }
}

async function testQuery(token) {
  console.log('\nTesting authenticated query...');
  
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: `
        query {
          dpTypes
        }
      `
    })
  });
  
  const result = await response.json();
  
  if (result.data) {
    console.log('Query successful!');
    console.log('Data point types:', result.data.dpTypes);
  } else {
    console.error('Query failed:', result);
  }
}

async function testSubscription(token) {
  console.log('\nTesting WebSocket subscription...');
  
  const ws = new WebSocket(WS_URL, 'graphql-transport-ws');
  
  ws.on('open', () => {
    console.log('WebSocket connected');
    
    // Send connection init
    ws.send(JSON.stringify({
      type: 'connection_init',
      payload: {
        Authorization: `Bearer ${token}`
      }
    }));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Received message:', message);
    
    if (message.type === 'connection_ack') {
      console.log('Connection acknowledged, sending subscription...');
      
      // Send subscription
      ws.send(JSON.stringify({
        id: '1',
        type: 'subscribe',
        payload: {
          query: `
            subscription {
              dpConnect(dpeNames: ["System1:ExampleDp.value"], answer: true) {
                dpeNames
                values
                type
                error
              }
            }
          `
        }
      }));
      
      // Close after 5 seconds
      setTimeout(() => {
        ws.close();
      }, 5000);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('WebSocket closed');
  });
}

// Run tests
async function runTests() {
  try {
    // Test login
    const token = await testLogin();
    
    if (token) {
      // Test authenticated query
      await testQuery(token);
      
      // Test subscription
      await testSubscription(token);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Check if server is running
fetch('http://localhost:4000/health')
  .then(response => response.json())
  .then(data => {
    console.log('Server health:', data);
    runTests();
  })
  .catch(error => {
    console.error('Server not running:', error.message);
    console.log('Please start the server first with: npm start');
  });