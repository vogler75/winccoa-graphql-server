// Load environment variables from .env file in the script's directory
const scriptDir = __dirname;
const envPath = require('path').join(scriptDir, '.env');

console.log(`Looking for .env file at: ${envPath}`);

const dotenvResult = require('dotenv').config({ path: envPath });

// Log dotenv loading result
if (dotenvResult.error) {
  console.log('⚠️  .env file not found or could not be loaded:', dotenvResult.error.message);
  console.log('   Using environment variables and defaults');
} else {
  console.log('✅ .env file loaded successfully');
  console.log('   Loaded variables:', Object.keys(dotenvResult.parsed || {}).join(', '));
}

// Require WinCC OA interface
const { WinccoaManager } = require('winccoa-manager');
const winccoa = new WinccoaManager();

// Import V1 resolver modules
const { createCommonResolvers } = require('./graphql-v1/common');
const { createAlertResolvers } = require('./graphql-v1/alerting');
const { createSubscriptionResolvers } = require('./graphql-v1/subscriptions');
const { createCnsResolvers } = require('./graphql-v1/cns');
const { createExtrasResolvers } = require('./graphql-v1/extras');

// Import V2 resolvers
const { createV2Resolvers } = require('./graphql-v2/resolvers');

// Import REST API
const { createRestApi } = require('./restapi/rest-api');

// Import Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./restapi/openapi');

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
const TOKEN_EXPIRY_MS = parseInt(process.env.TOKEN_EXPIRY_MS || '3600000'); // Default 1 hour
const DISABLE_AUTH = noAuthArg || process.env.DISABLE_AUTH === 'true';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Authentication credentials from environment
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DIRECT_ACCESS_TOKEN = process.env.DIRECT_ACCESS_TOKEN;
const READONLY_USERNAME = process.env.READONLY_USERNAME;
const READONLY_PASSWORD = process.env.READONLY_PASSWORD;
const READONLY_TOKEN = process.env.READONLY_TOKEN;

// Log authentication configuration
console.log(`Starting GraphQL server on port ${PORT} with DISABLE_AUTH=${DISABLE_AUTH}`);
console.log(`🌐 CORS Configuration: ${CORS_ORIGIN}`);
console.log('🔐 Authentication Configuration:');
console.log(`   Admin Username: ${ADMIN_USERNAME ? '✅ Set' : '❌ Not set'}`);
console.log(`   Admin Password: ${ADMIN_PASSWORD ? '✅ Set' : '❌ Not set'}`);
console.log(`   Direct Access Token: ${DIRECT_ACCESS_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   Readonly Username: ${READONLY_USERNAME ? '✅ Set' : '❌ Not set'}`);
console.log(`   Readonly Password: ${READONLY_PASSWORD ? '✅ Set' : '❌ Not set'}`);
console.log(`   Readonly Token: ${READONLY_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   JWT Secret: ${JWT_SECRET !== 'your-secret-key-change-in-production' ? '✅ Custom' : '⚠️  Default (change in production)'}`);
console.log(`   Token Expiry: ${TOKEN_EXPIRY_MS}ms (${Math.round(TOKEN_EXPIRY_MS / 60000)} minutes)`);

// Warn about authentication mode
if (DISABLE_AUTH) {
  console.log('⚠️  WARNING: Authentication is DISABLED! This is unsafe for production.');
} else if (!ADMIN_USERNAME && !READONLY_USERNAME && !DIRECT_ACCESS_TOKEN && !READONLY_TOKEN) {
  console.log('⚠️  WARNING: No authentication credentials configured!');
} else {
  console.log('✅ Authentication is properly configured.');
}

// In-memory token store (replace with Redis or database in production)
const tokenStore = new Map();

// Logger setup with LOG_LEVEL support
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLogLevel = logLevels[LOG_LEVEL.toLowerCase()] || logLevels.info;

const logger = {
  info: (...args) => {
    if (currentLogLevel >= logLevels.info) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (currentLogLevel >= logLevels.error) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (currentLogLevel >= logLevels.warn) {
      console.warn(...args);
    }
  },
  debug: (...args) => {
    if (currentLogLevel >= logLevels.debug) {
      console.log(...args);
    }
  }
};

// Load GraphQL V2 schema (modular structure)
const schemaV2 = require('./graphql-v2');

// Combine all schema modules
const typeDefs = schemaV2.typeDefs;

