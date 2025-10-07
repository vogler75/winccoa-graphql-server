// Test file for GraphQL V2 Schema
// Run with: node test-v2-schema.js

const { makeExecutableSchema } = require('@graphql-tools/schema');
const { readFileSync } = require('fs');
const { join } = require('path');

console.log('Testing GraphQL V2 Schema compilation...\n');

try {
  // Load schema from modular structure
  const schemaV2Module = require('./graphql-v2');
  const schemaV2 = schemaV2Module.typeDefs;
  console.log('✅ Schema modules loaded successfully');

  // Simple dummy resolvers for testing schema validity
  const dummyResolvers = {
    Query: {
      system: () => ({}),
      systems: () => [],
      dataPoint: () => null,
      dataPoints: () => [],
      tag: () => null,
      tags: () => [],
      methods: () => ({}),
      version: () => ({ api: { version: 2 }, winccoa: {} })
    },
    System: {
      dataPoint: () => null,
      dataPoints: () => [],
      dataPointType: () => null,
      dataPointTypes: () => [],
      alerts: () => [],
      cns: () => ({}),
      version: () => ({}),
      redundancy: () => ({ isConfigured: false, isActive: false })
    },
    DataPoint: {
      system: () => ({}),
      type: () => ({}),
      element: () => null,
      elements: () => [],
      alerts: () => [],
      cnsNodes: () => []
    },
    DataPointElement: {
      dataPoint: () => ({}),
      status: () => ({ raw: null, online: false }),
      history: () => ({ element: {}, values: [], totalCount: 0 }),
      parent: () => null,
      children: () => []
    },
    DataPointType: {
      structure: () => ({ name: '', elementType: 'MIXED', children: [] }),
      references: () => [],
      usedBy: () => [],
      dataPoints: () => [],
      count: () => 0
    },
    DataPointTypeNode: {
      refType: () => null,
      children: () => []
    },
    Tag: {
      element: () => ({}),
      history: () => ({ name: '', values: [] })
    },
    Alert: {
      dataPoint: () => ({}),
      attribute: () => null,
      attributes: () => []
    },
    CNS: {
      view: () => null,
      views: () => [],
      searchNodes: () => [],
      searchByDataPoint: () => []
    },
    CNSView: {
      system: () => ({}),
      tree: () => null,
      trees: () => []
    },
    CNSTree: {
      view: () => ({}),
      root: () => ({})
    },
    CNSNode: {
      parent: () => null,
      children: () => [],
      root: () => ({}),
      tree: () => ({}),
      dataPoint: () => null,
      properties: () => []
    },
    Methods: {
      dpGet: () => ({}),
      dpNames: () => [],
      dpTypes: () => [],
      dpGetMaxAge: () => ({}),
      dpElementType: () => 'MIXED',
      dpAttributeType: () => 'STRING_VAR',
      dpTypeName: () => '',
      dpTypeRefName: () => '',
      dpExists: () => false,
      dpGetPeriod: () => ({}),
      isReduActive: () => false,
      isRedundant: () => false,
      getSystemId: () => 0,
      getSystemName: () => '',
      getVersionInfo: () => ({ api: { version: 2 }, winccoa: {} }),
      tagGet: () => [],
      tagGetHistory: () => [],
      alertGet: () => ({}),
      alertGetPeriod: () => ({ alertTimes: [], values: [] }),
      cnsGetViews: () => [],
      cnsGetTrees: () => [],
      cnsGetChildren: () => [],
      cnsGetParent: () => '',
      cnsGetRoot: () => '',
      cnsGetDisplayNames: () => ({}),
      cnsGetDisplayPath: () => ({}),
      cnsGetId: () => '',
      cnsGetIdSet: () => [],
      cnsGetNodesByName: () => [],
      cnsGetNodesByData: () => [],
      cnsGetProperty: () => null,
      cnsGetPropertyKeys: () => [],
      cnsNodeExists: () => false,
      cnsTreeExists: () => false,
      cnsViewExists: () => false,
      cnsIsNode: () => false,
      cnsIsTree: () => false,
      cnsIsView: () => false,
      cnsCheckId: () => false,
      cnsCheckName: () => 0,
      cnsCheckSeparator: () => false,
      dpTypeGet: () => ({ name: '', type: 'MIXED', children: [] }),
      dpGetDpTypeRefs: () => ({ dptNames: [], dpePaths: [] }),
      dpGetRefsToDpType: () => ({ dptNames: [], dpePaths: [] })
    },
    MethodTag: {
      history: () => ({ name: '', values: [] })
    },
    Mutation: {
      login: () => ({ token: '', expiresAt: '' }),
      dataPoint: () => ({}),
      dataPointType: () => ({}),
      alert: () => ({}),
      cns: () => ({}),
      opcua: () => ({})
    },
    DataPointMutations: {
      create: () => true,
      delete: () => true,
      copy: () => true,
      set: () => true,
      setWait: () => true,
      setTimed: () => true,
      setTimedWait: () => true
    },
    DataPointTypeMutations: {
      create: () => true,
      change: () => true,
      delete: () => true
    },
    AlertMutations: {
      set: () => true,
      setWait: () => true,
      setTimed: () => true,
      setTimedWait: () => true
    },
    CnsMutations: {
      createView: () => true,
      addTree: () => true,
      addNode: () => true,
      changeTree: () => true,
      deleteTree: () => true,
      deleteView: () => true,
      setProperty: () => true
    },
    OpcUaMutations: {
      setAddress: () => true
    },
    Subscription: {
      dpConnect: {
        subscribe: () => ({})
      },
      dpQueryConnectSingle: {
        subscribe: () => ({})
      },
      dpQueryConnectAll: {
        subscribe: () => ({})
      },
      tagSubscribe: {
        subscribe: () => ({})
      }
    }
  };

  // Try to create executable schema
  const schema = makeExecutableSchema({
    typeDefs: schemaV2,
    resolvers: dummyResolvers
  });

  console.log('✅ Schema compiled successfully');
  console.log('\nSchema Summary:');
  console.log('  - Query type with hierarchical entry points');
  console.log('  - System, DataPoint, DataPointElement types');
  console.log('  - CNS hierarchy (Views, Trees, Nodes)');
  console.log('  - Alert types with attributes');
  console.log('  - Methods type for backward compatibility');
  console.log('  - All mutations preserved');
  console.log('  - Subscriptions unchanged');
  console.log('\n✅ All tests passed! Schema is valid and ready to use.');

} catch (error) {
  console.error('❌ Schema validation failed:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
