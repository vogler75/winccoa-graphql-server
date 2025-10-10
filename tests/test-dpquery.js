// Test file for dpQuery implementation
// Run with: node test-dpquery.js

console.log('Testing dpQuery implementation...\n')

// Test 1: Check if dpQuery is in GraphQL schema
console.log('Test 1: Verify dpQuery is in GraphQL v2 schema')
try {
  const { readFileSync } = require('fs')
  const methodsSchema = readFileSync('./graphql/methods.gql', 'utf8')

  if (methodsSchema.includes('dpQuery')) {
    console.log('✅ dpQuery found in methods.gql schema')
  } else {
    console.log('❌ dpQuery NOT found in methods.gql schema')
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Error reading schema:', error.message)
  process.exit(1)
}

// Test 2: Check if dpQuery resolver is in common.js
console.log('\nTest 2: Verify dpQuery resolver is in common.js')
try {
  const { readFileSync } = require('fs')
  const commonJs = readFileSync('./graphql/common.js', 'utf8')

  if (commonJs.includes('async dpQuery')) {
    console.log('✅ dpQuery resolver found in common.js')
  } else {
    console.log('❌ dpQuery resolver NOT found in common.js')
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Error reading resolver:', error.message)
  process.exit(1)
}

// Test 3: Check if dpQuery is exposed in methods-resolvers.js
console.log('\nTest 3: Verify dpQuery is exposed in methods-resolvers.js')
try {
  const { readFileSync } = require('fs')
  const methodsResolvers = readFileSync('./graphql/methods-resolvers.js', 'utf8')

  if (methodsResolvers.includes('dpQuery:')) {
    console.log('✅ dpQuery exposed in methods-resolvers.js')
  } else {
    console.log('❌ dpQuery NOT exposed in methods-resolvers.js')
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Error reading methods-resolvers:', error.message)
  process.exit(1)
}

// Test 4: Check if REST API route is added
console.log('\nTest 4: Verify REST API /query endpoint')
try {
  const { readFileSync } = require('fs')
  const restApi = readFileSync('./restapi/rest-api.js', 'utf8')
  const datapointRoutes = readFileSync('./restapi/routes/datapoint-routes.js', 'utf8')

  if (restApi.includes('/query') && datapointRoutes.includes('createQueryRouter')) {
    console.log('✅ REST API /query endpoint configured')
  } else {
    console.log('❌ REST API /query endpoint NOT properly configured')
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Error reading REST API files:', error.message)
  process.exit(1)
}

// Test 5: Verify the GraphQL schema still compiles with dpQuery
console.log('\nTest 5: Verify GraphQL v2 schema compiles with dpQuery')
try {
  const { makeExecutableSchema } = require('@graphql-tools/schema')
  const schemaV2Module = require('./graphql')
  const schemaV2 = schemaV2Module.typeDefs

  // Create a minimal resolver that includes dpQuery
  const testResolvers = {
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
    Methods: {
      dpQuery: () => [[]]
    }
  }

  const schema = makeExecutableSchema({
    typeDefs: schemaV2,
    resolvers: testResolvers
  })

  console.log('✅ GraphQL schema compiles successfully with dpQuery')
} catch (error) {
  console.error('❌ Schema compilation failed:', error.message)
  process.exit(1)
}

console.log('\n✅ All dpQuery implementation tests passed!')
console.log('\nSummary:')
console.log('  - dpQuery added to GraphQL v2 Methods type')
console.log('  - dpQuery resolver implemented in common.js')
console.log('  - dpQuery exposed through methods-resolvers.js')
console.log('  - REST API endpoint POST /restapi/query added')
console.log('  - GraphQL schema compiles successfully')
console.log('\nUsage:')
console.log('  GraphQL: query { methods { dpQuery(query: "SELECT \'_original.._value\' FROM \'ExampleDP*\'") } }')
console.log('  REST API: POST /restapi/query with body: { "query": "SELECT \'_original.._value\' FROM \'ExampleDP*\'" }')