// Utility functions for authentication
function generateToken(userId, role = 'admin') {
  const tokenId = uuidv4();
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
  
  const token = jwt.sign(
    { 
      userId, 
      tokenId,
      expiresAt,
      role
    },
    JWT_SECRET,
    { expiresIn: Math.floor(TOKEN_EXPIRY_MS / 1000) + 's' }
  );
  
  // Store token metadata
  tokenStore.set(tokenId, {
    userId,
    role,
    expiresAt,
    lastActivity: Date.now()
  });
  
  return { token, expiresAt };
}

function validateToken(token) {
  logger.debug(`Validating token: ${token ? token.substring(0, 20) + '...' : 'null'}`);
  
  // First check if it's a direct access token
  if (DIRECT_ACCESS_TOKEN && token === DIRECT_ACCESS_TOKEN) {
    logger.debug('Direct access token matched');
    return { userId: 'direct-access', tokenId: 'direct', role: 'admin' };
  }
  
  // Check if it's a read-only direct access token
  if (READONLY_TOKEN && token === READONLY_TOKEN) {
    logger.debug('Read-only direct token matched');
    return { userId: 'readonly-direct', tokenId: 'readonly', role: 'readonly' };
  }
  
  // Otherwise, validate as JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.debug(`JWT decoded successfully for user: ${decoded.userId}`);
    
    const tokenData = tokenStore.get(decoded.tokenId);
    
    if (!tokenData) {
      logger.debug('Token not found in store');
      return null;
    }
    
    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      logger.debug('Token expired, removing from store');
      tokenStore.delete(decoded.tokenId);
      return null;
    }
    
    // Extend token validity on each request
    tokenData.lastActivity = Date.now();
    tokenData.expiresAt = Date.now() + TOKEN_EXPIRY_MS;
    tokenStore.set(decoded.tokenId, tokenData);
    
    logger.debug(`JWT token validated for user: ${tokenData.userId}, role: ${tokenData.role}`);
    return { userId: tokenData.userId, tokenId: decoded.tokenId, role: tokenData.role || 'admin' };
  } catch (error) {
    logger.debug(`JWT validation failed: ${error.message}`);
    return null;
  }
}

