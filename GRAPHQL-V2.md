# GraphQL V2 Schema - Hierarchical API Design

## Overview

The GraphQL V2 schema introduces a **hierarchical, graph-native** design that better represents the relationships between WinCC OA entities. This replaces the previous flat, function-oriented API while maintaining **100% backward compatibility** through the `methods` type.

## Key Improvements

### 1. **Hierarchical Navigation**
Instead of calling separate functions, you can now navigate relationships naturally:

**Old way (still works via `methods`):**
```graphql
query {
  methods {
    dpGet(dpeNames: ["Pump1.value"])
    dpTypeName(dp: "Pump1")
  }
}
```

**New way (V2):**
```graphql
query {
  dataPoint(name: "Pump1") {
    name
    type {
      name
    }
    element(path: "value") {
      value
      timestamp
      status {
        online
      }
    }
  }
}
```

### 2. **Type Safety**
Instead of returning generic `JSON!`, the V2 schema uses proper GraphQL types:

- `System` - Represents a WinCC OA system
- `DataPoint` - A data point with its type and elements
- `DataPointElement` - An element within a data point
- `Tag` - Convenience wrapper with value + metadata
- `Alert` - Typed alert with attributes
- `CNS` hierarchy - Views → Trees → Nodes

### 3. **Relationship Traversal**
You can traverse relationships in both directions:

```graphql
query {
  dataPoint(name: "Pump1") {
    # Get CNS nodes that reference this data point
    cnsNodes {
      path
      displayName
      parent {
        name
      }
    }

    # Get recent alerts for this data point
    alerts(limit: 10) {
      time
      text
      acknowledged
    }
  }
}
```

### 4. **Nested Field Resolvers**
Each type has field resolvers that fetch related data on demand:

```graphql
query {
  system {
    name
    dataPoints(pattern: "Pump*", limit: 10) {
      name
      type {
        name
        count  # How many DPs use this type?
      }
      value
      alerts(limit: 5) {
        time
        severity
      }
    }
  }
}
```

## Schema Structure

### Top-Level Entry Points

```graphql
type Query {
  # System access
  system(name: String): System!           # Current or named system
  systems: [System!]!                      # All systems

  # Direct data point access
  dataPoint(name: String!): DataPoint      # Single data point
  dataPoints(pattern: String, type: String, limit: Int, offset: Int): [DataPoint!]!

  # Tag convenience access
  tag(name: String!): Tag                  # Single tag
  tags(names: [String!]!): [Tag!]!        # Multiple tags

  # Backward compatibility
  methods: Methods!                        # All old functions

  # Version info
  version: VersionInfo!
}
```

### System Type

Represents a WinCC OA system (local or distributed):

```graphql
type System {
  id: Int!
  name: String!
  isLocal: Boolean!
  isActive: Boolean!

  # Data point access
  dataPoint(name: String!): DataPoint
  dataPoints(pattern: String, type: String, limit: Int, offset: Int): [DataPoint!]!

  # Type management
  dataPointType(name: String!): DataPointType
  dataPointTypes(pattern: String, includeEmpty: Boolean): [DataPointType!]!

  # Alerts
  alerts(startTime: Time, endTime: Time, dataPoint: String, limit: Int, offset: Int): [Alert!]!

  # CNS access
  cns: CNS!

  # System info
  version: SystemVersion!
  redundancy: RedundancyInfo!
}
```

### DataPoint Type

Represents a WinCC OA data point:

```graphql
type DataPoint {
  name: String!
  fullName: String!
  exists: Boolean!

  # Type information
  system: System!
  type: DataPointType!

  # Element access
  element(path: String!): DataPointElement
  elements(pattern: String): [DataPointElement!]!
  value: JSON  # Convenience: root value

  # Relationships
  alerts(limit: Int, offset: Int): [Alert!]!
  cnsNodes: [CNSNode!]!
}
```

### DataPointElement Type

Represents an element within a data point:

```graphql
type DataPointElement {
  name: String!
  path: String!

  # Value and metadata
  value: JSON
  timestamp: Time
  status: ElementStatus!
  elementType: ElementType!

  # Navigation
  dataPoint: DataPoint!
  parent: DataPointElement
  children: [DataPointElement!]!

  # History
  history(startTime: Time!, endTime: Time!, limit: Int, offset: Int): ElementHistory!
}
```

### CNS Hierarchy

