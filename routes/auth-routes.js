// Authentication routes for REST API
const express = require('express')
const router = express.Router()

/**
 * POST /restapi/auth/login
 * Login with username and password
 *
 * Body:
 * {
 *   "username": "string",
 *   "password": "string"
 * }
 *
 * Response:
 * {
 *   "token": "string",
 *   "expiresAt": "ISO8601 timestamp"
 * }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required'
      })
    }

    // Use the authenticateUser and generateToken functions from app.locals
    const user = req.app.locals.authenticateUser(username, password)

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password'
      })
    }

    const { token, expiresAt } = req.app.locals.generateToken(user.id, user.role)

    res.json({
      token,
      expiresAt: new Date(expiresAt).toISOString()
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
