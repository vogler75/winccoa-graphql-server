// tests/suite-18-alert-write.js — Alert mutations (set / setWait / setTimed / setTimedWait)
//
// Tests trigger a real alert on ExampleDP_AlertHdl1 (a BOOL DP with _alert_hdl configured),
// capture the live alertTime via alertGetPeriod, then call each alert mutation variant
// with that valid alertTime. This ensures the Wait variants — which wait for event manager
// confirmation — see a real, existing alert entry and succeed rather than being rejected
// for an unknown alertTime.
//
// Root cause of original failures (18.3, 18.5):
//   alertSet/alertSetTimed are fire-and-forget: they return true immediately and silently
//   discard any event manager error (e.g. "Invalid attribute" on _came_time).
//   alertSetWait/alertSetTimedWait wait for confirmation, so they surface those errors.
//   Fix: use a real alertTime from a triggered alert, not an epoch-zero placeholder.
//
// All mutation tests skip gracefully on systems without alert configuration.

const {
  gql,
  DP_BIT,
  assertNoErrors, assertNoUnexpectedErrors, assertEqual, assertNotNull, dig,
  writeResult
} = require('./helpers')

const ALERT_DP   = DP_BIT                        // 'ExampleDP_AlertHdl1.'
const ALERT_DPE  = `${DP_BIT}:_alert_hdl.._came_time`
const ADD_VALUES_NAME = ':_alert_hdl.._add_values'  // writable attribute used for alertSet

function nowISO() { return new Date().toISOString() }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Write a value to the alert DP (true to trigger, false to reset).
async function dpWrite(value) {
  await gql(`mutation { api { dp { setWait(dpeNames: ["${ALERT_DP}"], values: [${value}]) } } }`)
}

// Trigger the alert and return the first live alertTime from alertGetPeriod,
// or null if no alert handler is configured on this system.
async function triggerAndGetAlertTime() {
  const startMs = Date.now()
  await dpWrite(true)
  await sleep(200)   // let the event manager record the alert
  const start = new Date(startMs - 500).toISOString()
  const end   = new Date(Date.now() + 1000).toISOString()
  const res = await gql(`
    { api { alert {
      alertGetPeriod(
        startTime: "${start}",
        endTime:   "${end}",
        names:     ["${ADD_VALUES_NAME}"]
      ) { alertTimes { time count dpe } values }
    } } }
  `)
  const alertTimes = dig(res, 'data.api.alert.alertGetPeriod.alertTimes')
  return (alertTimes && alertTimes.length > 0) ? alertTimes[0] : null
}