```graphql
type CNS {
  view(name: String!): CNSView
  views: [CNSView!]!
  searchNodes(pattern: String!, viewPath: String, ...): [CNSNode!]!
  searchByDataPoint(dataPoint: String!, ...): [CNSNode!]!
}

type CNSView {
  name: String!
  displayName: LangString!
  separator: String
  system: System!

  tree(name: String!): CNSTree
  trees: [CNSTree!]!
  exists: Boolean!
}

type CNSTree {
  name: String!
  displayName: LangString!
  root: CNSNode!
  view: CNSView!
  exists: Boolean!
}

type CNSNode {
  name: String!
  path: String!
  displayName: LangString!
  displayPath: LangString!

  # Navigation
  parent: CNSNode
  children: [CNSNode!]!
  root: CNSNode!
  tree: CNSTree!

  # Data point link
  dataPoint: DataPoint
  dataPointName: String

  # Properties
  property(key: String!): JSON
  properties: [CNSProperty!]!

  exists: Boolean!
}
```

### Alert Types

```graphql
type Alert {
  time: Time!
  count: Int!

  # Data point reference
  dataPoint: DataPoint!
  dataPointElementName: String!

  # Attribute access
  attribute(name: String!): JSON
  attributes: [AlertAttribute!]!

  # Convenience accessors
  text: String
  acknowledged: Boolean
  acknowledgedBy: String
  acknowledgedAt: Time
  priority: Int
  severity: String  # Derived from priority
}
```

## Backward Compatibility

All existing queries work through the `methods` type:

```graphql
query LegacyQuery {
  methods {
    # All old functions available here
    dpGet(dpeNames: ["Pump1.value"])
    dpNames(dpPattern: "*")
    dpTypes(pattern: "*")
    tagGet(dpeNames: ["Pump1.value"])
    cnsGetViews(systemName: "System1")
    # ... all other functions
  }
}
```

## Migration Guide

### Simple Value Reads

**Before:**
```graphql
{ methods { dpGet(dpeNames: ["Pump1.value"]) } }
```

**After:**
```graphql
{ dataPoint(name: "Pump1") { element(path: "value") { value } } }
```

### Data Point Listing

**Before:**
```graphql
{ methods { dpNames(dpPattern: "Pump*") } }
```

**After:**
```graphql
{
  dataPoints(pattern: "Pump*") {
    name
    type { name }
    value
  }
}
```

### Tag Queries

**Before:**
```graphql
{
  methods {
    tagGet(dpeNames: ["Pump1.value"])
  }
}
```

**After:**
```graphql
{
  tags(names: ["Pump1.value"]) {
    name
    value
    timestamp
    status { online }
  }
}
```

### Historical Data

**Before:**
```graphql
{
  methods {
    dpGetPeriod(
      startTime: "2024-01-01T00:00:00Z"
      endTime: "2024-01-02T00:00:00Z"
      dpeNames: ["Pump1.value"]
    )
  }
}
```

**After:**
```graphql
{
  dataPoint(name: "Pump1") {
    element(path: "value") {
      history(
        startTime: "2024-01-01T00:00:00Z"
        endTime: "2024-01-02T00:00:00Z"
        limit: 100
      ) {
        values {
          timestamp
          value
        }
      }
    }
  }
}
```

### CNS Navigation

**Before:**
```graphql
{
  methods {
    cnsGetViews(systemName: "System1")
    cnsGetTrees(view: "MyView")
    cnsGetChildren(cnsPath: "MyView/MyTree/Root")
  }
}
```

**After:**
```graphql
{
  system {
    cns {
      view(name: "MyView") {
        trees {
          name
          root {
            children {
              name
              displayName
              dataPoint {
                name
                value
              }
            }
          }
        }
      }
    }
  }
}
```

## Namespaced Mutations

V2 organizes mutations by domain for better discoverability:

