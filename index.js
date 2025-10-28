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

// Check for debug flag
const DEBUG_WINCCOA = process.argv.includes('--debug');
if (DEBUG_WINCCOA) {
  console.log('🐛 Debug mode enabled: All WinCC OA Node.js function calls will be logged');
}

// Require WinCC OA interface
const { WinccoaManager } = require('winccoa-manager');
const winccoaBase = new WinccoaManager();

// Wrap WinCC OA manager to log all function calls if debug is enabled
const winccoa = new Proxy(winccoaBase, {
  get(target, prop) {
    const value = target[prop];
    if (typeof value === 'function' && DEBUG_WINCCOA) {
      return function(...args) {
        console.log(`[WINCCOA] ${prop}(${args.map(a => JSON.stringify(a)).join(', ')})`);
        const result = value.apply(target, args);
        if (result instanceof Promise) {
          return result.then(res => {
            console.log(`[WINCCOA] ${prop} => ${JSON.stringify(res)}`);
            return res;
          }).catch(err => {
            console.log(`[WINCCOA] ${prop} => ERROR: ${err.message}`);
            throw err;
          });
        }
        console.log(`[WINCCOA] ${prop} => ${JSON.stringify(result)}`);
        return result;
      };
    }
    return value;
  }
});

// Import V1 resolver modules (now in graphql)
const { createCommonResolvers } = require('./graphql/common');
const { createAlertResolvers } = require('./graphql/alerting');
const { createSubscriptionResolvers } = require('./graphql/subscriptions');
const { createCnsResolvers } = require('./graphql/cns');
const { createExtrasResolvers } = require('./graphql/extras');

// Import V2 resolvers
const { createV2Resolvers } = require('./graphql/resolvers');

// Import REST API
const { createRestApi } = require('./restapi/rest-api');

// Import Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./restapi/openapi');

// Import usage tracker
const { UsageTracker } = require('./usage-tracker');

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
const HOST = process.env.GRAPHQL_HOST || '0.0.0.0';
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
console.log(`Starting GraphQL server on ${HOST}:${PORT} with DISABLE_AUTH=${DISABLE_AUTH}`);
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

// Create usage tracker instance
const usageTracker = new UsageTracker(logger);

// Load GraphQL schema (now in graphql directory)
const schemaV2 = require('./graphql');

// Combine all schema modules
const typeDefs = schemaV2.typeDefs;

// Utility functions for authentication

/**
 * Generates a JWT token for user authentication.
 *
 * @param {string} userId - The user identifier
 * @param {string} [role='admin'] - The user role (admin or readonly)
 * @returns {object} Token object with token string and expiration timestamp
 */
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

/**
 * Validates a JWT token or direct access token.
 *
 * @param {string} token - The token to validate
 * @returns {object|null} Token data object if valid, null if invalid or expired
 */
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

/**
 * Authenticates a user based on username and password against environment variables.
 *
 * @param {string} username - The username to authenticate
 * @param {string} password - The password to verify
 * @returns {object|null} User object if authentication successful, null otherwise
 */
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

/**
 * Merges multiple GraphQL resolver objects into a single resolver.
 *
 * @param {...object} resolverObjects - Variable number of resolver objects to merge
 * @returns {object} Merged resolver object
 */
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
    logger.debug('WebSocket auth disabled, allowing anonymous access');
    return { user: { userId: 'anonymous', tokenId: 'no-auth', role: 'admin' } };
  }

  const token = ctx.connectionParams?.Authorization;

  if (!token) {
    logger.warn('WebSocket connection missing authorization token');
    throw new Error('Missing authorization token');
  }

  const user = validateToken(token.replace('Bearer ', ''));

  if (!user) {
    logger.warn('WebSocket connection has invalid or expired token');
    throw new Error('Invalid or expired token');
  }

  return { user };
};

/**
 * Simple pub/sub implementation for GraphQL subscriptions.
 *
 * Implements the async iterator protocol for streaming subscription data
 * to connected WebSocket clients.
 */
