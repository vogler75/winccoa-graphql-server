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
const { createAlertOperationResolvers } = require('./graphql/alerting');
const { createSubscriptionResolvers } = require('./graphql/subscriptions');
const { createCnsOperationResolvers } = require('./graphql/cns');
const { createExtrasResolvers } = require('./graphql/extras');

// Import V2 resolvers
const { createV2Resolvers } = require('./graphql/resolvers');

// Import custom scalars
const { AnytypeScalar } = require('./graphql/scalars');

// Import REST API
const { createRestApi } = require('./restapi/rest-api');

// Import Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./restapi/openapi');

// Import usage tracker
const { UsageTracker } = require('./usage-tracker');

// Import MCP Server (official SDK)
const { createMCPServer, createHTTPTransport } = require('./mcp/mcp-http-server');
const { initializeToolLoader } = require('./mcp/tool-loader');

// Import extracted lib modules
const { createLogger } = require('./lib/logger');
const {
  generateToken,
  validateToken,
  authenticateUser,
  purgeExpiredTokens,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  READONLY_USERNAME,
  DIRECT_ACCESS_TOKEN,
  READONLY_TOKEN,
  JWT_SECRET,
  TOKEN_EXPIRY_MS
} = require('./lib/auth');
const { SimplePubSub } = require('./lib/pubsub');

// Import required modules
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { makeServer, handleProtocols } = require('graphql-ws');
const express = require('express');
const http = require('http');
const { join } = require('path');
const cors = require('cors');

// Parse command line arguments
const args = process.argv.slice(2);
const noAuthArg = args.includes('--no-auth');

// Configuration
const PORT = process.env.GRAPHQL_PORT || 4000;
const HOST = process.env.GRAPHQL_HOST || '0.0.0.0';
const DISABLE_AUTH = noAuthArg || process.env.DISABLE_AUTH === 'true';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// MCP Configuration
const MCP_ENABLED = process.env.MCP_ENABLED === 'true';
const MCP_PORT = process.env.MCP_PORT || 3001;
const MCP_HOST = process.env.MCP_HOST || '0.0.0.0';
const MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || '';
const MCP_TOOLS_PATH = require('path').join(scriptDir, '.env-mcp-tools');

// Create logger (from lib/logger.js)
const logger = createLogger();

// Create usage tracker instance
const usageTracker = new UsageTracker(logger);

// Log startup configuration
console.log(`Starting GraphQL server on ${HOST}:${PORT} with DISABLE_AUTH=${DISABLE_AUTH}`);
console.log(`🌐 CORS Configuration: ${CORS_ORIGIN}`);
console.log('🔐 Authentication Configuration:');
console.log(`   Admin Username: ${ADMIN_USERNAME ? '✅ Set' : '❌ Not set'}`);
console.log(`   Admin Password: ${ADMIN_PASSWORD ? '✅ Set' : '❌ Not set'}`);
console.log(`   Direct Access Token: ${DIRECT_ACCESS_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   Readonly Username: ${READONLY_USERNAME ? '✅ Set' : '❌ Not set'}`);
console.log(`   Readonly Token: ${READONLY_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   JWT Secret: ${JWT_SECRET !== 'your-secret-key-change-in-production' ? '✅ Custom' : '⚠️  Default (change in production)'}`);
console.log(`   Token Expiry: ${TOKEN_EXPIRY_MS}ms (${Math.round(TOKEN_EXPIRY_MS / 60000)} minutes)`);

if (DISABLE_AUTH) {
  console.log('⚠️  WARNING: Authentication is DISABLED! This is unsafe for production.');
} else if (!ADMIN_USERNAME && !READONLY_USERNAME && !DIRECT_ACCESS_TOKEN && !READONLY_TOKEN) {
  console.log('⚠️  WARNING: No authentication credentials configured!');
} else {
  console.log('✅ Authentication is properly configured.');
}

