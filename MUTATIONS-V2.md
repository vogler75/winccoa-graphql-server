# Namespaced Mutations in GraphQL V2

## Overview

GraphQL V2 introduces **namespaced mutations** - organizing mutations by domain rather than having them all at the root level. This follows GraphQL best practices and improves API discoverability.

## Schema Structure

### Mutation Root Type

```graphql
type Mutation {
  # Authentication (top level)
  login(username: String!, password: String!): AuthPayload!

  # Domain namespaces
  dataPoint: DataPointMutations!
  dataPointType: DataPointTypeMutations!
  alert: AlertMutations!
  cns: CnsMutations!
  opcua: OpcUaMutations!
}
```

### Domain-Specific Mutation Types

#### DataPointMutations
```graphql
type DataPointMutations {
  create(dpeName: String!, dpType: String!, systemId: Int, dpId: Int): Boolean!
  delete(dpName: String!): Boolean!
  copy(source: String!, destination: String!, driver: Int): Boolean!
  set(dpeNames: [String!]!, values: [JSON!]!): Boolean!
  setWait(dpeNames: [String!]!, values: [JSON!]!): Boolean!
  setTimed(time: Time!, dpeNames: [String!]!, values: [JSON!]!): Boolean!
  setTimedWait(time: Time!, dpeNames: [String!]!, values: [JSON!]!): Boolean!
}
```

#### DataPointTypeMutations
```graphql
type DataPointTypeMutations {
  create(startNode: DpTypeNodeInput!): Boolean!
  change(startNode: DpTypeNodeInput!): Boolean!
  delete(dpt: String!): Boolean!
}
```

#### AlertMutations
```graphql
type AlertMutations {
  set(alerts: [AlertTimeInput!]!, values: [JSON!]!): Boolean!
  setWait(alerts: [AlertTimeInput!]!, values: [JSON!]!): Boolean!
  setTimed(time: Time!, alerts: [AlertTimeInput!]!, values: [JSON!]!): Boolean!
  setTimedWait(time: Time!, alerts: [AlertTimeInput!]!, values: [JSON!]!): Boolean!
}
```

#### CnsMutations
```graphql
type CnsMutations {
  createView(view: String!, displayName: JSON!, separator: JSON): Boolean!
  addTree(cnsParentPath: String!, tree: CnsTreeNodeInput!): Boolean!
  addNode(cnsParentPath: String!, name: String!, displayName: JSON!, dp: String): Boolean!
  changeTree(cnsPath: String!, tree: CnsTreeNodeInput!): Boolean!
  deleteTree(cnsPath: String!): Boolean!
  deleteView(view: String!): Boolean!
  setProperty(cnsPath: String!, key: String!, value: JSON!, valueType: CtrlType!): Boolean!
}
```

#### OpcUaMutations
```graphql
type OpcUaMutations {
  setAddress(
    datapointName: String!
    driverNumber: Int!
    addressDirection: Int!
    addressDataType: Int!
    serverName: String!
    subscriptionName: String!
    nodeId: String!
  ): Boolean!
}
```

## Usage Examples

### Create and Configure Data Point

```graphql
mutation CreateAndConfigureDataPoint {
  dataPoint {
    # Create new data point
    create(dpeName: "Pump5", dpType: "ExampleDP_Float")

    # Set initial value
    set(dpeNames: ["Pump5.value"], values: [0.0])
  }

  # Configure OPC UA address
  opcua {
    setAddress(
      datapointName: "Pump5.value"
      driverNumber: 1
      addressDirection: 1
      addressDataType: 5
      serverName: "OpcServer"
      subscriptionName: "Sub1"
      nodeId: "ns=2;s=Pump5.Value"
    )
  }
}
```

### Build CNS Structure

```graphql
mutation BuildCNSStructure {
  cns {
    # Create view
    createView(
      view: "PlantView"
      displayName: {en_US: "Plant Overview", de_DE: "Anlagenübersicht"}
      separator: "/"
    )

    # Add tree structure
    addTree(
      cnsParentPath: "PlantView"
      tree: {
        name: "Equipment"
        displayName: {en_US: "Equipment"}
        children: [
          {
            name: "Pumps"
            displayName: {en_US: "Pumps"}
          }
        ]
      }
    )

    # Add individual node
    addNode(
      cnsParentPath: "PlantView/Equipment/Pumps"
      name: "Pump1"
      displayName: {en_US: "Pump 1"}
      dp: "Pump1"
    )
  }
}
```

### Manage Alerts

```graphql
mutation AcknowledgeAlert {
  alert {
    set(
      alerts: [
        {
          time: "2024-01-15T10:30:00Z"
          count: 1
          dpe: "Pump1._alert_hdl"
        }
      ]
      values: [
        {
          _alert_hdl.._ack_state: 1
          _alert_hdl.._ack_user: "operator1"
          _alert_hdl.._ack_time: "2024-01-15T10:35:00Z"
        }
      ]
    )
  }
}
```

### Batch Operations

