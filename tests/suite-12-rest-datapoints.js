// tests/suite-12-rest-datapoints.js — REST /restapi/datapoints routes

const {
  rest,
  DP_FLOAT, DP_FLOAT_DP,
  TEST_DP_REST,
  assertNotNull, assertEqual, assertIsArray, assertTypeOf, dig
} = require('./helpers')

// Encode a DP name with trailing dot for use in URL paths
function enc(name) { return encodeURIComponent(name) }

module.exports = {
  name: 'Suite 12 — REST Datapoint Routes',

  async run(t) {

    // ── Search / read ────────────────────────────────────────────────────────
    await t('12.1', 'GET /restapi/datapoints?pattern=ExampleDP* → non-empty array', async () => {
      const { status, body } = await rest('GET', '/restapi/datapoints?pattern=ExampleDP*')
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body.datapoints, 'body.datapoints')
      assertIsArray(body.datapoints, 'datapoints')
      if (body.datapoints.length === 0) throw new Error('Expected at least one ExampleDP datapoint')
    })

    await t('12.2', `GET /restapi/datapoints/${DP_FLOAT}/value → { value: number }`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT)}/value`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      assertTypeOf(body.value, 'number', 'body.value')
    })

    // ── Write + round-trip ───────────────────────────────────────────────────
    await t('12.3', `PUT /restapi/datapoints/${DP_FLOAT}/value { value: 77 } → success`, async () => {
      const { status, body } = await rest('PUT', `/restapi/datapoints/${enc(DP_FLOAT)}/value`, { value: 77 })
      assertEqual(status, 200, 'HTTP status')
      // server returns { success: true } or { value: 77 }
      assertNotNull(body, 'body')
    })

    await t('12.4', `GET /restapi/datapoints/${DP_FLOAT}/value → 77 (round-trip)`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT)}/value`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.value, 77, 'body.value after PUT')
    })

    // ── Metadata reads ───────────────────────────────────────────────────────
    await t('12.5', `GET /restapi/datapoints/${DP_FLOAT}/exists → { exists: true }`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT)}/exists`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.exists, true, 'body.exists')
    })

    await t('12.6', `GET /restapi/datapoints/${DP_FLOAT}/type → element type`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT)}/type`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      // body may be { elementType: "FLOAT" } or { type: "FLOAT" }
      const typeVal = body.elementType || body.type || body
      assertNotNull(typeVal, 'element type value')
    })

    await t('12.7', `GET /restapi/datapoints/${DP_FLOAT}/dp-type → dp type name`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT_DP)}/dp-type`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      const typeName = body.typeName || body.dpType || body
      assertNotNull(typeName, 'dp type name')
    })

    // ── Create + delete lifecycle ────────────────────────────────────────────
    await t('12.8', `POST /restapi/datapoints (create ${TEST_DP_REST}) → 201`, async () => {
      // Clean up any leftover
      await rest('DELETE', `/restapi/datapoints/${enc(TEST_DP_REST)}`).catch(() => {})

      const { status, body } = await rest('POST', '/restapi/datapoints', {
        dpeName: TEST_DP_REST,
        dpType: 'ExampleDP_Float'
      })
      assertEqual(status, 201, 'HTTP status')
    })

    await t('12.9', `DELETE /restapi/datapoints/${TEST_DP_REST} → 200`, async () => {
      const { status, body } = await rest('DELETE', `/restapi/datapoints/${enc(TEST_DP_REST)}`)
      assertEqual(status, 200, 'HTTP status')
    })

    // ── dpQuery via REST ─────────────────────────────────────────────────────
    await t('12.10', "POST /restapi/query → 2D result array", async () => {
      const query = `SELECT '_original.._value' FROM '${DP_FLOAT_DP}'`
      const { status, body } = await rest('POST', '/restapi/query', { query })
      assertEqual(status, 200, 'HTTP status')
      // body may be { result: [[...]] } or just the 2D array
      const table = body.result || body
      assertIsArray(table, 'query result')
      assertIsArray(table[0], 'header row')
    })
  }
}
