# WinCC OA GraphQL Server

This is a GraphQL server implementation for WinCC OA Manager with authentication and WebSocket subscription support.

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

## Running the Server

### Development Mode
```bash
node index.js
```

### Production Mode with WinCC OA Manager
```bash
node "/opt/WinCC_OA/3.20/javascript/winccoa-manager/lib/bootstrap.js" -PROJ "TestMass" -pmonIndex 8 graphql/index.js
```

Or use the npm script:
```bash
npm start
```

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
    authorization: 'Bearer <your-token>'
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

1. **Change JWT_SECRET**: The default JWT secret MUST be changed for production use
2. **Implement User Management**: The current implementation uses dummy authentication
3. **Use HTTPS**: Enable HTTPS for production deployments
4. **Implement Rate Limiting**: Add rate limiting to prevent abuse

## Development Notes

### Adding New Resolvers

1. Add the type definition to `winccoa_graphql_schema.gql`
2. Implement the resolver in the `resolvers` object in `index.js`
3. Use the `winccoa` object to interact with WinCC OA

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