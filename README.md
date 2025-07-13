# WinCC OA GraphQL Server

This is a GraphQL server implementation for WinCC OA Manager with authentication and WebSocket subscription support.

## ⚠️ CRITICAL SECURITY WARNING ⚠️

**DANGER: THE CURRENT AUTHENTICATION IS FAKE AND PROVIDES NO SECURITY!**

The authentication system in this implementation is a placeholder only. Any username/password combination will be accepted. This is intended for development and testing purposes only.

**DO NOT USE THIS IN PRODUCTION WITHOUT IMPLEMENTING REAL AUTHENTICATION!**

Real authentication implementation is planned for a future release. Until then, this server should only be used in secure, isolated environments.

## Features

- **GraphQL API** for WinCC OA data point operations
- **Authentication** with JWT tokens
- **WebSocket Subscriptions** for real-time data updates
- **Token Management** with automatic expiration and renewal
- **Comprehensive Error Handling** and logging
- **Health Check Endpoint** for monitoring

## Installation

```bash
npm install
```

## Configuration

The server can be configured using environment variables:

- `GRAPHQL_PORT`: Server port (default: 4000)
- `JWT_SECRET`: Secret key for JWT tokens (MUST be changed in production)
- `DISABLE_AUTH`: Set to any non-empty value to completely disable authentication (⚠️ **DANGEROUS** - only for development/testing)

## Running the Server

```bash
node "/opt/WinCC_OA/3.20/javascript/winccoa-manager/lib/bootstrap.js" -PROJ <project-name> -pmonIndex <nr> winccoa-graphql-server/index.js
```

Or simple add it to your project in the console.

## API Endpoints

- **GraphQL Endpoint**: `http://localhost:4000/graphql`
- **WebSocket Endpoint**: `ws://localhost:4000/graphql`
- **Health Check**: `http://localhost:4000/health`

## Authentication

### Login

```graphql
mutation {
  login(username: "user", password: "pass") {
    token
    expiresAt
  }
}
```

### Using the Token

Include the token in the Authorization header for all subsequent requests:

```
Authorization: Bearer <your-token>
```

For WebSocket connections, pass the token in the connection parameters:

```javascript
{
  connectionParams: {
    "Authorization": "Bearer <your-token>"
  }
}
```

## Example Queries

### Get Data Point Values
```graphql
query {
  dpGet(dpeNames: ["System1:ExampleDp.value", "System1:ExampleDp2.value"])
}
```

### Set Data Point Values
```graphql
mutation {
  dpSet(
    dpeNames: ["System1:ExampleDp.value"],
    values: [42]
  )
}
```

### Subscribe to Data Point Updates
```graphql
subscription {
  dpConnect(dpeNames: ["System1:ExampleDp.value"], answer: true) {
    dpeNames
    values
    type
    error
  }
}
```

## Token Management

- Tokens expire after 1 hour by default
- Token validity is automatically extended with each successful request
- Expired tokens are automatically cleaned up

## Security Notes

⚠️ **CRITICAL: FAKE AUTHENTICATION WARNING** ⚠️

**The current authentication system is a placeholder that accepts ANY username/password combination. This provides NO SECURITY whatsoever!**

**Production deployment requirements:**
1. **Implement Real Authentication**: Replace the dummy authentication with a proper user management system
2. **Change JWT_SECRET**: The default JWT secret MUST be changed for production use
3. **Use HTTPS**: Enable HTTPS for production deployments
4. **Implement Rate Limiting**: Add rate limiting to prevent abuse
5. **Access Control**: Implement proper access control and user permissions

**Environment Variable Security:**
- `DISABLE_AUTH`: When set to any non-empty value, this completely bypasses all authentication checks. This is extremely dangerous and should NEVER be used in production. Only use this for local development or testing where no security is needed.

**Until real authentication is implemented, this server should ONLY be used in secure, isolated development environments.**

## Development Notes

### Error Handling

All errors are logged with timestamps and include descriptive messages. The server implements graceful shutdown on SIGINT and SIGTERM signals.

## Testing

To test the GraphQL server:

1. Start the server
2. Navigate to `http://localhost:4000/graphql` for the GraphQL playground
3. First, obtain a token using the login mutation
4. Use the token for authenticated requests

## Troubleshooting

- **Connection refused**: Ensure the server is running and the port is not in use
- **Unauthorized errors**: Check that you're including a valid token
- **WebSocket connection failed**: Verify the token is included in connection parameters