module.exports = {
  name: 'Suite 18 — Alert Mutations (set / setWait / setTimed / setTimedWait)',

  async run(t) {

    // ── alertGet (read before write) ──────────────────────────────────────────
    await t('18.1', 'api.alert.alertGet → read current alert state (SKIP if no groups)', async () => {
      const ALERT_INPUT = `{ time: "1970-01-01T00:00:00Z", count: 0, dpe: "${ALERT_DPE}" }`
      const res = await gql(`
        {
          api {
            alert {
              alertGet(
                alertsTime: [${ALERT_INPUT}],
                dpeNames:   ["${ALERT_DPE}"]
              )
            }
          }
        }
      `)
      const skipReason = assertNoUnexpectedErrors(res, '18.1')
      if (skipReason) return `No alert groups — ${skipReason}`
      assertNotNull(dig(res, 'data.api.alert.alertGet'), 'alertGet result')
      writeResult('18-01-alert-get-before', { alertDpe: ALERT_DPE, result: dig(res, 'data.api.alert.alertGet') })
    })

    // ── alert.set ────────────────────────────────────────────────────────────
    await t('18.2', 'api.alert.set → Boolean (SKIP if no groups)', async () => {
      const liveAlert = await triggerAndGetAlertTime()
      if (!liveAlert) return 'No alert handler configured — skipping'
      try {
        const ALERT_INPUT = `{ time: "${liveAlert.time}", count: ${liveAlert.count}, dpe: "${liveAlert.dpe}" }`
        const res = await gql(`
          mutation($values: [Anytype!]!) {
            api {
              alert {
                set(
                  alerts: [${ALERT_INPUT}],
                  values: $values
                )
              }
            }
          }
        `, { values: [['test']] })
        const skipReason = assertNoUnexpectedErrors(res, '18.2')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.set')
        assertEqual(result, true, 'alert.set result')
        writeResult('18-02-alert-set', { alertTime: liveAlert, result })
      } finally {
        await dpWrite(false).catch(() => {})
      }
    })

    // ── alert.setWait ─────────────────────────────────────────────────────────
    await t('18.3', 'api.alert.setWait → Boolean (SKIP if no groups)', async () => {
      const liveAlert = await triggerAndGetAlertTime()
      if (!liveAlert) return 'No alert handler configured — skipping'
      try {
        const ALERT_INPUT = `{ time: "${liveAlert.time}", count: ${liveAlert.count}, dpe: "${liveAlert.dpe}" }`
        const res = await gql(`
          mutation($values: [Anytype!]!) {
            api {
              alert {
                setWait(
                  alerts: [${ALERT_INPUT}],
                  values: $values
                )
              }
            }
          }
        `, { values: [['test']] })
        const skipReason = assertNoUnexpectedErrors(res, '18.3')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setWait')
        assertEqual(result, true, 'alert.setWait result')
        writeResult('18-03-alert-set-wait', { alertTime: liveAlert, result })
      } finally {
        await dpWrite(false).catch(() => {})
      }
    })

    // ── alert.setTimed ────────────────────────────────────────────────────────
    await t('18.4', 'api.alert.setTimed → Boolean (SKIP if no groups)', async () => {
      const liveAlert = await triggerAndGetAlertTime()
      if (!liveAlert) return 'No alert handler configured — skipping'
      try {
        const time = nowISO()
        const ALERT_INPUT = `{ time: "${liveAlert.time}", count: ${liveAlert.count}, dpe: "${liveAlert.dpe}" }`
        const res = await gql(`
          mutation($values: [Anytype!]!) {
            api {
              alert {
                setTimed(
                  time:   "${time}",
                  alerts: [${ALERT_INPUT}],
                  values: $values
                )
              }
            }
          }
        `, { values: [['test']] })
        const skipReason = assertNoUnexpectedErrors(res, '18.4')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setTimed')
        assertEqual(result, true, 'alert.setTimed result')
        writeResult('18-04-alert-set-timed', { time, alertTime: liveAlert, result })
      } finally {
        await dpWrite(false).catch(() => {})
      }
    })

    // ── alert.setTimedWait ────────────────────────────────────────────────────
    await t('18.5', 'api.alert.setTimedWait → Boolean (SKIP if no groups)', async () => {
      const liveAlert = await triggerAndGetAlertTime()
      if (!liveAlert) return 'No alert handler configured — skipping'
      try {
        const time = nowISO()
        const ALERT_INPUT = `{ time: "${liveAlert.time}", count: ${liveAlert.count}, dpe: "${liveAlert.dpe}" }`
        const res = await gql(`
          mutation($values: [Anytype!]!) {
            api {
              alert {
                setTimedWait(
                  time:   "${time}",
                  alerts: [${ALERT_INPUT}],
                  values: $values
                )
              }
            }
          }
        `, { values: [['test']] })
        const skipReason = assertNoUnexpectedErrors(res, '18.5')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setTimedWait')
        assertEqual(result, true, 'alert.setTimedWait result')
        writeResult('18-05-alert-set-timed-wait', { time, alertTime: liveAlert, result })
      } finally {
        await dpWrite(false).catch(() => {})
      }
    })

    // ── alertGetPeriod after writes ────────────────────────────────────────────
    await t('18.6', 'api.alert.alertGetPeriod → verify period query still works', async () => {
      const start = '2025-01-01T00:00:00Z'
      const end   = new Date().toISOString()
      const res = await gql(`
        {
          api {
            alert {
              alertGetPeriod(
                startTime: "${start}",
                endTime:   "${end}",
                names:     ["${ADD_VALUES_NAME}"]
              ) { alertTimes { time count dpe } values }
            }
          }
        }
      `)
      const skipReason = assertNoUnexpectedErrors(res, '18.6')
      if (skipReason) return `No alert groups — ${skipReason}`
      assertNotNull(dig(res, 'data.api.alert.alertGetPeriod'), 'alertGetPeriod result')
      writeResult('18-06-alert-get-period', {
        start,
        end,
        alertDp: ALERT_DP,
        result: dig(res, 'data.api.alert.alertGetPeriod')
      })
    })
  }
}
