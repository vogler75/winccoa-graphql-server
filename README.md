# WinCC OA GraphQL Server

A secure GraphQL server implementation for WinCC OA Manager with environment-based authentication, JWT tokens, and WebSocket subscription support.

## Features

- **Environment-Based Authentication** with configurable credentials
- **Multiple Authentication Methods**:
  - Username/Password with JWT tokens
  - Direct access tokens (non-JWT)
  - Read-only user support
- **GraphQL API** for WinCC OA data point operations
- **WebSocket Subscriptions** for real-time data updates
- **Role-Based Access Control** (admin vs read-only)
- **Token Management** with automatic expiration and renewal
- **Comprehensive Error Handling** and logging
- **Health Check Endpoint** for monitoring

## Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install the dotenv package if not already installed:**
   ```bash
   npm install dotenv
   ```

## Configuration

### Environment Setup

The server uses a `.env` file for configuration, which must be placed in the same directory as `index.js`. The server will automatically look for the `.env` file in its own directory, regardless of where it's started from.

**Step 1:** Copy the example environment file:
```bash
cp .env.example .env
```

**Step 2:** Edit the `.env` file with your configuration:

```env
# GraphQL Server Configuration
# Copy this file to .env and adjust the values

# Server Port
GRAPHQL_PORT=4000

# Authentication Settings
# Set to true to disable all authentication (not recommended for production)
DISABLE_AUTH=false

# JWT Secret Key (change this in production!)
JWT_SECRET=your-secret-key-change-in-production

# Admin User Credentials
# If set, these credentials can be used to login with full access
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme

# Direct Access Token (non-JWT)
# If set, this token can be used directly in the Authorization header for full access
# Example: Authorization: Bearer your-direct-access-token
DIRECT_ACCESS_TOKEN=

# Read-Only User Credentials
# If set, these credentials provide read-only access (queries only, no mutations)
READONLY_USERNAME=readonly
READONLY_PASSWORD=readonly123

# Read-Only Direct Access Token (non-JWT)
# If set, this token provides direct read-only access
# Example: Authorization: Bearer your-readonly-token
READONLY_TOKEN=

# Token Expiry (in milliseconds)
# Default: 3600000 (1 hour)
TOKEN_EXPIRY_MS=3600000

# Logging Level
# Options: debug, info, warn, error
LOG_LEVEL=info
```

### Configuration File Location

**Important:** The `.env` file must be placed in the same directory as the `index.js` file:

```
winccoa-graphql-server/
├── index.js          # Main server file
├── .env              # Configuration file (create this)
├── .env.example      # Example configuration
├── package.json
└── ...
```

The server automatically detects its own directory and looks for the `.env` file there, so it will work regardless of where you start the server from.

### Startup Configuration Verification

When the server starts, it will display detailed information about:

- **Environment file loading status**
- **Which credentials are configured**
- **Authentication warnings and recommendations**

Example startup output:
```
Looking for .env file at: /path/to/winccoa-graphql-server/.env
✅ .env file loaded successfully
   Loaded variables: GRAPHQL_PORT, ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET, ...

Starting GraphQL server on port 4000 with DISABLE_AUTH=false

🔐 Authentication Configuration:
   Admin Username: ✅ Set
   Admin Password: ✅ Set
   Direct Access Token: ❌ Not set
   Readonly Username: ✅ Set
   Readonly Password: ✅ Set
   Readonly Token: ❌ Not set
   JWT Secret: ✅ Custom
   Token Expiry: 3600000ms (60 minutes)

✅ Authentication is properly configured.
```

### Authentication Options

You can configure multiple authentication methods:

1. **Username/Password Authentication**: Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` for full access, or `READONLY_USERNAME` and `READONLY_PASSWORD` for read-only access.

2. **Direct Token Authentication**: Set `DIRECT_ACCESS_TOKEN` for full access or `READONLY_TOKEN` for read-only access without requiring login.

3. **Development Mode**: If no credentials are configured, you can use `dev/dev` for development.

## Running the Server

```bash
# Using WinCC OA bootstrap
node "/opt/WinCC_OA/3.20/javascript/winccoa-manager/lib/bootstrap.js" -PROJ <project-name> -pmonIndex <nr> winccoa-graphql-server/index.js

# Or for development
npm run dev
```

## API Endpoints

- **GraphQL Endpoint**: `http://localhost:4000/graphql`
- **WebSocket Endpoint**: `ws://localhost:4000/graphql`
- **Health Check**: `http://localhost:4000/health`

## Authentication

### Method 1: Username/Password Login

```graphql
mutation {
  login(username: "admin", password: "your-password") {
    token
    expiresAt
  }
}
```

Then use the returned JWT token in subsequent requests:
```
Authorization: Bearer <jwt-token>
```

### Method 2: Direct Token Access

Use the configured direct access token directly:
```
Authorization: Bearer your-direct-access-token
```

## User Roles

### Admin Users
- Can perform all queries and mutations
- Full access to all GraphQL operations
- Configured via `ADMIN_USERNAME`/`ADMIN_PASSWORD` or `DIRECT_ACCESS_TOKEN`

### Read-Only Users  
- Can only perform queries
- Mutations are blocked with "Forbidden" error
- Configured via `READONLY_USERNAME`/`READONLY_PASSWORD` or `READONLY_TOKEN`

## Example Usage

