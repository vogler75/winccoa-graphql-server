// Authentication utilities for WinCC OA GraphQL / REST Server

const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const JWT_SECRET     = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const TOKEN_EXPIRY_MS = parseInt(process.env.TOKEN_EXPIRY_MS || '3600000') // default 1 hour

// Auth credentials from environment
const ADMIN_USERNAME    = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD
const READONLY_USERNAME = process.env.READONLY_USERNAME
const READONLY_PASSWORD = process.env.READONLY_PASSWORD
const DIRECT_ACCESS_TOKEN = process.env.DIRECT_ACCESS_TOKEN
const READONLY_TOKEN    = process.env.READONLY_TOKEN

// In-memory token store (replace with Redis or database in production)
const tokenStore = new Map()

/**
 * Generates a JWT token for user authentication.
 *
 * @param {string} userId - The user identifier
 * @param {string} [role='admin'] - The user role (admin or readonly)
 * @returns {{ token: string, expiresAt: number }}
 */
function generateToken(userId, role = 'admin') {
  const tokenId  = uuidv4()
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS

  const token = jwt.sign(
    { userId, tokenId, expiresAt, role },
    JWT_SECRET,
    { expiresIn: Math.floor(TOKEN_EXPIRY_MS / 1000) + 's' }
  )

  tokenStore.set(tokenId, { userId, role, expiresAt, lastActivity: Date.now() })

  return { token, expiresAt }
}

/**
 * Validates a JWT token or direct access token.
 *
 * @param {string} token
 * @param {object} logger
 * @returns {object|null} Token data if valid, null otherwise
 */
function validateToken(token, logger) {
  logger.debug(`Validating token: ${token ? token.substring(0, 20) + '...' : 'null'}`)

  if (DIRECT_ACCESS_TOKEN && token === DIRECT_ACCESS_TOKEN) {
    logger.debug('Direct access token matched')
    return { userId: 'direct-access', tokenId: 'direct', role: 'admin' }
  }

  if (READONLY_TOKEN && token === READONLY_TOKEN) {
    logger.debug('Read-only direct token matched')
    return { userId: 'readonly-direct', tokenId: 'readonly', role: 'readonly' }
  }

  try {
    const decoded   = jwt.verify(token, JWT_SECRET)
    const tokenData = tokenStore.get(decoded.tokenId)

    if (!tokenData) {
      logger.debug('Token not found in store')
      return null
    }

    if (Date.now() > tokenData.expiresAt) {
      logger.debug('Token expired, removing from store')
      tokenStore.delete(decoded.tokenId)
      return null
    }

    // Slide expiry on activity
    tokenData.lastActivity = Date.now()
    tokenData.expiresAt    = Date.now() + TOKEN_EXPIRY_MS
    tokenStore.set(decoded.tokenId, tokenData)

    logger.debug(`JWT token validated for user: ${tokenData.userId}, role: ${tokenData.role}`)
    return { userId: tokenData.userId, tokenId: decoded.tokenId, role: tokenData.role || 'admin' }
  } catch (error) {
    logger.debug(`JWT validation failed: ${error.message}`)
    return null
  }
}

/**
 * Authenticates a user by username/password against environment variables.
 *
 * @param {string} username
 * @param {string} password
 * @param {object} logger
 * @returns {object|null} User object if valid, null otherwise
 */
function authenticateUser(username, password, logger) {
  logger.debug(`Authentication attempt for username: ${username}`)

  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      logger.info(`Admin user authenticated: ${username}`)
      return { id: username, username, role: 'admin' }
    }
  }

  if (READONLY_USERNAME && READONLY_PASSWORD) {
    if (username === READONLY_USERNAME && password === READONLY_PASSWORD) {
      logger.info(`Read-only user authenticated: ${username}`)
      return { id: username, username, role: 'readonly' }
    }
  }

  // Development fallback when no credentials are configured
  if (!ADMIN_USERNAME && !READONLY_USERNAME) {
    if (username === 'dev' && password === 'dev') {
      logger.warn('Using development credentials — configure proper credentials in .env for production')
      return { id: username, username, role: 'admin' }
    }
  }

  logger.debug(`Authentication failed for username: ${username}`)
  return null
}

/**
 * Removes expired tokens from the in-memory store.
 * Call periodically (e.g. setInterval every 60 s).
 */
function purgeExpiredTokens() {
  const now = Date.now()
  for (const [tokenId, data] of tokenStore.entries()) {
    if (now > data.expiresAt) tokenStore.delete(tokenId)
  }
}

module.exports = {
  JWT_SECRET,
  TOKEN_EXPIRY_MS,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  READONLY_USERNAME,
  READONLY_PASSWORD,
  DIRECT_ACCESS_TOKEN,
  READONLY_TOKEN,
  tokenStore,
  generateToken,
  validateToken,
  authenticateUser,
  purgeExpiredTokens
}
