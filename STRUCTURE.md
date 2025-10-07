# Project Structure

This document describes the organization of the GraphQL API codebase.

## Overview

The codebase is organized into two main GraphQL implementations:

- **graphql-v1/** - Original flat API (for backward compatibility and REST API)
- **graphql-v2/** - Modern hierarchical GraphQL API (current production)

## Directory Structure

```
winccoa-graphql-server/
├── graphql-v1/                 # V1 Implementation (flat API)
│   ├── common.gql              # Base types, queries, mutations
│   ├── common.js               # Data point resolvers
│   ├── alerting.gql            # Alert schema
│   ├── alerting.js             # Alert resolvers
│   ├── cns.gql                 # CNS schema
│   ├── cns.js                  # CNS resolvers
│   ├── extras.gql              # OPC UA schema
│   ├── extras.js               # OPC UA resolvers
│   └── subscriptions.js        # WebSocket subscriptions
│
├── graphql-v2/                 # V2 Implementation (hierarchical API)
│   ├── index.js                # Module loader - exports typeDefs array
│   ├── resolvers.js            # Main resolver combiner
│   ├── helpers.js              # Shared utility functions
│   │
│   ├── core.gql                # Scalars and enums
│   ├── query.gql               # Root Query type
│   ├── system.gql              # System type and version info
│   ├── datapoint.gql           # DataPoint hierarchy types
│   ├── tag.gql                 # Tag convenience types
│   ├── alert.gql               # Alert types
│   ├── cns.gql                 # CNS hierarchy types
│   ├── methods.gql             # Backward compatibility layer
│   ├── mutations.gql           # All mutations
│   ├── subscriptions.gql       # Real-time subscriptions
│   │
│   ├── query-resolvers.js      # Top-level Query resolvers
│   ├── system-resolvers.js     # System type resolvers
│   ├── datapoint-resolvers.js  # DataPoint/Element resolvers
│   ├── tag-resolvers.js        # Tag resolvers
│   ├── alert-resolvers.js      # Alert resolvers
│   ├── cns-resolvers.js        # CNS hierarchy resolvers
│   └── methods-resolvers.js    # Backward compat delegates
│
├── restapi/                    # REST API (uses V1 resolvers)
│   ├── rest-api.js             # Main REST router
│   ├── openapi.js              # OpenAPI spec loader
│   ├── openapi-full.yaml       # Complete OpenAPI 3.0 spec
│   └── routes/                 # REST endpoint handlers
│       ├── auth-routes.js
│       ├── datapoint-routes.js
│       ├── tag-routes.js
│       ├── alert-routes.js
│       ├── cns-routes.js
│       └── ...
│
├── public/                     # Static assets
│   └── index.html              # Landing page
│
├── index.js                    # Main server entry point
├── test-v2-schema.js           # Schema validation test
├── README.md                   # Project documentation
├── GRAPHQL-V2.md               # V2 API guide
└── STRUCTURE.md                # This file
```

## GraphQL V2 Architecture

### Schema Modules

The V2 schema is split into logical domain modules:

1. **core.gql** - Foundation
   - Scalars: `JSON`, `LangString`, `Time`
   - Enums: `ElementType`, `CtrlType`

2. **query.gql** - Entry Points
   - `system()` - Access to systems
   - `dataPoint()` - Direct DP access
   - `tag()` - Tag convenience access
   - `methods` - V1 compatibility

3. **system.gql** - System Domain
   - `System` type with nested resolvers
   - Version and redundancy info
   - System-level DP/type access

4. **datapoint.gql** - Data Point Domain
   - `DataPoint` - Main DP type
   - `DataPointElement` - Elements within DP
   - `DataPointType` - Type definitions
   - History and navigation

5. **tag.gql** - Tag Convenience Layer
   - `Tag` - Value + metadata wrapper
   - Historical tag data

6. **alert.gql** - Alert Domain
   - `Alert` - Typed alerts
   - Alert attributes and metadata
   - Severity mapping

7. **cns.gql** - CNS Hierarchy
   - `CNS` → `CNSView` → `CNSTree` → `CNSNode`
   - Navigation and search
   - Property access

8. **methods.gql** - Backward Compatibility
   - All V1 functions in `Methods` type
   - Legacy types (`MethodTag`, etc.)
   - Zero breaking changes

9. **mutations.gql** - Write Operations
   - Grouped by domain
   - Authentication
   - CRUD operations

10. **subscriptions.gql** - Real-time Updates
    - WebSocket subscriptions
    - Unchanged from V1

### Resolver Modules

Resolvers are organized by domain, matching schema modules:

- **query-resolvers.js** - Top-level entry points
- **system-resolvers.js** - System type field resolvers
- **datapoint-resolvers.js** - DataPoint types (largest module)
- **tag-resolvers.js** - Tag convenience layer
- **alert-resolvers.js** - Alert attribute mapping
- **cns-resolvers.js** - CNS hierarchy navigation
- **methods-resolvers.js** - Delegates to V1 resolvers

### Helper Functions

**helpers.js** contains shared utilities:
- `parseDataPointName()` - Parse system:dpName format
- `getSystemInfo()` - Fetch system metadata

## Loading Mechanism

### Schema Loading

The V2 schema is loaded via `graphql-v2/index.js`:

```javascript
const schemaV2 = require('./graphql-v2');
const typeDefs = schemaV2.typeDefs;  // Array of schema strings
```

This automatically loads and combines all `.gql` modules in the correct order.

### Resolver Loading

Resolvers are loaded via `graphql-v2/resolvers.js`:

```javascript
const { createV2Resolvers } = require('./graphql-v2/resolvers');

const v2Resolvers = createV2Resolvers(winccoa, logger, oldResolvers);
```

The function:
1. Creates domain-specific resolvers
2. Combines them into single resolver object
3. Includes V1 mutations and subscriptions
4. Returns complete resolver map

## REST API Integration

The REST API uses **V1 resolvers** for backward compatibility:

```javascript
// Create V1 resolvers for REST API
const oldResolvers = mergeResolvers(
  commonResolvers,
  alertResolvers,
  cnsResolvers,
  extrasResolvers
);

// Pass to REST API
const restApi = createRestApi(winccoa, logger, oldResolvers, DISABLE_AUTH);
```

## Development Workflow

### Adding a New Query

1. Add type definition to appropriate `.gql` file (e.g., `datapoint.gql`)
2. Add resolver to corresponding resolver file (e.g., `datapoint-resolvers.js`)
3. Test with `node test-v2-schema.js`

### Adding a New Type

1. Create new `.gql` file in `graphql-v2/`
2. Export from `graphql-v2/index.js`
3. Create new resolver file
4. Import and combine in `graphql-v2/resolvers.js`

### Modifying V1 (for REST API)

1. Edit files in `graphql-v1/`
2. Changes automatically available to REST API
3. Changes available to V2 via `methods` type

## Testing

### Schema Validation

```bash
node test-v2-schema.js
```

Validates:
- All schema modules load correctly
- Schema compiles without errors
- All types are properly defined
- Resolvers match schema structure

### Syntax Checking

```bash
# Check main server
node -c index.js

# Check all V2 files
for file in graphql-v2/*.js; do node -c "$file"; done
```

### Full Server Test

```bash
# Start with auth disabled for testing
node index.js --no-auth
```

## Key Design Principles

1. **Separation of Concerns**
   - Each domain in its own file
   - Schema and resolvers kept separate
   - V1 and V2 isolated

2. **Backward Compatibility**
   - V1 resolvers preserved
   - `Methods` type delegates to V1
   - REST API uses V1
   - Zero breaking changes

3. **Modularity**
   - Easy to find relevant code
   - Simple to add new features
   - Clear dependencies

4. **Type Safety**
   - Proper GraphQL types (not just JSON)
   - Enum validation
   - Input validation

5. **Maintainability**
   - Clear file naming
   - Consistent patterns
   - Good documentation

## Migration Notes

### From Monolithic to Modular

The previous structure had:
- `graphql/schema-v2.gql` (906 lines)
- `graphql/resolvers-v2.js` (1039 lines)

Now split into:
- 10 schema files (~100 lines each)
- 8 resolver files (~100-300 lines each)
- 1 helper file
- 1 combiner file

Benefits:
- Easier to navigate
- Clearer ownership
- Better for collaboration
- Faster to locate code
- Simpler to test individual domains

## Further Reading

- [README.md](./README.md) - Project overview and setup
- [GRAPHQL-V2.md](./GRAPHQL-V2.md) - V2 API usage guide
- [CLAUDE.md](./CLAUDE.md) - Development guidelines
