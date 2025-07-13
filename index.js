// require WinCC OA interface
const { WinccoaManager } = require('winccoa-manager');
const winccoa = new WinccoaManager();

// Import required modules
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const express = require('express');
const http = require('http');
const { readFileSync } = require('fs');
const { join } = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bodyParser = require('body-parser');

// Configuration
const PORT = process.env.GRAPHQL_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY_MS = 3600000; // 1 hour
const DISABLE_AUTH = process.env.DISABLE_AUTH == 'true' || process.env.DISABLE_AUTH == '1' || process.env.DISABLE_AUTH == 'yes';

console.log(`Starting GraphQL server on port ${PORT} with DISABLE_AUTH=${DISABLE_AUTH}`);

// In-memory token store (replace with Redis or database in production)
const tokenStore = new Map();

// Logger setup
const logger = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  debug: (...args) => console.log('[DEBUG]', new Date().toISOString(), ...args)
};

// Load GraphQL schema
const typeDefs = readFileSync(join(__dirname, 'winccoa_graphql_schema.gql'), 'utf-8');

// Element type mapping from WinCC OA numeric values to GraphQL enum
const ElementTypeMap = {
  0: 'BOOL',
  1: 'UINT8',
  2: 'INT32',
  3: 'INT64',
  4: 'FLOAT',
  5: 'DOUBLE',
  6: 'BIT',
  7: 'BIT32',
  8: 'BIT64',
  9: 'STRING',
  10: 'TIME',
  11: 'DPID',
  12: 'LANGSTRING',
  13: 'BLOB',
  14: 'MIXED',
  15: 'DYN_BOOL',
  16: 'DYN_UINT8',
  17: 'DYN_INT32',
  18: 'DYN_INT64',
  19: 'DYN_FLOAT',
  20: 'DYN_DOUBLE',
  21: 'DYN_BIT',
  22: 'DYN_BIT32',
  23: 'DYN_BIT64',
  24: 'DYN_STRING',
  25: 'DYN_TIME',
  26: 'DYN_DPID',
  27: 'DYN_LANGSTRING',
  28: 'DYN_BLOB'
};

// WinCC OA Control type mapping with correct IDs from WinccoaCtrlType documentation
const CtrlTypeMap = {
  196608: 'TIME_VAR',
  262144: 'BOOL_VAR',
  327680: 'INT_VAR',
  393216: 'UINT_VAR',
  458752: 'FLOAT_VAR',
  524288: 'STRING_VAR',
  589824: 'BIT32_VAR',
  655360: 'CHAR_VAR',
  851968: 'DYN_TIME_VAR',
  917504: 'DYN_BOOL_VAR',
  983040: 'DYN_INT_VAR',
  1048576: 'DYN_UINT_VAR',
  1114112: 'DYN_FLOAT_VAR',
  1179648: 'DYN_STRING_VAR',
  1245184: 'DYN_BIT32_VAR',
  1310720: 'DYN_CHAR_VAR',
  1703936: 'DYN_DYN_TIME_VAR',
  1769472: 'DYN_DYN_BOOL_VAR',
  1835008: 'DYN_DYN_INT_VAR',
  1900544: 'DYN_DYN_UINT_VAR',
  1966080: 'DYN_DYN_FLOAT_VAR',
  2031616: 'DYN_DYN_STRING_VAR',
  2097152: 'DYN_DYN_BIT32_VAR',
  2162688: 'DYN_DYN_CHAR_VAR',
  2424832: 'ATIME_VAR',
  2490368: 'DYN_ATIME_VAR',
  2555904: 'DYN_DYN_ATIME_VAR',
  2621440: 'LANGSTRING_VAR',
  2686976: 'DYN_LANGSTRING_VAR',
  2752512: 'DYN_DYN_LANGSTRING_VAR',
  3014656: 'BLOB_VAR',
  4587520: 'LONG_VAR',
  4653056: 'DYN_LONG_VAR',
  4718592: 'DYN_DYN_LONG_VAR',
  4784128: 'ULONG_VAR',
  4849664: 'DYN_ULONG_VAR',
  4915200: 'DYN_DYN_ULONG_VAR',
  4980736: 'BIT64_VAR',
  5046272: 'DYN_BIT64_VAR',
  5111808: 'DYN_DYN_BIT64_VAR'
};

