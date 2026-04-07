// tests/suite-08-alerts.js — Alert queries
//
// ExampleDP_AlertHdl1 is a BOOL DP with _alert_hdl active (priority=60, text="Value to 1").
// Writing true triggers the alert (came), writing false resets it (went).
//
// Alert history is queried via:
//   SELECT ALERT '_alert_hdl.._value', '_alert_hdl.._text'
//   FROM 'ExampleDP_AlertHdl1.'
//   TIMERANGE("<start>","<end>",1,0)
//
// This uses the standard dp.query path — no separate alert archive group needed.
// The TIMERANGE mode 1 = include all events; mode 0 = no limit on count.

const {
  gql, rest,
  DP_BIT, DP_BIT_DP,
  assertNoErrors, assertNotNull, assertEqual, assertIsArray, dig, writeResult
} = require('./helpers')

const ALERT_DP = DP_BIT   // 'ExampleDP_AlertHdl1.'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Trigger (true) and reset (false) the alert 3 times with 50ms spacing.
// Returns { start, end } bracketing the activity with ±1s margin.
async function triggerAlerts() {
  const startMs = Date.now()
  for (let i = 0; i < 3; i++) {
    await gql(`mutation { api { dp { setWait(dpeNames: ["${ALERT_DP}"], values: [true]) } } }`)
    await sleep(50)
    await gql(`mutation { api { dp { setWait(dpeNames: ["${ALERT_DP}"], values: [false]) } } }`)
    await sleep(50)
  }
  return {
    start: new Date(startMs - 1000).toISOString(),
    end:   new Date(Date.now() + 1000).toISOString()
  }
}

// Build SELECT ALERT query string for the given time window.
function alertQuery(start, end) {
  return `SELECT ALERT '_alert_hdl.._value', '_alert_hdl.._text' FROM '${ALERT_DP}' TIMERANGE("${start}","${end}",1,0)`
}

module.exports = {
  name: 'Suite 8 — Alert Queries',

  async run(t) {

    // ── 8.1 GraphQL dp.query — SELECT ALERT ───────────────────────────────────
    await t('8.1', 'api.dp.query SELECT ALERT → trigger 3x then query window', async () => {
      const { start, end } = await triggerAlerts()
      await sleep(300)

      const q = alertQuery(start, end)
      const res = await gql(`{ api { dp { query(query: ${JSON.stringify(q)}) } } }`)
      assertNoErrors(res, '8.1')
      const rows = dig(res, 'data.api.dp.query')
      assertIsArray(rows, 'dp.query result')
      // row 0 = headers, rows 1+ = alert events
      if (rows.length < 2) throw new Error(`Expected at least 1 alert event row, got ${rows.length - 1}`)
      // Each data row: [dpName, alertTime{time,count,dpe}, _value(bool), _text(string)]
      const dataRow = rows[1]
      assertNotNull(dataRow[0], 'row[0] dpName')
      assertNotNull(dataRow[1], 'row[1] alertTime')
      assertNotNull(dataRow[1].time, 'alertTime.time')
      assertEqual(typeof dataRow[2], 'boolean', 'row[2] _value is boolean')
      assertEqual(typeof dataRow[3], 'string',  'row[3] _text is string')
      writeResult('08-01-alert-query', { start, end, alertDp: ALERT_DP, query: q, rows })
    })

    // ── 8.2 REST missing params → 400 ─────────────────────────────────────────
    await t('8.2', 'REST GET /restapi/alerts (missing params) → 400', async () => {
      const { status, body } = await rest('GET', '/restapi/alerts')
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
      writeResult('08-02-rest-alerts-missing-params', { status, body })
    })

    // ── 8.3 REST POST /restapi/query — SELECT ALERT ────────────────────────────
    await t('8.3', 'REST POST /restapi/query SELECT ALERT → trigger 3x then query', async () => {
      const { start, end } = await triggerAlerts()
      await sleep(300)

      const q = alertQuery(start, end)
      const { status, body } = await rest('POST', '/restapi/query', { query: q })
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body.result, 'body.result')
      assertIsArray(body.result, 'result rows')
      if (body.result.length < 2) throw new Error(`Expected at least 1 alert event row, got ${body.result.length - 1}`)
      writeResult('08-03-rest-alert-query', { start, end, alertDp: ALERT_DP, query: q, result: body.result })
    })
  }
}