// User authentication with environment-based credentials
function authenticateUser(username, password) {
  logger.debug(`Authentication attempt for username: ${username}`);
  
  // Check admin credentials
  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      logger.info(`Admin user authenticated: ${username}`);
      return { id: username, username, role: 'admin' };
    }
  }
  
  // Check read-only credentials
  if (READONLY_USERNAME && READONLY_PASSWORD) {
    if (username === READONLY_USERNAME && password === READONLY_PASSWORD) {
      logger.info(`Read-only user authenticated: ${username}`);
      return { id: username, username, role: 'readonly' };
    }
  }
  
  // If no environment credentials are set, only accept specific development credentials
  if (!ADMIN_USERNAME && !READONLY_USERNAME) {
    if (username === 'dev' && password === 'dev') {
      logger.warn('Using development credentials - configure proper credentials in .env for production');
      return { id: username, username, role: 'admin' };
    }
  }
  
  logger.debug(`Authentication failed for username: ${username}`);
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
  const merged = {};

  for (const resolverObj of resolverObjects) {
    for (const [key, value] of Object.entries(resolverObj)) {
      if (!merged[key]) {
        merged[key] = {};
      }
      if (typeof value === 'object' && value !== null) {
        Object.assign(merged[key], value);
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
}

// Create old resolvers for backward compatibility via Methods type
const oldResolvers = mergeResolvers(
  commonResolvers,
  alertResolvers,
  subscriptionResolvers,
  cnsResolvers,
  extrasResolvers
);

// Create v2 resolvers with hierarchical structure
const v2Resolvers = createV2Resolvers(winccoa, logger, oldResolvers);

// GraphQL Resolvers - merge v2 with login mutation
const resolvers = mergeResolvers(
  v2Resolvers,
  {
    Mutation: {
      async login(_, { username, password }) {
        const user = authenticateUser(username, password);

        if (!user) {
          throw new Error('Invalid username or password');
        }

        const { token, expiresAt } = generateToken(user.id, user.role);

        logger.info(`User ${username} logged in successfully with role: ${user.role}`);

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
  typeDefs,
  resolvers
});

// Authentication middleware
const authMiddleware = (req) => {
  // Skip authentication if DISABLE_AUTH is true
  if (DISABLE_AUTH) {
    logger.debug('Authentication disabled, allowing anonymous access');
    return { userId: 'anonymous', tokenId: 'no-auth', role: 'admin' };
  }
  
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader) {
    logger.debug('No Authorization header found');
    return null;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    logger.debug('Authorization header does not start with "Bearer "');
    return null;
  }
  
  const token = authHeader.substring(7);
  logger.debug(`Extracted token from Authorization header: ${token.substring(0, 20)}...`);
  
  const result = validateToken(token);
  logger.debug(`Token validation result: ${result ? 'valid' : 'invalid'}`);
  return result;
};

// WebSocket authentication
const wsAuthMiddleware = (ctx) => {
  // Skip authentication if DISABLE_AUTH is true
  if (DISABLE_AUTH) {
    return { user: { userId: 'anonymous', tokenId: 'no-auth', role: 'admin' } };
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
    
    // Authentication plugin that checks auth AFTER parsing
    const authPlugin = {
      async requestDidStart() {
        return {
          async didResolveOperation(requestContext) {
            // Skip auth check if disabled
            if (DISABLE_AUTH) return;
            
            const { request, contextValue, operation, operationName } = requestContext;
            
            // Check if this is an introspection query
            if (request.operationName === 'IntrospectionQuery') return;
            
            // Parse the operation to check if it contains the login mutation
            let isLoginMutation = false;
            let hasMutation = false;
            
            if (operation) {
              // Check operation type
              if (operation.operation === 'mutation') {
                hasMutation = true;
              }
              
              // Walk through the operation selections
              const selections = operation.selectionSet?.selections || [];
              for (const selection of selections) {
                if (selection.kind === 'Field' && selection.name.value === 'login') {
                  isLoginMutation = true;
                  break;
                }
              }
            }
            
            // Skip auth for login mutation
            if (isLoginMutation) return;
            
            // For all other operations, require authentication
            if (!contextValue.user) {
              throw new Error('Unauthorized');
            }
            
            // Check read-only restrictions
            if (contextValue.user.role === 'readonly' && hasMutation) {
              throw new Error('Forbidden: Read-only users cannot perform mutations');
            }
          }
        };
      }
    };
    
    // Create Apollo Server
    const server = new ApolloServer({
      schema,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        authPlugin,
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
    
    // Parse CORS origin configuration
    let corsOptions;
    if (CORS_ORIGIN === '*') {
      corsOptions = { origin: '*' };
    } else {
      // Split by comma and trim whitespace for multiple origins
      const origins = CORS_ORIGIN.split(',').map(origin => origin.trim());
      corsOptions = { origin: origins };
    }
    
    // Apply middleware
    app.use(cors(corsOptions));
    app.use(bodyParser.json());

    // Make auth functions available to REST API
    app.locals.validateToken = validateToken;
    app.locals.authenticateUser = authenticateUser;
    app.locals.generateToken = generateToken;

    // Apply GraphQL middleware
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req }) => {
          // Always try to authenticate if a token is provided
          const user = authMiddleware(req);

          // Return context with user if authenticated, or empty if not
          return user ? { user } : {};
        }
      })
    );

    // Apply REST API middleware (use oldResolvers for backward compatibility)
    const restApi = createRestApi(winccoa, logger, oldResolvers, DISABLE_AUTH);
    app.use('/restapi', restApi);

    // Serve OpenAPI specification
    app.get('/openapi.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Serve Swagger UI documentation with dynamic server URL
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', (req, res) => {
      // Get the base URL from the request
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      // Create a modified spec with the correct server URL
      const modifiedSpec = {
        ...swaggerSpec,
        servers: [
          {
            url: baseUrl,
            description: 'Current server'
          }
        ]
      };

      swaggerUi.setup(modifiedSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'WinCC OA REST API Documentation'
      })(req, res);
    });

    // Serve static files from public directory
    app.use(express.static(join(__dirname, 'public')));

    // Landing page
    app.get('/', (req, res) => {
      res.sendFile(join(__dirname, 'public', 'index.html'));
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', uptime: process.uptime() });
    });
    
    // Start HTTP server
    await new Promise((resolve) => {
      httpServer.listen(PORT, () => {
        logger.info(`\n🏭 WinCC OA API Server Started`);
        logger.info(`─────────────────────────────────────────────────`);
        logger.info(`🏠 Landing page:        http://localhost:${PORT}/`);
        logger.info(`🚀 GraphQL API:         http://localhost:${PORT}/graphql`);
        logger.info(`🔌 WebSocket:           ws://localhost:${PORT}/graphql`);
        logger.info(`🌐 REST API:            http://localhost:${PORT}/restapi`);
        logger.info(`📚 API Documentation:   http://localhost:${PORT}/api-docs`);
        logger.info(`📄 OpenAPI Spec:        http://localhost:${PORT}/openapi.json`);
        logger.info(`💚 Health Check:        http://localhost:${PORT}/restapi/health`);
        logger.info(`─────────────────────────────────────────────────`);
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
