// tests/suite-22-rest-alerts-cns.js — REST /restapi/alerts and /restapi/cns routes

const {
  gql, rest,
  DP_BIT,
  assertNotNull, assertEqual, assertIsArray, dig,
  writeResult
} = require('./helpers')

const ALERT_DP    = DP_BIT
const ALERT_NAMES = [':_alert_hdl.._value', ':_alert_hdl.._text']
const SYSTEM      = 'System1'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Trigger (true) and reset (false) the alert 3 times with 50ms spacing.
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
  name: 'Suite 22 — REST Alert & CNS Routes',

  async run(t) {

    // ── Alerts ────────────────────────────────────────────────────────────────
    await t('22.1', 'GET /restapi/alerts (missing params) → 400', async () => {
      const { status, body } = await rest('GET', '/restapi/alerts')
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
      writeResult('22-01-rest-alerts-missing-params', { status, body })
    })

    await t('22.2', 'GET /restapi/alerts/period → trigger 3x then query', async () => {
      const { start, end } = await triggerAlerts()
      await sleep(300)

      const namesParam = ALERT_NAMES.join(',')
      const params = `startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}&names=${encodeURIComponent(namesParam)}`
      const { status, body } = await rest('GET', `/restapi/alerts/period?${params}`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body.alertTimes, 'body.alertTimes')
      assertIsArray(body.alertTimes, 'alertTimes')
      if (body.alertTimes.length === 0)
        throw new Error('Expected alert events but got empty alertTimes array')
      writeResult('22-02-rest-alert-period', { start, end, alertDp: ALERT_DP, names: ALERT_NAMES, result: body })
    })

    // ── CNS ───────────────────────────────────────────────────────────────────
    await t('22.3', `GET /restapi/cns/views/${SYSTEM} → 200 with array`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/views/${encodeURIComponent(SYSTEM)}`)
      assertNotNull(body, 'response body')
      assertEqual(status, 200, 'HTTP status')
      const views = body.views || body
      assertIsArray(views, 'views')
      writeResult('22-03-rest-cns-views', { status, views })
    })
  }
}