### Login and Query (Admin)
```graphql
# 1. Login
mutation {
  login(username: "admin", password: "your-password") {
    token
    expiresAt
  }
}

# 2. Query with token
query {
  dpGet(dpeNames: ["System1:ExampleDp.value"])
}

# 3. Mutation (admin only)
mutation {
  dpSet(dpeNames: ["System1:ExampleDp.value"], values: [42])
}
```

### Read-Only Access
```graphql
# Login as read-only user
mutation {
  login(username: "readonly", password: "readonly-password") {
    token
  }
}

# Queries work
query {
  dpTypes
}

# Mutations are blocked
mutation {
  dpSet(dpeNames: ["System1:ExampleDp.value"], values: [42])
  # Returns: "Forbidden: Read-only users cannot perform mutations"
}
```

### WebSocket Subscriptions

For WebSocket connections, pass the token in connection parameters:

```javascript
const client = createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: {
    "Authorization": "Bearer <your-token>"
  }
});
```

## Security Features

### Secure Authentication
- Environment-based credential configuration
- JWT tokens with configurable expiration
- Direct token support for API integrations
- Proper GraphQL operation parsing (prevents comment bypass attacks)

### Role-Based Access Control
- Admin users: Full access to queries and mutations
- Read-only users: Query access only, mutations blocked
- Proper permission checking after GraphQL parsing

### Token Management
- Automatic token expiration and cleanup
- Token validity extension on each request
- Secure token validation

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GRAPHQL_PORT` | No | 4000 | Server port |
| `DISABLE_AUTH` | No | false | Disable all authentication (⚠️ dangerous) |
| `JWT_SECRET` | Yes | - | JWT signing secret (change in production!) |
| `TOKEN_EXPIRY_MS` | No | 3600000 | Token expiry time in milliseconds |
| `ADMIN_USERNAME` | No | - | Admin username |
| `ADMIN_PASSWORD` | No | - | Admin password |
| `DIRECT_ACCESS_TOKEN` | No | - | Direct access token for full access |
| `READONLY_USERNAME` | No | - | Read-only username |
| `READONLY_PASSWORD` | No | - | Read-only password |
| `READONLY_TOKEN` | No | - | Direct read-only token |

## Testing

Run the authentication tests:

```bash
# Test environment-based authentication
node test-env-auth.js

# Test basic functionality
node test-graphql.js
```

## Production Deployment

### Security Checklist

- ✅ **Configure Strong Credentials**: Set secure usernames and passwords in `.env`
- ✅ **Change JWT Secret**: Use a strong, unique `JWT_SECRET`
- ✅ **Use HTTPS**: Deploy behind HTTPS proxy
- ✅ **Secure Environment**: Keep `.env` file secure and not in version control
- ✅ **Token Security**: Use strong direct access tokens if needed
- ✅ **Monitor Access**: Log and monitor authentication attempts

### Recommended Setup

1. Use strong, unique passwords for admin and readonly users
2. Set a cryptographically secure JWT_SECRET (32+ characters)
3. Configure appropriate token expiry times
4. Use direct tokens only for trusted API integrations
5. Deploy behind a reverse proxy with HTTPS
6. Implement rate limiting and monitoring

## Troubleshooting

### Environment Configuration Issues

- **"Cannot find module 'dotenv'"**: Run `npm install dotenv` to install the dotenv package
- **".env file not found or could not be loaded"**: 
  - Ensure the `.env` file exists in the same directory as `index.js`
  - Check file permissions (must be readable)
  - Verify the file is named exactly `.env` (not `.env.txt` or similar)
- **Environment variables not loaded**: 
  - Check the startup log for "Looking for .env file at: ..." to see the expected path
  - Ensure `.env` file format is correct (KEY=value, no spaces around =)
  - Check for syntax errors in the .env file
- **Server shows "No authentication credentials configured"**:
  - Check that your `.env` file contains `ADMIN_USERNAME` and `ADMIN_PASSWORD`
  - Verify the server was restarted after creating/modifying the `.env` file
  - Look at the startup configuration display to see which values are loaded

### Authentication Issues

- **"Unauthorized" errors**: 
  - Check that credentials in `.env` match what you're using for login
  - Ensure the server was restarted after changing `.env`
  - Check the server logs for authentication debugging information
- **"Invalid username or password"**: 
  - Verify the exact username/password in your `.env` file
  - Check for extra spaces or special characters
  - Try the development credentials `dev/dev` if no .env is configured
- **"Forbidden" for read-only users**: This is expected behavior for mutations
- **Direct tokens not working**: 
  - Ensure server was restarted after adding tokens to `.env`
  - Check that `DIRECT_ACCESS_TOKEN` or `READONLY_TOKEN` are set correctly
  - Verify you're using the exact token string in the Authorization header

### Development vs Production

- **Development Mode**: If no credentials are configured in `.env`, use `dev/dev` for testing
- **Production Mode**: Always configure proper credentials in `.env` and restart the server

### Server Startup Diagnostics

Check the server startup output for diagnostic information:

```bash
# Good startup (with .env file):
Looking for .env file at: /path/to/.env
✅ .env file loaded successfully
🔐 Authentication Configuration: [shows configured options]
✅ Authentication is properly configured.

# Missing .env file:
Looking for .env file at: /path/to/.env
⚠️  .env file not found or could not be loaded: ENOENT: no such file or directory
⚠️  WARNING: No authentication credentials configured!

# Dotenv module missing:
Error: Cannot find module 'dotenv'
# Solution: Run "npm install dotenv"
```