// Add authentication types to schema
const authTypeDefs = `
  type AuthPayload {
    token: String!
    expiresAt: String!
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload!
  }
`;

// Utility functions for authentication
function generateToken(userId) {
  const tokenId = uuidv4();
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
  
  const token = jwt.sign(
    { 
      userId, 
      tokenId,
      expiresAt
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  // Store token metadata
  tokenStore.set(tokenId, {
    userId,
    expiresAt,
    lastActivity: Date.now()
  });
  
  return { token, expiresAt };
}

function validateToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const tokenData = tokenStore.get(decoded.tokenId);
    
    if (!tokenData) {
      return null;
    }
    
    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      tokenStore.delete(decoded.tokenId);
      return null;
    }
    
    // Extend token validity on each request
    tokenData.lastActivity = Date.now();
    tokenData.expiresAt = Date.now() + TOKEN_EXPIRY_MS;
    tokenStore.set(decoded.tokenId, tokenData);
    
    return { userId: tokenData.userId, tokenId: decoded.tokenId };
  } catch (error) {
    return null;
  }
}

// Dummy user authentication (replace with actual user management)
function authenticateUser(username, password) {
  // TODO: Implement actual user authentication
  // For now, accept any non-empty username/password
  if (username && password) {
    return { id: username, username };
  }
  return null;
}

