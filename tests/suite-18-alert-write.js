// tests/suite-18-alert-write.js — Alert mutations (set / setWait / setTimed / setTimedWait)
//
// Uses ExampleDP_Rpt1 — a float DP with a threshold alarm (values > 99 trigger _active).
// alertSet works on this DP's _alert_hdl.._active attribute with values [1].
// ExampleDP_AlertHdl1 (BOOL DP) has a different alert handler type that does not
// support alertSet on any attribute (error 23 "Invalid attribute").
//
// Pattern:
//   dpe    = ExampleDP_Rpt1.:_alert_hdl.._add_values  (user-settable dyn_anytype)
//   time   = "1970-01-01T00:00:00Z", count = 0  (WinCC OA convention: current/latest alert)
//   values = [[42]]  (outer array: one per alert entry; inner array: the dyn_anytype value)
//
// Each test triggers the alarm (write 105 > threshold), calls the mutation,
// then resets the DP (write 0). Tests skip gracefully without alert configuration.

const {
  gql,
  assertNoUnexpectedErrors, assertEqual, assertNotNull, dig,
  writeResult
} = require('./helpers')

const ALERT_DP    = 'ExampleDP_Rpt1.'
const ADD_VALUES_DPE = `${ALERT_DP}:_alert_hdl.._add_values`
const CAME_DPE       = `${ALERT_DP}:_alert_hdl.._came_time`
const ALARM_VALUE    = 105   // > 99 → triggers alarm on ExampleDP_Rpt1
const ALERT_INPUT    = `{ time: "1970-01-01T00:00:00Z", count: 0, dpe: "${ADD_VALUES_DPE}" }`

function nowISO() { return new Date().toISOString() }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function dpWrite(value) {
  await gql(`mutation { api { dp { setWait(dpeNames: ["${ALERT_DP}"], values: [${value}]) } } }`)
}

module.exports = {
  name: 'Suite 18 — Alert Mutations (set / setWait / setTimed / setTimedWait)',

  async run(t) {

    // ── alertGet (read) ───────────────────────────────────────────────────────
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
      await dpWrite(ALARM_VALUE)
      await sleep(300)
      try {
        const res = await gql(`
          mutation($values: [Anytype!]!) {
            api {
              alert {
                set(alerts: [${ALERT_INPUT}], values: $values)
              }
            }
          }
        `, { values: [[42]] })
        const skipReason = assertNoUnexpectedErrors(res, '18.2')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.set')
        assertEqual(result, true, 'alert.set result')
        writeResult('18-02-alert-set', { alertDpe: ADD_VALUES_DPE, result })
      } finally {
        await dpWrite(0).catch(() => {})
      }
    })

    // ── alert.setWait ─────────────────────────────────────────────────────────
    await t('18.3', 'api.alert.setWait → Boolean (SKIP if no groups)', async () => {
      await dpWrite(ALARM_VALUE)
      await sleep(300)
      try {
        const res = await gql(`
          mutation($values: [Anytype!]!) {
            api {
              alert {
                setWait(alerts: [${ALERT_INPUT}], values: $values)
              }
            }
          }
        `, { values: [[42]] })
        const skipReason = assertNoUnexpectedErrors(res, '18.3')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setWait')
        assertEqual(result, true, 'alert.setWait result')
        writeResult('18-03-alert-set-wait', { alertDpe: ADD_VALUES_DPE, result })
      } finally {
        await dpWrite(0).catch(() => {})
      }
    })

    // ── alert.setTimed ────────────────────────────────────────────────────────
    await t('18.4', 'api.alert.setTimed → Boolean (SKIP if no groups)', async () => {
      await dpWrite(ALARM_VALUE)
      await sleep(300)
      try {
        const time = nowISO()
        const res = await gql(`
          mutation($values: [Anytype!]!) {
            api {
              alert {
                setTimed(time: "${time}", alerts: [${ALERT_INPUT}], values: $values)
              }
            }
          }
        `, { values: [[42]] })
        const skipReason = assertNoUnexpectedErrors(res, '18.4')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setTimed')
        assertEqual(result, true, 'alert.setTimed result')
        writeResult('18-04-alert-set-timed', { time, alertDpe: ADD_VALUES_DPE, result })
      } finally {
        await dpWrite(0).catch(() => {})
      }
    })

    // ── alert.setTimedWait ────────────────────────────────────────────────────
    await t('18.5', 'api.alert.setTimedWait → Boolean (SKIP if no groups)', async () => {
      await dpWrite(ALARM_VALUE)
      await sleep(300)
      try {
        const time = nowISO()
        const res = await gql(`
          mutation($values: [Anytype!]!) {
            api {
              alert {
                setTimedWait(time: "${time}", alerts: [${ALERT_INPUT}], values: $values)
              }
            }
          }
        `, { values: [[42]] })
        const skipReason = assertNoUnexpectedErrors(res, '18.5')
        if (skipReason) return `No alert groups — ${skipReason}`
        const result = dig(res, 'data.api.alert.setTimedWait')
        assertEqual(result, true, 'alert.setTimedWait result')
        writeResult('18-05-alert-set-timed-wait', { time, alertDpe: ADD_VALUES_DPE, result })
      } finally {
        await dpWrite(0).catch(() => {})
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
                names:     [":_alert_hdl.._add_values"]
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
