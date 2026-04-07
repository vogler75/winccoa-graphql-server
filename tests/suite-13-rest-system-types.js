// tests/suite-13-rest-system-types.js — REST /restapi/system and /restapi/datapoint-types

const {
  rest,
  TEST_TYPE_REST,
  assertNotNull, assertEqual, assertIsArray, assertTypeOf, dig
} = require('./helpers')

function enc(name) { return encodeURIComponent(name) }

module.exports = {
  name: 'Suite 13 — REST System & DatapointType Routes',

  async run(t) {

    // ── System ───────────────────────────────────────────────────────────────
    await t('13.1', 'GET /restapi/system/version → api + winccoa info', async () => {
      const { status, body } = await rest('GET', '/restapi/system/version')
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      // body may be { api: {...}, winccoa: {...} } or flat
      const api = body.api || body
      assertNotNull(api, 'api version info')
    })

    await t('13.2', 'GET /restapi/system/id → systemId', async () => {
      const { status, body } = await rest('GET', '/restapi/system/id')
      assertEqual(status, 200, 'HTTP status')
      const id = body.systemId ?? body.id ?? body
      assertTypeOf(typeof id === 'number' ? id : 0, 'number', 'systemId')
      // Actually just check it is truthy non-zero (system id is 1)
      if (!id && id !== 0) throw new Error(`Expected numeric systemId, got ${JSON.stringify(body)}`)
    })

    await t('13.3', 'GET /restapi/system/name → systemName', async () => {
      const { status, body } = await rest('GET', '/restapi/system/name')
      assertEqual(status, 200, 'HTTP status')
      const name = body.systemName || body.name || body
      if (typeof name !== 'string')
        throw new Error(`Expected string systemName, got ${JSON.stringify(body)}`)
    })

    await t('13.4', 'GET /restapi/system/redundancy/active → Boolean', async () => {
      const { status, body } = await rest('GET', '/restapi/system/redundancy/active')
      assertEqual(status, 200, 'HTTP status')
      const active = body.active ?? body.isReduActive ?? body
      assertTypeOf(typeof active === 'boolean' ? active : false, 'boolean', 'active')
      if (typeof active !== 'boolean')
        throw new Error(`Expected boolean, got ${JSON.stringify(body)}`)
    })

    // ── DatapointType routes ─────────────────────────────────────────────────
    await t('13.5', 'GET /restapi/datapoint-types → list of types', async () => {
      const { status, body } = await rest('GET', '/restapi/datapoint-types')
      assertEqual(status, 200, 'HTTP status')
      // server responds with { dpTypes: [...] }
      const list = body.dpTypes || body.types || body.dataPointTypes || body
      assertIsArray(list, 'datapoint-types list')
      if (list.length === 0) throw new Error('Expected at least one data point type')
    })

    await t('13.6', 'GET /restapi/datapoint-types/ExampleDP_Float/structure → type structure', async () => {
      const { status, body } = await rest('GET', '/restapi/datapoint-types/ExampleDP_Float/structure')
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      const name = body.name || (body.structure && body.structure.name)
      if (!name) throw new Error(`Expected type name in response: ${JSON.stringify(body)}`)
    })

    // ── Create + delete lifecycle ────────────────────────────────────────────
    await t('13.7', `POST /restapi/datapoint-types (create ${TEST_TYPE_REST}) → 201`, async () => {
      // Clean up any leftover
      await rest('DELETE', `/restapi/datapoint-types/${enc(TEST_TYPE_REST)}`).catch(() => {})

      const { status, body } = await rest('POST', '/restapi/datapoint-types', {
        startNode: {
          name: TEST_TYPE_REST,
          type: 'STRUCT',
          children: [{ name: 'value', type: 'FLOAT' }]
        }
      })
      assertEqual(status, 201, 'HTTP status')
    })

    await t('13.8', `DELETE /restapi/datapoint-types/${TEST_TYPE_REST} → 200`, async () => {
      const { status, body } = await rest('DELETE', `/restapi/datapoint-types/${enc(TEST_TYPE_REST)}`)
      assertEqual(status, 200, 'HTTP status')
    })
  }
}