// GraphQL Resolvers
const resolvers = {
  Query: {
    async dpGet(_, { dpeNames }) {
      try {
        const result = await winccoa.dpGet(dpeNames);
        return result;
      } catch (error) {
        logger.error('dpGet error:', error);
        throw new Error(`Failed to get data points: ${error.message}`);
      }
    },
    
    async dpNames(_, { dpPattern, dpType, ignoreCase = false }) {
      try {
        const result = await winccoa.dpNames(dpPattern, dpType);
        return result;
      } catch (error) {
        logger.error('dpNames error:', error);
        throw new Error(`Failed to get data point names: ${error.message}`);
      }
    },
    
    async dpTypes(_, { pattern, systemId, includeEmpty = true }) {
      try {
        const result = await winccoa.dpTypes(pattern, systemId);
        return result;
      } catch (error) {
        logger.error('dpTypes error:', error);
        throw new Error(`Failed to get data point types: ${error.message}`);
      }
    },
    
    async dpGetMaxAge(_, { age, dpeNames }) {
      try {
        const result = await winccoa.dpGetMaxAge(age, dpeNames);
        return result;
      } catch (error) {
        logger.error('dpGetMaxAge error:', error);
        throw new Error(`Failed to get data points with max age: ${error.message}`);
      }
    },
    
    async dpElementType(_, { dpeName }) {
      try {
        const result = await winccoa.dpElementType(dpeName);
        const enumValue = ElementTypeMap[result];
        if (enumValue === undefined) {
          logger.warn(`Unknown element type value: ${result} for ${dpeName}`);
          throw new Error(`Unknown element type value: ${result}`);
        }
        return enumValue;
      } catch (error) {
        logger.error('dpElementType error:', error);
        throw new Error(`Failed to get element type: ${error.message}`);
      }
    },
    
    async dpAttributeType(_, { dpAttributeName }) {
      try {
        const result = await winccoa.dpAttributeType(dpAttributeName);
        const ctrlType = CtrlTypeMap[result];
        if (ctrlType === undefined) {
          logger.warn(`Unknown control type value: ${result} for ${dpAttributeName}`);
          throw new Error(`Unknown control type value: ${result}`);
        }
        return ctrlType;
      } catch (error) {
        logger.error('dpAttributeType error:', error);
        throw new Error(`Failed to get attribute type: ${error.message}`);
      }
    },
    
    async dpTypeName(_, { dp }) {
      try {
        const result = await winccoa.dpTypeName(dp);
        return result;
      } catch (error) {
        logger.error('dpTypeName error:', error);
        throw new Error(`Failed to get type name: ${error.message}`);
      }
    },
    
    async dpTypeRefName(_, { dpe }) {
      try {
        const result = await winccoa.dpTypeRefName(dpe);
        return result || '';
      } catch (error) {
        logger.error('dpTypeRefName error:', error);
        throw new Error(`Failed to get type reference name: ${error.message}`);
      }
    },
    
    async dpExists(_, { dpeName }) {
      try {
        const result = await winccoa.dpExists(dpeName);
        return result;
      } catch (error) {
        logger.error('dpExists error:', error);
        throw new Error(`Failed to check if data point exists: ${error.message}`);
      }
    },
    
    async dpGetPeriod(_, { startTime, endTime, dpeNames }) {
      try {
        const result = await winccoa.dpGetPeriod(new Date(startTime), new Date(endTime), dpeNames);
        return result;
      } catch (error) {
        logger.error('dpGetPeriod error:', error);
        throw new Error(`Failed to get historic data point values: ${error.message}`);
      }
    }
  },
  
  Mutation: {
    async login(_, { username, password }) {
      const user = authenticateUser(username, password);
      
      if (!user) {
        throw new Error('Invalid username or password');
      }
      
      const { token, expiresAt } = generateToken(user.id);
      
      logger.info(`User ${username} logged in successfully`);
      
      return {
        token,
        expiresAt: new Date(expiresAt).toISOString()
      };
    },
    
    async dpCreate(_, { dpeName, dpType, systemId, dpId }) {
      try {
        const result = await winccoa.dpCreate(dpeName, dpType, systemId, dpId);
        return result;
      } catch (error) {
        logger.error('dpCreate error:', error);
        throw new Error(`Failed to create data point: ${error.message}`);
      }
    },
    
    async dpDelete(_, { dpName }) {
      try {
        const result = await winccoa.dpDelete(dpName);
        return result;
      } catch (error) {
        logger.error('dpDelete error:', error);
        throw new Error(`Failed to delete data point: ${error.message}`);
      }
    },
    
    async dpCopy(_, { source, destination, driver = 1 }) {
      try {
        const result = await winccoa.dpCopy(source, destination, driver);
        return result;
      } catch (error) {
        logger.error('dpCopy error:', error);
        throw new Error(`Failed to copy data point: ${error.message}`);
      }
    },
    
    async dpSet(_, { dpeNames, values }) {
      try {
        const result = await winccoa.dpSet(dpeNames, values);
        return result;
      } catch (error) {
        logger.error('dpSet error:', error);
        throw new Error(`Failed to set data point values: ${error.message}`);
      }
    },
    
    async dpSetWait(_, { dpeNames, values }) {
      try {
        const result = await winccoa.dpSetWait(dpeNames, values);
        return result;
      } catch (error) {
        logger.error('dpSetWait error:', error);
        throw new Error(`Failed to set data point values with wait: ${error.message}`);
      }
    },
    
    async dpSetTimed(_, { time, dpeNames, values }) {
      try {
        const result = await winccoa.dpSetTimed(time, dpeNames, values);
        return result;
      } catch (error) {
        logger.error('dpSetTimed error:', error);
        throw new Error(`Failed to set timed data point values: ${error.message}`);
      }
    },
    
    async dpSetTimedWait(_, { time, dpeNames, values }) {
      try {
        const result = await winccoa.dpSetTimedWait(time, dpeNames, values);
        return result;
      } catch (error) {
        logger.error('dpSetTimedWait error:', error);
        throw new Error(`Failed to set timed data point values with wait: ${error.message}`);
      }
    }
  },
  
  Subscription: {
    dpConnect: {
      subscribe: async (_, { dpeNames, answer = true }, context) => {
        logger.info(`Subscribing to data points: ${dpeNames.join(', ')}`);
        
        // Create a channel for this subscription
        const channel = `dpConnect-${uuidv4()}`;
        let connectionId = null;
        let cleanup = null;
        
        try {
          // Create async iterator first
          const asyncIterator = context.pubsub.asyncIterator(channel);
          
          // Set up the connection
          const callback = (dpeNames, values, type, error) => {
            // Emit the update through the pubsub
            console.log(`Received update for ${dpeNames.join(', ')}:`, values);
            context.pubsub.publish(channel, {
              dpConnect: {
                dpeNames,
                values,
                type: type,
                error: error || null
              }
            });
          };
          
          // Create WinCC OA connection
          connectionId = await winccoa.dpConnect(callback, dpeNames, answer);
          logger.info(`Created dpConnect subscription ${connectionId}`);
          
          // Set up cleanup
          cleanup = () => {
            if (connectionId !== null) {
              try {
                winccoa.dpDisconnect(connectionId);
                logger.info(`Disconnected dpConnect subscription ${connectionId}`);
              } catch (error) {
                logger.error(`Error disconnecting subscription ${connectionId}:`, error);
              }
            }
          };
          
          // Add cleanup to iterator
          const originalReturn = asyncIterator.return;
          asyncIterator.return = async () => {
            cleanup();
            if (originalReturn) {
              return originalReturn.call(asyncIterator);
            }
            return { done: true, value: undefined };
          };
          
          return asyncIterator;
          
        } catch (error) {
          logger.error('dpConnect subscription error:', error);
          if (cleanup) cleanup();
          throw new Error(`Failed to create data point connection: ${error.message}`);
        }
      }
    },
    
    dpQueryConnectSingle: {
      subscribe: async function* (_, { query, answer = true, blockingTime }, context) {
        logger.info(`Subscribing to query: ${query}`);
        
        // Implementation would be similar to dpConnect
        // This is a placeholder - actual implementation depends on WinCC OA API
        throw new Error('dpQueryConnectSingle not yet implemented');
      }
    },
    
    dpQueryConnectAll: {
      subscribe: async function* (_, { query, answer = true, blockingTime }, context) {
        logger.info(`Subscribing to all query results: ${query}`);
        
        // Implementation would be similar to dpConnect
        // This is a placeholder - actual implementation depends on WinCC OA API
        throw new Error('dpQueryConnectAll not yet implemented');
      }
    }
  }
};

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs: [typeDefs, authTypeDefs],
  resolvers
});

