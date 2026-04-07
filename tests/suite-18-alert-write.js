// tests/suite-18-alert-write.js — Alert mutations (set / setWait / setTimed / setTimedWait)
//
// Alert mutations require an alert-handling element to already exist.
// ExampleDP_AlertHdl1.:_alert_hdl.._came_time is the canonical test element.
// All calls that require alert groups are guarded with assertNoUnexpectedErrors
// so the suite gracefully SKIPs on systems without alert configuration.
// Results are written to tests/results/ for manual inspection.

const {
  gql,
  DP_BIT,
  assertNoErrors, assertNoUnexpectedErrors, assertEqual, assertNotNull, dig,
  writeResult
} = require('./helpers')

// Alert handle element for ExampleDP_AlertHdl1
const ALERT_DPE   = `${DP_BIT}:_alert_hdl.._came_time`
const ALERT_INPUT = `{ time: "1970-01-01T00:00:00Z", count: 0, dpe: "${ALERT_DPE}" }`

function nowISO() { return new Date().toISOString() }

module.exports = {
  name: 'Suite 18 — Alert Mutations (set / setWait / setTimed / setTimedWait)',

  async run(t) {

    // ── alertGet (read before write) ──────────────────────────────────────────
    await t('18.1', 'api.alert.alertGet → read current alert state (SKIP if no groups)', async () => {
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
      writeResult('18-01-alert-get-before', { alertInput: ALERT_DPE, result: dig(res, 'data.api.alert.alertGet') })
    })

    // ── alert.set ────────────────────────────────────────────────────────────
    await t('18.2', 'api.alert.set → Boolean (SKIP if no groups)', async () => {
      const res = await gql(`
        mutation {
          api {
            alert {
              set(
                alerts: [${ALERT_INPUT}],
                values: [0]
              )
            }
          }
        }
      `)
      const skipReason = assertNoUnexpectedErrors(res, '18.2')
      if (skipReason) return `No alert groups — ${skipReason}`
      const result = dig(res, 'data.api.alert.set')
      assertEqual(result, true, 'alert.set result')
      writeResult('18-02-alert-set', { alertInput: ALERT_DPE, result })
    })

    // ── alert.setWait ─────────────────────────────────────────────────────────
    await t('18.3', 'api.alert.setWait → Boolean (SKIP if no groups)', async () => {
      const res = await gql(`
        mutation {
          api {
            alert {
              setWait(
                alerts: [${ALERT_INPUT}],
                values: [0]
              )
            }
          }
        }
      `)
      const skipReason = assertNoUnexpectedErrors(res, '18.3')
      if (skipReason) return `No alert groups — ${skipReason}`
      const result = dig(res, 'data.api.alert.setWait')
      assertEqual(result, true, 'alert.setWait result')
      writeResult('18-03-alert-set-wait', { alertInput: ALERT_DPE, result })
    })

    // ── alert.setTimed ────────────────────────────────────────────────────────
    await t('18.4', 'api.alert.setTimed → Boolean (SKIP if no groups)', async () => {
      const time = nowISO()
      const res = await gql(`
        mutation {
          api {
            alert {
              setTimed(
                time:   "${time}",
                alerts: [${ALERT_INPUT}],
                values: [0]
              )
            }
          }
        }
      `)
      const skipReason = assertNoUnexpectedErrors(res, '18.4')
      if (skipReason) return `No alert groups — ${skipReason}`
      const result = dig(res, 'data.api.alert.setTimed')
      assertEqual(result, true, 'alert.setTimed result')
      writeResult('18-04-alert-set-timed', { time, alertInput: ALERT_DPE, result })
    })

    // ── alert.setTimedWait ────────────────────────────────────────────────────
    await t('18.5', 'api.alert.setTimedWait → Boolean (SKIP if no groups)', async () => {
      const time = nowISO()
      const res = await gql(`
        mutation {
          api {
            alert {
              setTimedWait(
                time:   "${time}",
                alerts: [${ALERT_INPUT}],
                values: [0]
              )
            }
          }
        }
      `)
      const skipReason = assertNoUnexpectedErrors(res, '18.5')
      if (skipReason) return `No alert groups — ${skipReason}`
      const result = dig(res, 'data.api.alert.setTimedWait')
      assertEqual(result, true, 'alert.setTimedWait result')
      writeResult('18-05-alert-set-timed-wait', { time, alertInput: ALERT_DPE, result })
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
                names:     ["${ALERT_DPE}"]
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
        alertDpe: ALERT_DPE,
        result: dig(res, 'data.api.alert.alertGetPeriod')
      })
    })
  }
}
