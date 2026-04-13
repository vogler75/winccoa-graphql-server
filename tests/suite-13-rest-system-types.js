// tests/suite-13-rest-system-types.js — REST /health, /restapi/system, /restapi/auth, /restapi/datapoint-types

const {
  rest,
  TEST_TYPE_REST,
  assertNotNull, assertEqual, assertIsArray, assertTypeOf, dig,
  writeResult
} = require('./helpers')

function enc(name) { return encodeURIComponent(name) }

module.exports = {
  name: 'Suite 13 — REST System, Auth & DatapointType Routes',

  async run(t) {

    // ── Health ────────────────────────────────────────────────────────────────
    await t('13.1', 'GET /health → status: "healthy"', async () => {
      const { status, body } = await rest('GET', '/health')
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.status, 'healthy', 'body.status')
    })

    // ── System ───────────────────────────────────────────────────────────────
    await t('13.2', 'GET /restapi/system/version → api + winccoa info', async () => {
      const { status, body } = await rest('GET', '/restapi/system/version')
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      const api = body.api || body
      assertNotNull(api, 'api version info')
      writeResult('13-02-rest-system-version', { status, body })
    })

    await t('13.3', 'GET /restapi/system/id → systemId', async () => {
      const { status, body } = await rest('GET', '/restapi/system/id')
      assertEqual(status, 200, 'HTTP status')
      const id = body.systemId ?? body.id ?? body
      if (!id && id !== 0) throw new Error(`Expected numeric systemId, got ${JSON.stringify(body)}`)
      writeResult('13-03-rest-system-id', { status, body })
    })

    await t('13.4', 'GET /restapi/system/name → systemName', async () => {
      const { status, body } = await rest('GET', '/restapi/system/name')
      assertEqual(status, 200, 'HTTP status')
      const name = body.systemName || body.name || body
      if (typeof name !== 'string')
        throw new Error(`Expected string systemName, got ${JSON.stringify(body)}`)
      writeResult('13-04-rest-system-name', { status, body })
    })

    await t('13.5', 'GET /restapi/system/redundancy/active → Boolean', async () => {
      const { status, body } = await rest('GET', '/restapi/system/redundancy/active')
      assertEqual(status, 200, 'HTTP status')
      const active = body.active ?? body.isReduActive ?? body
      if (typeof active !== 'boolean')
        throw new Error(`Expected boolean, got ${JSON.stringify(body)}`)
      writeResult('13-05-rest-system-redundancy', { status, body })
    })

    // ── Auth ─────────────────────────────────────────────────────────────────
    await t('13.6', 'POST /restapi/auth/login with wrong creds → 401', async () => {
      const { status, body } = await rest('POST', '/restapi/auth/login', {
        username: 'wrong',
        password: 'wrong'
      })
      assertEqual(status, 401, 'HTTP status')
      writeResult('13-06-rest-login-wrong-creds', { status, body })
    })

    // ── DatapointType routes ─────────────────────────────────────────────────
    await t('13.7', 'GET /restapi/datapoint-types → list of types', async () => {
      const { status, body } = await rest('GET', '/restapi/datapoint-types')
      assertEqual(status, 200, 'HTTP status')
      const list = body.dpTypes || body.types || body.dataPointTypes || body
      assertIsArray(list, 'datapoint-types list')
      if (list.length === 0) throw new Error('Expected at least one data point type')
      writeResult('13-07-rest-dptype-list', { status, count: list.length, types: list })
    })

    await t('13.8', 'GET /restapi/datapoint-types/ExampleDP_Float/structure → type structure', async () => {
      const { status, body } = await rest('GET', '/restapi/datapoint-types/ExampleDP_Float/structure')
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      const name = body.name || (body.structure && body.structure.name)
      if (!name) throw new Error(`Expected type name in response: ${JSON.stringify(body)}`)
      writeResult('13-08-rest-dptype-structure', { status, body })
    })

    // ── Create + delete lifecycle ────────────────────────────────────────────
    await t('13.9', `POST /restapi/datapoint-types (create ${TEST_TYPE_REST}) → 201`, async () => {
      await rest('DELETE', `/restapi/datapoint-types/${enc(TEST_TYPE_REST)}`).catch(() => {})
      const { status, body } = await rest('POST', '/restapi/datapoint-types', {
        startNode: {
          name: TEST_TYPE_REST,
          type: 'STRUCT',
          children: [{ name: 'value', type: 'FLOAT' }]
        }
      })
      assertEqual(status, 201, 'HTTP status')
      writeResult('13-09-rest-dptype-create', { typeName: TEST_TYPE_REST, status, body })
    })

    await t('13.10', `DELETE /restapi/datapoint-types/${TEST_TYPE_REST} → 200`, async () => {
      const { status, body } = await rest('DELETE', `/restapi/datapoint-types/${enc(TEST_TYPE_REST)}`)
      assertEqual(status, 200, 'HTTP status')
      writeResult('13-10-rest-dptype-delete', { typeName: TEST_TYPE_REST, status, body })
    })
  }
}
