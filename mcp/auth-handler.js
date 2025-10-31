// MCP Authentication Handler
// Validates bearer tokens for MCP requests

/**
 * Validates a bearer token against the configured MCP_BEARER_TOKEN
 *
 * @param {string} token - Bearer token from Authorization header
 * @param {string} configuredToken - Configured MCP_BEARER_TOKEN from environment
 * @param {object} logger - Logger instance
 * @returns {boolean} true if token is valid
 */
function validateBearerToken(token, configuredToken, logger) {
  // If no token is configured, authentication is disabled
  if (!configuredToken) {
    logger.debug('MCP Bearer Token validation disabled (no token configured)');
    return true;
  }

  // If no token provided, deny
  if (!token) {
    logger.warn('MCP request missing Authorization header');
    return false;
  }

  // Extract bearer token from header value
  let bearerToken = token;
  if (token.toLowerCase().startsWith('bearer ')) {
    bearerToken = token.substring(7);
  }

  // Compare tokens
  const isValid = bearerToken === configuredToken;

  if (!isValid) {
    logger.warn('MCP request with invalid bearer token (last 10 chars): ...%s', bearerToken.slice(-10));
  } else {
    logger.debug('MCP bearer token validated successfully');
  }

  return isValid;
}

/**
 * Extracts bearer token from Authorization header
 *
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Bearer token or null if not present
 */
function extractBearerToken(authHeader) {
  if (!authHeader) {
    return null;
  }

  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Creates authentication middleware for MCP requests
 *
 * @param {string} configuredToken - Configured MCP_BEARER_TOKEN
 * @param {object} logger - Logger instance
 * @returns {Function} Middleware function that validates requests
 */
function createAuthMiddleware(configuredToken, logger) {
  return (req, res, next) => {
    // If no token configured, skip authentication
    if (!configuredToken) {
      logger.debug('MCP auth middleware: authentication disabled');
      req.mcp = { authenticated: true, token: null };
      return next();
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = extractBearerToken(authHeader);

    if (!validateBearerToken(token, configuredToken, logger)) {
      logger.warn('MCP authentication failed for request');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }

    req.mcp = { authenticated: true, token };
    next();
  };
}

/**
 * Validates authentication context for MCP tool execution
 * Returns error object if validation fails
 *
 * @param {object} authContext - Authentication context from request
 * @param {object} logger - Logger instance
 * @returns {object|null} Error object if validation failed, null if successful
 */
function validateAuthContext(authContext, logger) {
  if (!authContext || !authContext.authenticated) {
    logger.warn('MCP tool execution: authentication validation failed');
    return {
      code: 'UNAUTHORIZED',
      message: 'Request is not authenticated'
    };
  }

  return null;
}

module.exports = {
  validateBearerToken,
  extractBearerToken,
  createAuthMiddleware,
  validateAuthContext
};