// Authentication middleware
const authMiddleware = (req) => {
  // Skip authentication if DISABLE_AUTH is true
  if (DISABLE_AUTH) {
    return { userId: 'anonymous', tokenId: 'no-auth' };
  }
  
  const authHeader = req.headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return validateToken(token);
};

// WebSocket authentication
const wsAuthMiddleware = (ctx) => {
  // Skip authentication if DISABLE_AUTH is true
  if (DISABLE_AUTH) {
    return { user: { userId: 'anonymous', tokenId: 'no-auth' } };
  }
  
  const token = ctx.connectionParams?.Authorization;
  
  if (!token) {
    throw new Error('Missing authorization token');
  }
  
  const user = validateToken(token.replace('Bearer ', ''));
  
  if (!user) {
    throw new Error('Invalid or expired token');
  }
  
  return { user };
};

// Simple pub/sub implementation for subscriptions
class SimplePubSub {
  constructor() {
    this.subscribers = new Map();
  }
  
  publish(channel, payload) {
    const subs = this.subscribers.get(channel) || [];
    subs.forEach(sub => {
      try {
        sub(payload);
      } catch (error) {
        logger.error(`Error publishing to channel ${channel}:`, error);
      }
    });
  }
  
  asyncIterator(channel) {
    const queue = [];
    let pushFn;
    let pullFn;
    let running = true;
    
    const push = (value) => {
      if (pullFn) {
        pullFn({ value, done: false });
        pullFn = null;
      } else {
        queue.push(value);
      }
    };
    
    // Subscribe to channel
    const subs = this.subscribers.get(channel) || [];
    subs.push(push);
    this.subscribers.set(channel, subs);
    
    // Store reference to this for use in iterator methods
    const self = this;
    
    // Create async iterator
    const iterator = {
      async next() {
        if (!running) {
          return { done: true, value: undefined };
        }
        
        if (queue.length > 0) {
          return { value: queue.shift(), done: false };
        }
        
        return new Promise((resolve) => {
          pullFn = resolve;
        });
      },
      
      async return() {
        running = false;
        
        // Unsubscribe
        const subs = self.subscribers.get(channel) || [];
        const index = subs.indexOf(push);
        if (index !== -1) {
          subs.splice(index, 1);
          if (subs.length === 0) {
            self.subscribers.delete(channel);
          } else {
            self.subscribers.set(channel, subs);
          }
        }
        
        // Resolve any pending pull
        if (pullFn) {
          pullFn({ done: true, value: undefined });
          pullFn = null;
        }
        
        return { done: true, value: undefined };
      },
      
      async throw(error) {
        await iterator.return();
        throw error;
      },
      
      [Symbol.asyncIterator]() {
        return this;
      }
    };
    
    return iterator;
  }
}