console.log('🔌 MCP Server Configuration:');
console.log(`   Enabled: ${MCP_ENABLED ? '✅ Yes' : '❌ No'}`);
if (MCP_ENABLED) {
  console.log(`   Host: ${MCP_HOST}:${MCP_PORT}`);
  console.log(`   Bearer Token: ${MCP_BEARER_TOKEN ? '✅ Required' : '❌ Disabled (no authentication)'}`);
  console.log(`   Tools Config: ${MCP_TOOLS_PATH}`);
}

// Load GraphQL schema
const schemaV2 = require('./graphql');
const typeDefs = schemaV2.typeDefs;

// Wrap validateToken / authenticateUser to bind the logger (lib/auth exports take logger as param)
const _validateToken    = (token) => validateToken(token, logger);
const _authenticateUser = (username, password) => authenticateUser(username, password, logger);

// Create resolver modules
const commonResolvers = createCommonResolvers(winccoa, logger);
const alertResolvers = createAlertOperationResolvers(winccoa, logger);
const subscriptionResolvers = createSubscriptionResolvers(winccoa, logger);
const cnsResolvers = createCnsOperationResolvers(winccoa);
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

// GraphQL Resolvers - merge v2 with login mutation and custom scalars
const resolvers = mergeResolvers(
  v2Resolvers,
  {
    Anytype: AnytypeScalar,
    Mutation: {
      async login(_, { username, password }) {
        const user = _authenticateUser(username, password);

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
  
  const result = _validateToken(token);
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

  const user = _validateToken(token.replace('Bearer ', ''));

  if (!user) {
    logger.warn('WebSocket connection has invalid or expired token');
    throw new Error('Invalid or expired token');
  }

  return { user };
};

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
    
    // Create WebSocket server in noServer mode to prevent conflict
    // with Express middleware on the same /graphql path.
    // Using { server: httpServer } would cause Node.js to fire both
    // 'request' and 'upgrade' events, letting Express process the
    // upgrade request as HTTP and return 'Unauthorized' before the
    // WebSocket handshake completes.
    const wsServer = new WebSocketServer({ noServer: true });
    
    // Create pub/sub instance
    const pubsub = new SimplePubSub();
    
    const graphqlServer = makeServer({
      schema,
      context: async (ctx) => {
        const authContext = wsAuthMiddleware(ctx);
        return {
          ...authContext,
          pubsub
        };
      },
      onConnect: (ctx) => {
        logger.info('WebSocket client connected');
        return true;
      },
      onDisconnect: (ctx, code, reason) => {
        logger.info(`WebSocket client disconnected: code=${code}, reason=${reason}`);
      }
    });

    wsServer.options.handleProtocols = handleProtocols;
    const KEEPALIVE = 12000;

    wsServer.on('connection', (socket, request) => {
      socket.once('error', (err) => {
        console.error('Internal error emitted on a WebSocket socket.', err);
        socket.close(4500, 'Internal server error');
      });

      // Ping/pong keepalive
      let pongWait = null;
      const pingInterval = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          pongWait = setTimeout(() => socket.terminate(), KEEPALIVE);
          socket.once('pong', () => {
            if (pongWait) { clearTimeout(pongWait); pongWait = null; }
          });
          socket.ping();
        }
      }, KEEPALIVE);

      // We only queue messages behind connection_init. Once it completes, we run freely!
      let initPromise = Promise.resolve();

      const closed = graphqlServer.opened(
        {
          protocol: socket.protocol,
          send: (data) => new Promise((resolve, reject) => {
            if (socket.readyState !== socket.OPEN) return resolve();
            socket.send(data, (err) => (err ? reject(err) : resolve()));
          }),
          close: (code, reason) => socket.close(code, reason),
          onMessage: (cb) => {
            socket.on('message', (event) => {
              const msg = String(event);

              if (msg.includes('"connection_init"')) {
                // Block new messages until connection is fully initialized (ACK sent)
                let resolveInit;
                initPromise = new Promise(r => resolveInit = r);
                
                cb(msg)
                  .catch((err) => {
                    console.error('Error during connection_init handling.', err);
                    socket.close(4400, 'Internal server error');
                  })
                  .finally(() => resolveInit());
              } else {
                // Wait for the initialize block to lift, then run concurrently!
                initPromise.then(() => {
                  cb(msg).catch((err) => {
                    console.error('Error during WebSocket message handling.', err);
                    socket.close(4400, 'Internal server error');
                  });
                });
              }
            });
          }
        },
        { socket, request }
      );

      socket.once('close', (code, reason) => {
        if (pongWait) clearTimeout(pongWait);
        clearInterval(pingInterval);
        closed(code, String(reason));
      });
    });

    const serverCleanup = {
      async dispose() {
        for (const client of wsServer.clients) {
          client.close(1001, 'Going away');
        }
        wsServer.removeAllListeners();
        await new Promise((resolve, reject) => {
          wsServer.close((err) => (err ? reject(err) : resolve()));
        });
      }
    };
    
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
    app.use(express.json());

    // Make auth functions and usage tracker available to REST API
    app.locals.validateToken = _validateToken;
    app.locals.authenticateUser = _authenticateUser;
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

    // MCP Server Setup (with HTTP Streaming Transport)
    let mcpHttpServer = null;
    if (MCP_ENABLED) {
      logger.info('🔧 Initializing MCP Server with HTTP Streaming Transport...');

      try {
        // Load tools configuration
        const toolLoader = initializeToolLoader(MCP_TOOLS_PATH, logger);

        // Create MCP Server with official SDK
        const mcpServer = createMCPServer(winccoa, logger, toolLoader);

        // Create HTTP Streaming Transport (SSE)
        mcpHttpServer = createHTTPTransport(mcpServer, logger, MCP_PORT, MCP_HOST);

        logger.info('✅ MCP Server initialized with HTTP Streaming Transport');
      } catch (error) {
        logger.error('❌ Failed to initialize MCP Server:', error);
        if (error.message.includes('module')) {
          logger.error('   Ensure @modelcontextprotocol/sdk is installed: npm install');
        }
      }
    }

    // Handle WebSocket upgrades manually so Express doesn't intercept them
    httpServer.on('upgrade', (request, socket, head) => {
      const { pathname } = new URL(request.url, `http://${request.headers.host}`)
      if (pathname === '/graphql') {
        wsServer.handleUpgrade(request, socket, head, (ws) => {
          wsServer.emit('connection', ws, request)
        })
      } else {
        socket.destroy()
      }
    })

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
        if (MCP_ENABLED && mcpHttpServer) {
          const mcpDisplayHost = MCP_HOST === '0.0.0.0' ? require('os').hostname() : MCP_HOST;
          logger.info(`─────────────────────────────────────────────────`);
          logger.info(`🔌 MCP Server (HTTP Streaming):`);
          logger.info(`   📨 Messages (SSE):     http://${mcpDisplayHost}:${MCP_PORT}/mcp/messages`);
          logger.info(`   💚 Health Check:       http://${mcpDisplayHost}:${MCP_PORT}/mcp/health`);
          logger.info(`   ℹ️  Server Info:        http://${mcpDisplayHost}:${MCP_PORT}/mcp/info`);
        }
        logger.info(`─────────────────────────────────────────────────`);
        if (DISABLE_AUTH) {
          logger.warn('⚠️  Authentication is DISABLED. Set DISABLE_AUTH=false to enable authentication.');
        }
        if (MCP_ENABLED && MCP_BEARER_TOKEN) {
          logger.warn('🔒 MCP Bearer Token authentication is enabled.');
        }
        resolve();
      });
    });
    
    // Cleanup expired tokens periodically
    setInterval(purgeExpiredTokens, 60000);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  usageTracker.shutdown();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
startServer().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});
