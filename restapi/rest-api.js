// REST API Router for WinCC OA GraphQL Server
const express = require('express')

// Create main REST API router
function createRestApi(winccoa, logger, resolvers, DISABLE_AUTH) {
  const router = express.Router()

  // Import route modules
  const authRoutes = require('./routes/auth-routes')
  const { createQueryRouter } = require('./routes/datapoint-routes')
  const datapointRoutes = require('./routes/datapoint-routes')
  const datapointTypeRoutes = require('./routes/datapoint-type-routes')
  const tagRoutes = require('./routes/tag-routes')
  const alertRoutes = require('./routes/alert-routes')
  const cnsRoutes = require('./routes/cns-routes')
  const systemRoutes = require('./routes/system-routes')
  const extrasRoutes = require('./routes/extras-routes')

  // Authentication middleware for REST API
  const restAuthMiddleware = (req, res, next) => {
    // Skip authentication if disabled
    if (DISABLE_AUTH) {
      req.user = { userId: 'anonymous', tokenId: 'no-auth', role: 'admin' }
      return next()
    }

    // Check for Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing Authorization header' })
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid Authorization header format' })
    }

    const token = authHeader.substring(7)
    const user = req.app.locals.validateToken(token)

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' })
    }

    req.user = user
    next()
  }

  // Middleware to check admin role
  const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin role required' })
    }
    next()
  }

  // Usage tracking middleware - track all REST API calls
  router.use((req, res, next) => {
    // Track the API call
    const usageTracker = req.app.locals.usageTracker
    if (usageTracker) {
      // Create endpoint identifier: method + path
      const endpoint = `${req.method} ${req.path}`
      usageTracker.track('restapi', endpoint)
    }
    next()
  })

  // Health check endpoint (no auth required)
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'WinCC OA REST API',
      uptime: process.uptime()
    })
  })

  // Usage stats endpoint (no auth required)
  router.get('/stats', (req, res) => {
    const usageTracker = req.app.locals.usageTracker
    if (!usageTracker) {
      return res.status(500).json({ error: 'Usage tracker not available' })
    }

    const sortBy = req.query.sortBy || 'name' // 'name' or 'count'
    const stats = sortBy === 'count'
      ? usageTracker.getStatsSortedByCount()
      : usageTracker.getStatsSortedByName()

    res.json({
      stats,
      total: stats.length,
      sortBy
    })
  })

  // Mount authentication routes (no auth required for login)
  router.use('/auth', authRoutes)

  // Apply authentication middleware to all routes below
  router.use(restAuthMiddleware)

  // Mount route modules
  router.use('/datapoints', datapointRoutes(winccoa, logger, resolvers, requireAdmin))
  router.use('/datapoint-types', datapointTypeRoutes(winccoa, logger, resolvers, requireAdmin))
  router.use('/tags', tagRoutes(winccoa, logger, resolvers))
  router.use('/alerts', alertRoutes(winccoa, logger, resolvers, requireAdmin))
  router.use('/cns', cnsRoutes(winccoa, logger, resolvers, requireAdmin))
  router.use('/system', systemRoutes(winccoa, logger, resolvers))
  router.use('/extras', extrasRoutes(winccoa, logger, resolvers, requireAdmin))
  router.use('/query', createQueryRouter(winccoa, logger, resolvers))

  // 404 handler
  router.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.path} not found`
    })
  })

  // Error handler
  router.use((err, req, res, next) => {
    logger.error('REST API Error:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    })
  })

  return router
}

module.exports = { createRestApi }
