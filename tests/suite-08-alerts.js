// tests/suite-08-alerts.js — Alert queries
//
// ExampleDP_AlertHdl1 is a BOOL DP with _alert_hdl active (priority=60, text="Value to 1").
// Writing true triggers the alert (came), writing false resets it (went).
//
// alertGetPeriod names parameter must be alert attribute names with leading colon:
//   ':_alert_hdl.._value'  — the DP value that triggered the alert (bool here)
//   ':_alert_hdl.._text'   — the configured alert text
// NOT the DP name or config path (e.g. 'ExampleDP_AlertHdl1.:_alert_hdl' returns empty).
//
// The REST /restapi/alerts/period endpoint accepts names as comma-separated query param.

const {
  gql, rest,
  DP_BIT,
  assertNoErrors, assertNotNull, assertEqual, assertIsArray, dig, writeResult
} = require('./helpers')

const ALERT_DP    = DP_BIT                           // 'ExampleDP_AlertHdl1.'
const ALERT_NAMES = [':_alert_hdl.._value', ':_alert_hdl.._text']

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

module.exports = {
  name: 'Suite 8 — Alert Queries',

  async run(t) {

    // ── 8.1 GraphQL alertGetPeriod ─────────────────────────────────────────────
    await t('8.1', 'api.alert.alertGetPeriod → trigger 3x then query window', async () => {
      const { start, end } = await triggerAlerts()
      await sleep(300)

      const res = await gql(`
        { api { alert {
          alertGetPeriod(
            startTime: "${start}",
            endTime:   "${end}",
            names:     ${JSON.stringify(ALERT_NAMES)}
          ) { alertTimes { time count dpe } values }
        } } }
      `)
      assertNoErrors(res, '8.1')
      const result = dig(res, 'data.api.alert.alertGetPeriod')
      assertNotNull(result, 'alertGetPeriod result')
      assertIsArray(result.alertTimes, 'alertTimes')
      assertIsArray(result.values, 'values')
      if (result.alertTimes.length === 0)
        throw new Error('Expected alert events but got empty alertTimes array')
      assertEqual(result.alertTimes.length, result.values.length, 'alertTimes/values length match')
      // Each alertTime has time, count, dpe
      assertNotNull(result.alertTimes[0].time, 'alertTimes[0].time')
      assertNotNull(result.alertTimes[0].dpe,  'alertTimes[0].dpe')
      writeResult('08-01-alert-get-period', { start, end, alertDp: ALERT_DP, names: ALERT_NAMES, result })
    })

    // ── 8.2 REST missing params → 400 ─────────────────────────────────────────
    await t('8.2', 'REST GET /restapi/alerts (missing params) → 400', async () => {
      const { status, body } = await rest('GET', '/restapi/alerts')
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
      writeResult('08-02-rest-alerts-missing-params', { status, body })
    })

    // ── 8.3 REST /restapi/alerts/period ───────────────────────────────────────
    await t('8.3', 'REST GET /restapi/alerts/period → trigger 3x then query', async () => {
      const { start, end } = await triggerAlerts()
      await sleep(300)

      // names passed as comma-separated query param
      const namesParam = ALERT_NAMES.join(',')
      const params = `startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}&names=${encodeURIComponent(namesParam)}`
      const { status, body } = await rest('GET', `/restapi/alerts/period?${params}`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body.alertTimes, 'body.alertTimes')
      assertIsArray(body.alertTimes, 'alertTimes')
      if (body.alertTimes.length === 0)
        throw new Error('Expected alert events but got empty alertTimes array')
      writeResult('08-03-rest-alert-period', { start, end, alertDp: ALERT_DP, names: ALERT_NAMES, result: body })
    })
  }
}
