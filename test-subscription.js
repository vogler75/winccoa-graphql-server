const WebSocket = require('ws');
const { createClient } = require('graphql-ws');

const WS_URL = 'ws://localhost:4000/graphql';

async function testSubscriptionWithGraphQLWS(token) {
  console.log('Testing subscription with graphql-ws client...');

  const client = createClient({
    url: WS_URL,
    connectionParams: {
      Authorization: `Bearer ${token}`
    },
    on: {
      connected: () => {
        console.log('Connected to WebSocket server');
      },
      error: (error) => {
        console.error('Connection error:', error);
      },
      closed: () => {
        console.log('Connection closed');
      }
    }
  });

  // Subscribe to data points
  const subscription = client.subscribe(
    {
      query: `
        subscription DpConnectSubscription {
          dpConnect(dpeNames: ["System1:ExampleDp.value"], answer: true) {
            dpeNames
            values
            type
            error
          }
        }
      `,
    },
    {
      next: (data) => {
        console.log('Received update:', JSON.stringify(data, null, 2));
      },
      error: (error) => {
        console.error('Subscription error:', error);
      },
      complete: () => {
        console.log('Subscription completed');
      }
    }
  );

  // Keep the subscription alive for 30 seconds
  setTimeout(() => {
    console.log('Unsubscribing...');
    subscription();
    client.dispose();
  }, 30000);
}

// First login to get token
const fetch = require('node-fetch');

async function getToken() {
  const response = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation {
          login(username: "testuser", password: "testpass") {
            token
          }
        }
      `
    })
  });
  
  const result = await response.json();
  return result.data?.login?.token;
}

// Run the test
(async () => {
  try {
    console.log('Getting authentication token...');
    const token = await getToken();
    
    if (!token) {
      console.error('Failed to get token');
      return;
    }
    
    console.log('Token obtained successfully');
    await testSubscriptionWithGraphQLWS(token);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
})();