// tests/suite-07-history.js — dpGetPeriod using ExampleDP_Rpt* (archiving-enabled DPs)
//
// ExampleDP_Rpt1–4 have archiving configured in WinCC OA.
// dpGetPeriod requires an RDB backend to be running.  On systems without one
// the call returns a "No backends are defined" error — the test is marked SKIP.
// When an RDB backend IS present the result is written to tests/results/ for inspection.

const {
  gql,
  assertNoUnexpectedErrors, assertNotNull, assertIsArray, assertTypeOf, dig,
  writeResult
} = require('./helpers')

// RP DPs that have archiving AND alert-handling configured
const RPT_DPS = ['ExampleDP_Rpt1.', 'ExampleDP_Rpt2.', 'ExampleDP_Rpt3.', 'ExampleDP_Rpt4.']
const RPT_DP  = RPT_DPS[0]

// Time range: last 24 hours
const END   = new Date().toISOString()
const START = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

module.exports = {
  name: 'Suite 7 — History (dpGetPeriod with ExampleDP_Rpt*)',

  async run(t) {

    // ── Single DP history ─────────────────────────────────────────────────────
    await t('7.1', `api.dp.getPeriod(${RPT_DP}) last 24 h → data or SKIP (no RDB)`, async () => {
      const res = await gql(
        `{ api { dp { getPeriod(startTime: "${START}", endTime: "${END}", dpeNames: ["${RPT_DP}"]) } } }`
      )
      const skipReason = assertNoUnexpectedErrors(res, '7.1')
      if (skipReason) return `No RDB backend — ${skipReason}`
      const result = dig(res, 'data.api.dp.getPeriod')
      assertNotNull(result, 'getPeriod result')
      writeResult('07-01-dp-get-period-rpt1', { dp: RPT_DP, start: START, end: END, result })
    })

    // ── All four Rpt DPs history in one call ──────────────────────────────────
    await t('7.2', `api.dp.getPeriod(ExampleDP_Rpt1–4) last 24 h → data or SKIP`, async () => {
      const dpes = RPT_DPS
      const res = await gql(
        `{ api { dp { getPeriod(startTime: "${START}", endTime: "${END}", dpeNames: ${JSON.stringify(dpes)}) } } }`
      )
      const skipReason = assertNoUnexpectedErrors(res, '7.2')
      if (skipReason) return `No RDB backend — ${skipReason}`
      const result = dig(res, 'data.api.dp.getPeriod')
      assertNotNull(result, 'getPeriod multi result')
      writeResult('07-02-dp-get-period-rpt-all', { dpes, start: START, end: END, result })
    })

    // ── getPeriod for just the last minute (tight window) ────────────────────
    await t('7.3', `api.dp.getPeriod(${RPT_DP}) last 1 min → data or SKIP`, async () => {
      const endNow   = new Date().toISOString()
      const start1m  = new Date(Date.now() - 60 * 1000).toISOString()
      const res = await gql(
        `{ api { dp { getPeriod(startTime: "${start1m}", endTime: "${endNow}", dpeNames: ["${RPT_DP}"]) } } }`
      )
      const skipReason = assertNoUnexpectedErrors(res, '7.3')
      if (skipReason) return `No RDB backend — ${skipReason}`
      const result = dig(res, 'data.api.dp.getPeriod')
      assertNotNull(result, 'getPeriod 1min result')
      writeResult('07-03-dp-get-period-1min', { dp: RPT_DP, start: start1m, end: endNow, result })
    })
  }
}
