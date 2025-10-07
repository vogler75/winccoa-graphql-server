# dpQuery Implementation Summary

## Overview

The `dpQuery` function from WinCC OA has been successfully implemented in both the GraphQL API and REST API.

## What is dpQuery?

`dpQuery()` retrieves attribute values using SQL-like statements. It returns results in a table-like structure where:
- `[0][0]` is empty
- `[0][1..n]` are column headers (attribute names)
- `[1..n][0]` are line names (data point names)
- `[1..n][1..n]` are the actual values

## Implementation Details

### 1. GraphQL API

**Location:** Available in the `Methods` type for backward compatibility

**Schema:** `graphql-v2/methods.gql:40`
```graphql
type Methods {
  dpQuery(query: String!): [[JSON!]!]!
}
```

**Resolver:** `graphql-v1/common.js:196-204`
```javascript
async dpQuery(_, { query }) {
  try {
    const result = await winccoa.dpQuery(query);
    return result;
  } catch (error) {
    logger.error('dpQuery error:', error);
    throw new Error(`Failed to execute dpQuery: ${error.message}`);
  }
}
```

**Usage Example:**
```graphql
query {
  methods {
    dpQuery(query: "SELECT '_original.._value' FROM 'ExampleDP_Arg*'")
  }
}
```

### 2. REST API

**Endpoint:** `POST /restapi/query`

**Route Handler:** `restapi/routes/datapoint-routes.js:463-500`

**Usage Example:**
```bash
curl -X POST http://localhost:4000/restapi/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT '\''_original.._value'\'' FROM '\''ExampleDP_Arg*'\''"
  }'
```

**Response:**
```json
{
  "result": [
    ["", ":_original.._value"],
    ["System1:ExampleDP_Arg1.", 2.43],
    ["System1:ExampleDP_Arg2.", 5.76]
  ]
}
```

## Documentation Updates

### OpenAPI Specification
- **File:** `restapi/openapi-full.yaml:796-851`
- **Endpoint:** `/restapi/query`
- **Method:** POST
- **Tag:** Data Points
- **Includes:** Full request/response schemas and examples

### REST API Documentation
- **File:** `restapi/REST-API.md:316-368`
- **Section:** Query
- **Includes:**
  - Description and usage
  - Request/response examples
  - Multiple curl examples with different query patterns
  - Response format explanation

### Interactive Documentation
The dpQuery endpoint is automatically available in the Swagger UI at:
- **URL:** `http://localhost:4000/api-docs`
- Users can test the endpoint directly from the browser

## Query Examples

### Basic Value Query
```sql
SELECT '_original.._value' FROM 'ExampleDP_Arg*'
```

### Multiple Attributes
```sql
SELECT '_original.._value', '_original.._stime' FROM 'ExampleDP_*'
```

### With WHERE Clause
```sql
SELECT '_original.._value' FROM '*' WHERE _DPT="ExampleDP_Arg"
```

### Complex Query
```sql
SELECT '_online.._value', '_online.._stime', '_online.._status'
FROM 'System1:Pump*'
WHERE _DPT="PumpType"
```

## Files Modified

1. `graphql-v2/methods.gql` - Added dpQuery to schema
2. `graphql-v1/common.js` - Implemented dpQuery resolver
3. `graphql-v2/methods-resolvers.js` - Exposed dpQuery in methods namespace
4. `restapi/routes/datapoint-routes.js` - Created query router and endpoint
5. `restapi/rest-api.js` - Mounted query router
6. `restapi/openapi-full.yaml` - Added OpenAPI documentation
7. `restapi/REST-API.md` - Added REST API documentation

## Testing

All implementation and documentation tests pass:

```bash
# Test GraphQL schema compilation
node test-v2-schema.js

# Test dpQuery implementation
node test-dpquery.js

# Test documentation completeness
node test-dpquery-docs.js
```

## Authentication

Both GraphQL and REST API endpoints require authentication:
- Use JWT token obtained from `/restapi/auth/login`
- Include in Authorization header: `Bearer <token>`
- Available for all authenticated users (read-only access)

## WinCC OA Documentation Reference

For detailed information about the dpQuery function syntax and capabilities, see:
- WinCC OA Documentation: `dpQuery()` function
- JavaScript API: `winccoa.dpQuery(query)`

## Compatibility

This implementation is fully compatible with:
- WinCC OA dpQuery() function syntax
- All existing GraphQL v1 queries (via methods namespace)
- New GraphQL v2 hierarchical schema
- REST API endpoints
