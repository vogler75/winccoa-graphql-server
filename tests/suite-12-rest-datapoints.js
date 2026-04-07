// tests/suite-12-rest-datapoints.js — REST /restapi/datapoints routes

const {
  rest,
  DP_FLOAT, DP_FLOAT_DP,
  TEST_DP_REST,
  assertNotNull, assertEqual, assertIsArray, assertTypeOf, dig,
  writeResult
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
      writeResult('12-01-rest-dp-search', { pattern: 'ExampleDP*', count: body.datapoints.length, datapoints: body.datapoints })
    })

    await t('12.2', `GET /restapi/datapoints/${DP_FLOAT}/value → { value: number }`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT)}/value`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      assertTypeOf(body.value, 'number', 'body.value')
      writeResult('12-02-rest-dp-get-value', { dpe: DP_FLOAT, status, value: body.value })
    })

    // ── Write + round-trip ───────────────────────────────────────────────────
    await t('12.3', `PUT /restapi/datapoints/${DP_FLOAT}/value { value: 77 } → success`, async () => {
      const { status, body } = await rest('PUT', `/restapi/datapoints/${enc(DP_FLOAT)}/value`, { value: 77 })
      assertEqual(status, 200, 'HTTP status')
      // server returns { success: true } or { value: 77 }
      assertNotNull(body, 'body')
      writeResult('12-03-rest-dp-put-value', { dpe: DP_FLOAT, written: 77, status, body })
    })

    await t('12.4', `GET /restapi/datapoints/${DP_FLOAT}/value → 77 (round-trip)`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT)}/value`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.value, 77, 'body.value after PUT')
      writeResult('12-04-rest-dp-roundtrip', { dpe: DP_FLOAT, expected: 77, actual: body.value })
    })

    // ── Metadata reads ───────────────────────────────────────────────────────
    await t('12.5', `GET /restapi/datapoints/${DP_FLOAT}/exists → { exists: true }`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT)}/exists`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.exists, true, 'body.exists')
      writeResult('12-05-rest-dp-exists', { dpe: DP_FLOAT, status, body })
    })

    await t('12.6', `GET /restapi/datapoints/${DP_FLOAT}/type → element type`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT)}/type`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      // body may be { elementType: "FLOAT" } or { type: "FLOAT" }
      const typeVal = body.elementType || body.type || body
      assertNotNull(typeVal, 'element type value')
      writeResult('12-06-rest-dp-type', { dpe: DP_FLOAT, status, body })
    })

    await t('12.7', `GET /restapi/datapoints/${DP_FLOAT}/dp-type → dp type name`, async () => {
      const { status, body } = await rest('GET', `/restapi/datapoints/${enc(DP_FLOAT_DP)}/dp-type`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      const typeName = body.typeName || body.dpType || body
      assertNotNull(typeName, 'dp type name')
      writeResult('12-07-rest-dp-dptype', { dp: DP_FLOAT_DP, status, body })
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
      writeResult('12-08-rest-dp-create', { dpeName: TEST_DP_REST, status, body })
    })

    await t('12.9', `DELETE /restapi/datapoints/${TEST_DP_REST} → 200`, async () => {
      const { status, body } = await rest('DELETE', `/restapi/datapoints/${enc(TEST_DP_REST)}`)
      assertEqual(status, 200, 'HTTP status')
      writeResult('12-09-rest-dp-delete', { dpeName: TEST_DP_REST, status, body })
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
      writeResult('12-10-rest-query', { query, status, rowCount: table.length, table })
    })
  }
}