class SimplePubSub {
  constructor() {
    this.subscribers = new Map();
  }

  /**
   * Publishes a payload to all subscribers on a channel.
   *
   * @param {string} channel - The channel name to publish to
   * @param {*} payload - The data to publish
   */
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
  
  /**
   * Creates an async iterator for a channel.
   *
   * @param {string} channel - The channel to subscribe to
   * @returns {AsyncIterator} An async iterator that yields payloads from the channel
   */
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

/**
 * Starts the GraphQL server with Express, Apollo, and WebSocket support.
 *
 * Sets up:
 * - REST API endpoints
 * - GraphQL endpoint with authentication
 * - WebSocket subscriptions
 * - Swagger UI documentation
 * - Health check endpoint
 */
async function startServer() {
  try {
    // Create Express app
    const app = express();

    // Trust proxy to get correct protocol/host when behind reverse proxy
    app.set('trust proxy', true);

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
    
    // Usage tracking plugin
    const usageTrackingPlugin = {
      async requestDidStart() {
        return {
          async didResolveOperation(requestContext) {
            const { operationName, operation } = requestContext;

            // Skip introspection queries
            if (operationName === 'IntrospectionQuery') return;

            // Track the operation
            if (operation) {
              const selections = operation.selectionSet?.selections || [];
              for (const selection of selections) {
                if (selection.kind === 'Field') {
                  const fieldName = selection.name.value;
                  const operationType = operation.operation; // query, mutation, subscription
                  usageTracker.track('graphql', `${operationType}/${fieldName}`);
                }
              }
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
        usageTrackingPlugin,
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

    // Make auth functions and usage tracker available to REST API
    app.locals.validateToken = validateToken;
    app.locals.authenticateUser = authenticateUser;
    app.locals.generateToken = generateToken;
    app.locals.usageTracker = usageTracker;

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
      // Don't set server URL on server side - let client-side JS detect it correctly
      swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'WinCC OA REST API Documentation',
        customJs: '/swagger-custom.js'
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

    // Debug endpoint to check headers (can be removed later)
    app.get('/debug-headers', (req, res) => {
      res.json({
        protocol: req.protocol,
        secure: req.secure,
        hostname: req.hostname,
        host: req.get('host'),
        headers: {
          'x-forwarded-proto': req.get('x-forwarded-proto'),
          'x-forwarded-ssl': req.get('x-forwarded-ssl'),
          'x-forwarded-host': req.get('x-forwarded-host'),
          'x-forwarded-for': req.get('x-forwarded-for'),
          'forwarded': req.get('forwarded'),
        },
        allHeaders: req.headers
      });
    });
    
    // Start HTTP server
    await new Promise((resolve) => {
      httpServer.listen(PORT, HOST, () => {
        logger.info(`🏭 WinCC OA API Server Started`);
        logger.info(`─────────────────────────────────────────────────`);
        // For display purposes: if listening on 0.0.0.0 (all interfaces), show the hostname; otherwise show configured host
        const displayHost = HOST === '0.0.0.0' ? require('os').hostname() : HOST;
        logger.info(`🏠 Landing page:        http://${displayHost}:${PORT}/`);
        logger.info(`🚀 GraphQL API:         http://${displayHost}:${PORT}/graphql`);
        logger.info(`🔌 WebSocket:           ws://${displayHost}:${PORT}/graphql`);
        logger.info(`🌐 REST API:            http://${displayHost}:${PORT}/restapi`);
        logger.info(`📚 API Documentation:   http://${displayHost}:${PORT}/api-docs`);
        logger.info(`📊 Usage Statistics:    http://${displayHost}:${PORT}/stats.html`);
        logger.info(`📄 OpenAPI Spec:        http://${displayHost}:${PORT}/openapi.json`);
        logger.info(`💚 Health Check:        http://${displayHost}:${PORT}/restapi/health`);
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
  usageTracker.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  usageTracker.shutdown();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});