```graphql
mutation {
  # Authentication at top level
  login(username: "user", password: "pass") {
    token
    expiresAt
  }

  # Data point operations
  dataPoint {
    create(dpeName: "NewPump", dpType: "ExampleDP_Float")
    set(dpeNames: ["Pump1.value"], values: [42.5])
  }

  # CNS operations
  cns {
    createView(view: "MyView", displayName: {en_US: "My View"})
    addNode(
      cnsParentPath: "MyView/MyTree/Root"
      name: "Node1"
      displayName: {en_US: "Node 1"}
      dp: "Pump1"
    )
  }

  # Alert operations
  alert {
    set(
      alerts: [{time: "2024-01-01T12:00:00Z", count: 1, dpe: "Pump1"}]
      values: [{_alert_hdl.._ack_state: 1}]
    )
  }

  # OPC UA configuration
  opcua {
    setAddress(
      datapointName: "Pump1.value"
      driverNumber: 1
      addressDirection: 1
      addressDataType: 5
      serverName: "OpcServer"
      subscriptionName: "Sub1"
      nodeId: "ns=2;s=Pump.Value"
    )
  }
}
```

### Migration from Flat Mutations

**Old way (still works via REST API):**
```graphql
mutation {
  dpCreate(dpeName: "NewPump", dpType: "ExampleDP_Float")
  dpSet(dpeNames: ["Pump1.value"], values: [42.5])
}
```

**New way (namespaced):**
```graphql
mutation {
  dataPoint {
    create(dpeName: "NewPump", dpType: "ExampleDP_Float")
    set(dpeNames: ["Pump1.value"], values: [42.5])
  }
}
```

Benefits:
- Better organization in GraphQL Playground/IDE
- Clear domain boundaries
- Easier to discover related operations
- Follows GraphQL best practices

## Example Queries

### Get System Overview
```graphql
query SystemOverview {
  system {
    name
    version {
      display
    }
    redundancy {
      isConfigured
      isActive
    }
    dataPointTypes(includeEmpty: false) {
      name
      count
    }
  }
}
```

### Monitor Multiple Data Points
```graphql
query MonitorPumps {
  dataPoints(pattern: "Pump*", limit: 10) {
    name
    type { name }
    element(path: "status") {
      value
      timestamp
      status {
        online
      }
    }
    alerts(limit: 5) {
      time
      text
      severity
      acknowledged
    }
  }
}
```

### CNS Tree with Data Points
```graphql
query CNSTreeWithData {
  system {
    cns {
      view(name: "Plant") {
        tree(name: "Equipment") {
          root {
            name
            children {
              name
              displayName
              dataPoint {
                name
                value
                element(path: "status") {
                  value
                  timestamp
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Alert Dashboard
```graphql
query AlertDashboard {
  system {
    alerts(
      startTime: "2024-01-01T00:00:00Z"
      endTime: "2024-01-02T00:00:00Z"
      limit: 50
    ) {
      time
      dataPoint {
        name
        type { name }
      }
      text
      severity
      priority
      acknowledged
      acknowledgedBy
      acknowledgedAt
    }
  }
}
```

## Implementation Details

### File Structure

- `graphql/schema-v2.gql` - Complete V2 schema definition
- `graphql/resolvers-v2.js` - Hierarchical resolver implementation
- `graphql/common.js` - Original flat resolvers (used by Methods type)
- `graphql/alerting.js` - Alert resolvers
- `graphql/cns.js` - CNS resolvers
- `graphql/extras.js` - OPC UA and extras
- `index.js` - Server setup with V2 schema

### Resolver Pattern

Each type has field resolvers that fetch data on demand:

```javascript
DataPoint: {
  async type(dataPoint) {
    const typeName = await winccoa.dpTypeName(dataPoint.name)
    return { name: typeName, system: dataPoint.system }
  },

  async value(dataPoint) {
    const result = await winccoa.dpGet([dataPoint.fullName])
    return result[0]
  },

  async alerts(dataPoint, { limit, offset }) {
    // Fetch alerts for this specific data point
    // Returns properly typed Alert objects
  }
}
```

## Benefits

1. **Better Developer Experience** - Natural relationship traversal
2. **Type Safety** - Proper GraphQL types instead of generic JSON
3. **Reduced Over-fetching** - Only fetch what you need
4. **Improved Discoverability** - GraphQL introspection shows relationships
5. **100% Backward Compatible** - All existing queries still work
6. **Future-Proof** - Easy to extend with new relationships

## Testing

Run the schema validation test:

```bash
node test-v2-schema.js
```

This validates that:
- Schema compiles correctly
- All types are properly defined
- Resolvers match schema structure
- Backward compatibility is maintained

## Subscriptions

Subscriptions remain **unchanged** from the original implementation:

```graphql
subscription {
  dpConnect(dpeNames: ["Pump1.value"], answer: true) {
    dpeNames
    values
    type
  }
}
```

All existing subscription functionality is preserved.
