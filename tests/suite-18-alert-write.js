// tests/suite-18-alert-write.js — Alert mutations (set / setWait / setTimed / setTimedWait)
//
// Mirrors the acknowledgment pattern from suite-21:
//   • dpe = <DP>:_alert_hdl.._active  — the attribute alertSet can write to
//   • time "1970-01-01T00:00:00Z", count 0  — WinCC OA convention for the current/latest alert
//   • values [1]  — 1 = acknowledge / confirm active state
//
// Each test writes true to ExampleDP_AlertHdl1 first so there is an active alert,
// then calls the mutation, then resets the DP. Tests skip gracefully on systems
// without alert configuration.

const {
  gql,
  DP_BIT,
  assertNoErrors, assertNoUnexpectedErrors, assertEqual, assertNotNull, dig,
  writeResult
} = require('./helpers')

const ALERT_DP    = DP_BIT                               // 'ExampleDP_AlertHdl1.'
const CAME_DPE    = `${DP_BIT}:_alert_hdl.._came_time`  // read path for alertGet (18.1)
const ACTIVE_DPE  = `${DP_BIT}:_alert_hdl.._active`     // writable via alertSet (18.2–18.5)
const ALERT_INPUT = `{ time: "1970-01-01T00:00:00Z", count: 0, dpe: "${ACTIVE_DPE}" }`

function nowISO() { return new Date().toISOString() }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Write a value to the alert DP (true to trigger, false to reset).
async function dpWrite(value) {
  await gql(`mutation { api { dp { setWait(dpeNames: ["${ALERT_DP}"], values: [${value}]) } } }`)
}

module.exports = {
  name: 'Suite 18 — Alert Mutations (set / setWait / setTimed / setTimedWait)',

  async run(t) {

    // ── alertGet (read before write) ──────────────────────────────────────────
    await t('18.1', 'api.alert.alertGet → read current alert state (SKIP if no groups)', async () => {
      const CAME_INPUT = `{ time: "1970-01-01T00:00:00Z", count: 0, dpe: "${CAME_DPE}" }`
      const res = await gql(`
        {
          api {
            alert {
              alertGet(
                alertsTime: [${CAME_INPUT}],
                dpeNames:   ["${CAME_DPE}"]
              )
            }
          }
        }
      `)
      const skipReason = assertNoUnexpectedErrors(res, '18.1')
      if (skipReason) return `No alert groups — ${skipReason}`
      assertNotNull(dig(res, 'data.api.alert.alertGet'), 'alertGet result')
      writeResult('18-01-alert-get-before', { alertDpe: CAME_DPE, result: dig(res, 'data.api.alert.alertGet') })
    })

    // ── alert.set ────────────────────────────────────────────────────────────
    await t('18.2', 'api.alert.set → Boolean (SKIP if no groups)', async () => {
      await dpWrite(true)
      await sleep(200)
      try {
        const res = await gql(`
          mutation {
            api {
              alert {
                set(
                  alerts: [${ALERT_INPUT}],
                  values: [1]
                )
              }
            }
          }
        `)
        const skipReason = assertNoUnexpectedErrors(res, '18.2')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.set')
        assertEqual(result, true, 'alert.set result')
        writeResult('18-02-alert-set', { alertDpe: ACTIVE_DPE, result })
      } finally {
        await dpWrite(false).catch(() => {})
      }
    })

    // ── alert.setWait ─────────────────────────────────────────────────────────
    await t('18.3', 'api.alert.setWait → Boolean (SKIP if no groups)', async () => {
      await dpWrite(true)
      await sleep(200)
      try {
        const res = await gql(`
          mutation {
            api {
              alert {
                setWait(
                  alerts: [${ALERT_INPUT}],
                  values: [1]
                )
              }
            }
          }
        `)
        const skipReason = assertNoUnexpectedErrors(res, '18.3')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setWait')
        assertEqual(result, true, 'alert.setWait result')
        writeResult('18-03-alert-set-wait', { alertDpe: ACTIVE_DPE, result })
      } finally {
        await dpWrite(false).catch(() => {})
      }
    })

    // ── alert.setTimed ────────────────────────────────────────────────────────
    await t('18.4', 'api.alert.setTimed → Boolean (SKIP if no groups)', async () => {
      await dpWrite(true)
      await sleep(200)
      try {
        const time = nowISO()
        const res = await gql(`
          mutation {
            api {
              alert {
                setTimed(
                  time:   "${time}",
                  alerts: [${ALERT_INPUT}],
                  values: [1]
                )
              }
            }
          }
        `)
        const skipReason = assertNoUnexpectedErrors(res, '18.4')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setTimed')
        assertEqual(result, true, 'alert.setTimed result')
        writeResult('18-04-alert-set-timed', { time, alertDpe: ACTIVE_DPE, result })
      } finally {
        await dpWrite(false).catch(() => {})
      }
    })

    // ── alert.setTimedWait ────────────────────────────────────────────────────
    await t('18.5', 'api.alert.setTimedWait → Boolean (SKIP if no groups)', async () => {
      await dpWrite(true)
      await sleep(200)
      try {
        const time = nowISO()
        const res = await gql(`
          mutation {
            api {
              alert {
                setTimedWait(
                  time:   "${time}",
                  alerts: [${ALERT_INPUT}],
                  values: [1]
                )
              }
            }
          }
        `)
        const skipReason = assertNoUnexpectedErrors(res, '18.5')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setTimedWait')
        assertEqual(result, true, 'alert.setTimedWait result')
        writeResult('18-05-alert-set-timed-wait', { time, alertDpe: ACTIVE_DPE, result })
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
                names:     [":_alert_hdl.._active"]
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
