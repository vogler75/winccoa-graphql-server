// tests/suite-06-tags.js — Tag reads via dp.get + REST

const {
  gql, rest,
  DP_FLOAT,
  assertNoErrors, assertIsArray, assertNotNull, assertTypeOf, assertEqual, dig, writeResult
} = require('./helpers')

module.exports = {
  name: 'Suite 6 — Tag Queries',

  async run(t) {

    await t('6.1', `api.dp.get([${DP_FLOAT}:_online.._value/stime/status]) → 3 values`, async () => {
      const valueAttr  = `${DP_FLOAT}:_online.._value`
      const stimeAttr  = `${DP_FLOAT}:_online.._stime`
      const statusAttr = `${DP_FLOAT}:_online.._status`
      const res = await gql(
        `{ api { dp { get(dpeNames: ["${valueAttr}", "${stimeAttr}", "${statusAttr}"]) } } }`
      )
      assertNoErrors(res, '6.1')
      const vals = dig(res, 'data.api.dp.get')
      assertIsArray(vals, 'dp.get')
      assertEqual(vals.length, 3, 'dp.get length')
      assertTypeOf(vals[0], 'number', 'value')
      assertNotNull(vals[1], 'stime')
      assertNotNull(res.data, 'response.data')
      writeResult('06-01-tag-online-attrs', {
        dpe:    DP_FLOAT,
        value:  vals[0],
        stime:  vals[1],
        status: vals[2]
      })
    })

    await t('6.2', `REST GET /restapi/tags?dpeNames=${DP_FLOAT} → tags array`, async () => {
      const { status, body } = await rest('GET', `/restapi/tags?dpeNames=${encodeURIComponent(DP_FLOAT)}`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body.tags, 'body.tags')
      assertIsArray(body.tags, 'body.tags')
      assertEqual(body.tags.length, 1, 'tags.length')
      assertNotNull(body.tags[0].name, 'tag.name')
      writeResult('06-02-rest-tags', { dpe: DP_FLOAT, tags: body.tags })
    })

    await t('6.3', 'REST GET /restapi/tags/history → empty or error without RDB', async () => {
      const start = '2025-01-01T00:00:00Z'
      const end   = '2025-01-01T01:00:00Z'
      const params = `dpeNames=${encodeURIComponent(DP_FLOAT)}&startTime=${start}&endTime=${end}`
      const { status, body } = await rest('GET', `/restapi/tags/history?${params}`)
      assertNotNull(body, 'response body')
      if (status === 500 || body.error) {
        writeResult('06-03-rest-tags-history', { skipped: true, status, error: body.error || body.message })
        return 'No RDB backend — history returns error (expected)'
      }
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body.history, 'body.history')
      writeResult('06-03-rest-tags-history', { dpe: DP_FLOAT, start, end, history: body.history })
    })
  }
}