```graphql
mutation BatchOperations {
  dataPoint {
    # Create multiple operations in sequence
    set(
      dpeNames: ["Pump1.value", "Pump2.value", "Pump3.value"]
      values: [100.0, 200.0, 150.0]
    )

    # Use setWait for confirmation
    setWait(
      dpeNames: ["Pump1.status"]
      values: ["RUNNING"]
    )
  }
}
```

## Benefits

### 1. Better Organization
- Related operations grouped together
- Clear domain boundaries
- Easier to navigate in GraphQL Playground

### 2. Improved Discoverability
- IDE autocomplete shows categories first
- Users can explore by domain
- Self-documenting API structure

### 3. Scalability
- Easy to add new operations to existing namespaces
- Can introduce new namespaces without cluttering root
- Follows GraphQL best practices

### 4. Type Safety
- Each namespace has its own type
- Better error messages
- Clear schema documentation

## Comparison: Flat vs Namespaced

### Flat (V1 style)
```graphql
mutation {
  dpCreate(dpeName: "Pump5", dpType: "ExampleDP_Float")
  dpSet(dpeNames: ["Pump5.value"], values: [0.0])
  cnsCreateView(view: "PlantView", displayName: {...})
  cnsAddNode(...)
  alertSet(...)
  setOpcUaAddress(...)
}
```

**Issues:**
- All 30+ mutations at root level
- Hard to find related operations
- Naming conventions required (prefix: dp*, cns*, alert*)
- Cluttered autocomplete

### Namespaced (V2 style)
```graphql
mutation {
  dataPoint {
    create(dpeName: "Pump5", dpType: "ExampleDP_Float")
    set(dpeNames: ["Pump5.value"], values: [0.0])
  }
  cns {
    createView(view: "PlantView", displayName: {...})
    addNode(...)
  }
  alert {
    set(...)
  }
  opcua {
    setAddress(...)
  }
}
```

**Benefits:**
- Only 6 items at root (login + 5 namespaces)
- Related operations grouped
- Shorter, cleaner function names
- IDE shows categories first

## Implementation Details

### Resolver Pattern

Each namespace field returns an empty object, and the actual mutations are resolved on that object:

```javascript
// Top-level Mutation resolvers
Mutation: {
  dataPoint() {
    return {} // DataPointMutations resolvers handle the rest
  },
  cns() {
    return {}
  },
  // ...
}

// Namespace resolvers
DataPointMutations: {
  create: async (_, { dpeName, dpType, systemId, dpId }) => {
    return await winccoa.dpCreate(dpeName, dpType, systemId, dpId)
  },
  set: async (_, { dpeNames, values }) => {
    return await winccoa.dpSet(dpeNames, values)
  },
  // ...
}
```

### Backward Compatibility

The V1 flat mutations are still available through:
1. **REST API** - Uses V1 resolvers directly
2. **Methods type** - Query namespace for backward compat (queries only)

## Best Practices

### 1. Group Related Operations
```graphql
mutation {
  dataPoint {
    create(...)
    set(...)
    # Related ops together
  }
}
```

### 2. Use Descriptive Names
Now that we have namespacing, we can use shorter, clearer names:
- `dataPoint.create` instead of `dpCreate`
- `cns.addNode` instead of `cnsAddNode`
- `alert.set` instead of `alertSet`

### 3. Single Responsibility
Each namespace handles one domain:
- `dataPoint` - Data point CRUD and values
- `dataPointType` - Type management
- `alert` - Alert handling
- `cns` - Navigation structure
- `opcua` - Driver configuration

### 4. Consistent Patterns
Similar operations across namespaces use similar names:
- `create` / `delete` for lifecycle
- `set` / `setWait` / `setTimed` for values
- `add` / `change` / `delete` for structure

## Migration Guide

To migrate from flat mutations:

1. **Wrap in namespace:**
   ```graphql
   # Old
   dpCreate(...)

   # New
   dataPoint { create(...) }
   ```

2. **Remove prefixes:**
   ```graphql
   # Old
   cnsCreateView(...)
   cnsAddNode(...)

   # New
   cns {
     createView(...)
     addNode(...)
   }
   ```

3. **Group by domain:**
   ```graphql
   # Old
   dpCreate(...)
   dpSet(...)
   cnsAddNode(...)

   # New
   dataPoint {
     create(...)
     set(...)
   }
   cns {
     addNode(...)
   }
   ```

## GraphQL Playground Support

In GraphQL Playground, the namespaced structure provides:

1. **Better Docs Sidebar:**
   - Shows 6 categories instead of 30+ flat mutations
   - Drill down to see operations

2. **Better Autocomplete:**
   - Type `dataPoint.` to see all DP operations
   - Type `cns.` to see all CNS operations

3. **Better Query Builder:**
   - Organizes mutations by category
   - Visual hierarchy

## Conclusion

Namespaced mutations provide:
- ✅ Better organization
- ✅ Improved discoverability
- ✅ Cleaner API design
- ✅ Follows GraphQL best practices
- ✅ Easier to maintain and extend
- ✅ Better developer experience

This pattern scales well as the API grows and makes the API more intuitive for new users.
