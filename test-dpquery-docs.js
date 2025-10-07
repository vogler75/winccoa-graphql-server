// Test file for dpQuery documentation completeness
// Run with: node test-dpquery-docs.js

const fs = require('fs')

console.log('Testing dpQuery documentation completeness...\n')

let allTestsPassed = true

// Test 1: Check OpenAPI YAML
console.log('Test 1: Verify dpQuery in OpenAPI YAML specification')
try {
  const openApiYaml = fs.readFileSync('./restapi/openapi-full.yaml', 'utf8')

  if (openApiYaml.includes('/restapi/query:')) {
    console.log('✅ dpQuery endpoint found in OpenAPI spec')
  } else {
    console.log('❌ dpQuery endpoint NOT found in OpenAPI spec')
    allTestsPassed = false
  }

  if (openApiYaml.includes('Execute SQL-like query')) {
    console.log('✅ dpQuery description found in OpenAPI spec')
  } else {
    console.log('❌ dpQuery description NOT found in OpenAPI spec')
    allTestsPassed = false
  }

  if (openApiYaml.includes('dpQuery()')) {
    console.log('✅ Reference to WinCC OA dpQuery() found')
  } else {
    console.log('❌ Reference to WinCC OA dpQuery() NOT found')
    allTestsPassed = false
  }

  // Check for examples
  if (openApiYaml.includes("SELECT '_original.._value' FROM 'ExampleDP_Arg*'")) {
    console.log('✅ Example query found in OpenAPI spec')
  } else {
    console.log('❌ Example query NOT found in OpenAPI spec')
    allTestsPassed = false
  }
} catch (error) {
  console.error('❌ Error reading OpenAPI YAML:', error.message)
  allTestsPassed = false
}

// Test 2: Check REST API Documentation
console.log('\nTest 2: Verify dpQuery in REST API documentation')
try {
  const restApiMd = fs.readFileSync('./restapi/REST-API.md', 'utf8')

  if (restApiMd.includes('## Query')) {
    console.log('✅ Query section found in REST-API.md')
  } else {
    console.log('❌ Query section NOT found in REST-API.md')
    allTestsPassed = false
  }

  if (restApiMd.includes('/restapi/query')) {
    console.log('✅ /restapi/query endpoint documented')
  } else {
    console.log('❌ /restapi/query endpoint NOT documented')
    allTestsPassed = false
  }

  if (restApiMd.includes('dpQuery()')) {
    console.log('✅ Reference to WinCC OA dpQuery() in docs')
  } else {
    console.log('❌ Reference to WinCC OA dpQuery() NOT in docs')
    allTestsPassed = false
  }

  // Check for curl examples
  if (restApiMd.includes('curl -X POST http://localhost:4000/restapi/query')) {
    console.log('✅ Curl example found in REST-API.md')
  } else {
    console.log('❌ Curl example NOT found in REST-API.md')
    allTestsPassed = false
  }

  // Check for response format explanation
  if (restApiMd.includes('[0][0]') && restApiMd.includes('column headers')) {
    console.log('✅ Response format explanation found')
  } else {
    console.log('❌ Response format explanation NOT found')
    allTestsPassed = false
  }
} catch (error) {
  console.error('❌ Error reading REST-API.md:', error.message)
  allTestsPassed = false
}

// Test 3: Validate YAML syntax
console.log('\nTest 3: Validate OpenAPI YAML loads correctly')
try {
  const yaml = require('js-yaml')
  const yamlContent = fs.readFileSync('./restapi/openapi-full.yaml', 'utf8')
  const spec = yaml.load(yamlContent)

  if (spec.paths['/restapi/query']) {
    console.log('✅ /restapi/query path exists in parsed spec')

    if (spec.paths['/restapi/query'].post) {
      console.log('✅ POST method defined for /restapi/query')

      const postSpec = spec.paths['/restapi/query'].post

      if (postSpec.requestBody && postSpec.requestBody.content) {
        console.log('✅ Request body schema defined')
      } else {
        console.log('❌ Request body schema NOT defined')
        allTestsPassed = false
      }

      if (postSpec.responses && postSpec.responses['200']) {
        console.log('✅ Success response (200) defined')
      } else {
        console.log('❌ Success response (200) NOT defined')
        allTestsPassed = false
      }

      if (postSpec.tags && postSpec.tags.includes('Data Points')) {
        console.log('✅ Tagged as "Data Points"')
      } else {
        console.log('⚠️  Warning: Not tagged as "Data Points"')
      }
    } else {
      console.log('❌ POST method NOT defined for /restapi/query')
      allTestsPassed = false
    }
  } else {
    console.log('❌ /restapi/query path NOT found in parsed spec')
    allTestsPassed = false
  }
} catch (error) {
  console.error('❌ Error parsing YAML:', error.message)
  allTestsPassed = false
}

// Summary
console.log('\n' + '='.repeat(60))
if (allTestsPassed) {
  console.log('✅ All documentation tests passed!')
  console.log('\nDocumentation Summary:')
  console.log('  ✓ OpenAPI YAML specification updated')
  console.log('  ✓ REST API documentation updated')
  console.log('  ✓ Examples and curl commands included')
  console.log('  ✓ Response format clearly explained')
  console.log('  ✓ Reference to WinCC OA dpQuery() function')
  console.log('\nDocumentation locations:')
  console.log('  - OpenAPI Spec: ./restapi/openapi-full.yaml')
  console.log('  - REST API Docs: ./restapi/REST-API.md')
  console.log('  - Interactive UI: http://localhost:4000/api-docs')
  process.exit(0)
} else {
  console.log('❌ Some documentation tests failed!')
  console.log('Please review the errors above.')
  process.exit(1)
}
