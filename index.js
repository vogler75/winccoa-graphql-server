// Require WinCC OA interface
const { WinccoaManager } = require('winccoa-manager');
const winccoa = new WinccoaManager();

// Import resolver modules
const { createCommonResolvers } = require('./common');
const { createAlertResolvers } = require('./alerting');
const { createSubscriptionResolvers } = require('./subscriptions');
const { createCnsResolvers } = require('./cns');
const { createExtrasResolvers } = require('./extras');

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

// Parse command line arguments
const args = process.argv.slice(2);
const noAuthArg = args.includes('--no-auth');

// Configuration
const PORT = process.env.GRAPHQL_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY_MS = 3600000; // 1 hour
const DISABLE_AUTH = noAuthArg || process.env.DISABLE_AUTH == 'true' || process.env.DISABLE_AUTH == '1' || process.env.DISABLE_AUTH == 'yes';

console.log(`Starting GraphQL server on port ${PORT} with DISABLE_AUTH=${DISABLE_AUTH}`);

// In-memory token store (replace with Redis or database in production)
const tokenStore = new Map();

// Logger setup
const logger = {
  info: (...args) => console.log(...args, '[INFO]'),
  error: (...args) => console.error(...args, '[ERROR]'),
  warn: (...args) => console.warn(...args, '[WARN]'),
  debug: (...args) => console.log(...args, '[DEBUG]')
};

// Load GraphQL schema files
const commonSchema = readFileSync(join(__dirname, 'common.gql'), 'utf-8');
const alertingSchema = readFileSync(join(__dirname, 'alerting.gql'), 'utf-8');
const cnsSchema = readFileSync(join(__dirname, 'cns.gql'), 'utf-8');
const extrasSchema = readFileSync(join(__dirname, 'extras.gql'), 'utf-8');

// Combine all schema files
const typeDefs = [commonSchema, alertingSchema, cnsSchema, extrasSchema];


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

// Create resolver modules
const commonResolvers = createCommonResolvers(winccoa, logger);
const alertResolvers = createAlertResolvers(winccoa, logger);
const subscriptionResolvers = createSubscriptionResolvers(winccoa, logger);
const cnsResolvers = createCnsResolvers(winccoa, logger);
const extrasResolvers = createExtrasResolvers(winccoa, logger);

// Merge resolvers
function mergeResolvers(...resolverObjects) {
  const merged = { Query: {}, Mutation: {}, Subscription: {} };
  
  for (const resolverObj of resolverObjects) {
    if (resolverObj.Query) {
      Object.assign(merged.Query, resolverObj.Query);
    }
    if (resolverObj.Mutation) {
      Object.assign(merged.Mutation, resolverObj.Mutation);
    }
    if (resolverObj.Subscription) {
      Object.assign(merged.Subscription, resolverObj.Subscription);
    }
  }
  
  return merged;
}

// GraphQL Resolvers
const resolvers = mergeResolvers(
  commonResolvers,
  alertResolvers,
  subscriptionResolvers,
  cnsResolvers,
  extrasResolvers,
  {
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
      }
    }
  }
);

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs: [...typeDefs, authTypeDefs],
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
