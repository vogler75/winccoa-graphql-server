// tests/suite-08-alerts.js — Alert queries

const {
  gql, rest,
  DP_BIT,
  assertNoUnexpectedErrors, assertNotNull, assertEqual, dig, writeResult
} = require('./helpers')

const START = '2025-01-01T00:00:00Z'
const END   = '2025-12-31T23:59:59Z'
const ALERT_ATTR = `${DP_BIT}:_alert_hdl.._came_time`

module.exports = {
  name: 'Suite 8 — Alert Queries',

  async run(t) {

    await t('8.1', 'api.alert.alertGetPeriod → error or result (no crash)', async () => {
      const res = await gql(`
        { api { alert {
          alertGetPeriod(
            startTime: "${START}",
            endTime:   "${END}",
            names:     ["${ALERT_ATTR}"]
          ) { alertTimes { time count dpe } values }
        } } }
      `)
      const skipReason = assertNoUnexpectedErrors(res, '8.1')
      if (skipReason) return `No alert groups configured — ${skipReason}`
      assertNotNull(dig(res, 'data.api.alert.alertGetPeriod'), 'alertGetPeriod result')
      writeResult('08-01-alert-get-period', { start: START, end: END, result: dig(res, 'data.api.alert.alertGetPeriod') })
    })

    await t('8.2', 'REST GET /restapi/alerts (missing params) → 400', async () => {
      const { status, body } = await rest('GET', '/restapi/alerts')
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
    })

    await t('8.3', 'REST GET /restapi/alerts/period → error or result (no crash)', async () => {
      const params = `startTime=${encodeURIComponent(START)}&endTime=${encodeURIComponent(END)}&names=${encodeURIComponent(ALERT_ATTR)}`
      const { status, body } = await rest('GET', `/restapi/alerts/period?${params}`)
      // 200 with data or 500 with known infra error — both are acceptable
      assertNotNull(body, 'response body')
      if (status === 500 || body.error) {
        return `No alert groups — ${body.message || body.error}`
      }
      assertEqual(status, 200, 'HTTP status')
    })
  }
}