// Main server setup
async function startServer() {
  try {
    // Create Express app
    const app = express();
    const httpServer = http.createServer(app);
    
    // Create WebSocket server
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql'
    });
    
    // Create pub/sub instance
    const pubsub = new SimplePubSub();
    
    // Set up WebSocket server with GraphQL
    const serverCleanup = useServer(
      {
        schema,
        context: async (ctx) => {
          // Validate WebSocket connection
          const authContext = wsAuthMiddleware(ctx);
          
          return {
            ...authContext,
            pubsub
          };
        },
        onConnect: async (ctx) => {
          logger.info('WebSocket client connected');
          return true; // Accept the connection
        },
        onDisconnect: async (ctx, code, reason) => {
          logger.info(`WebSocket client disconnected: code=${code}, reason=${reason}`);
        }
      },
      wsServer
    );
    
    // Create Apollo Server
    const server = new ApolloServer({
      schema,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await serverCleanup.dispose();
              }
            };
          }
        }
      ]
    });
    
    // Start Apollo Server
    await server.start();
    
    // Apply middleware
    app.use(cors());
    app.use(bodyParser.json());
    
    // Apply GraphQL middleware
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req }) => {
          // Skip authentication entirely if DISABLE_AUTH is true
          if (DISABLE_AUTH) {
            return { user: { userId: 'anonymous', tokenId: 'no-auth' } };
          }
          
          // Skip auth for introspection and login
          const isIntrospection = req.body?.operationName === 'IntrospectionQuery';
          const isLogin = req.body?.query?.includes('login');
          
          if (!isIntrospection && !isLogin) {
            const user = authMiddleware(req);
            
            if (!user) {
              throw new Error('Unauthorized');
            }
            
            return { user };
          }
          
          return {};
        }
      })
    );
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', uptime: process.uptime() });
    });
    
    // Start HTTP server
    await new Promise((resolve) => {
      httpServer.listen(PORT, () => {
        logger.info(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
        logger.info(`🔌 WebSocket subscriptions ready at ws://localhost:${PORT}/graphql`);
        if (DISABLE_AUTH) {
          logger.warn('⚠️  Authentication is DISABLED. Set DISABLE_AUTH=false to enable authentication.');
        }
        resolve();
      });
    });
    
    // Cleanup expired tokens periodically
    setInterval(() => {
      const now = Date.now();
      for (const [tokenId, data] of tokenStore.entries()) {
        if (now > data.expiresAt) {
          tokenStore.delete(tokenId);
        }
      }
    }, 60000); // Check every minute
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});