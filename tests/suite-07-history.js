// tests/suite-07-history.js — dpGetPeriod / REST history using ExampleDP_Rpt*
//
// ExampleDP_Rpt1–4 have archiving configured in WinCC OA.
// dpGetPeriod requires an RDB backend — tests SKIP gracefully without one.
//
// Before every history query we write 10 timed values (250 ms apart) to ensure
// there is actually data in the archive to retrieve.

const {
  gql, rest,
  DP_FLOAT,
  assertNoUnexpectedErrors, assertNotNull, assertIsArray, dig,
  writeResult
} = require('./helpers')

// RP DPs that have archiving AND alert-handling configured
const RPT_DPS = ['ExampleDP_Rpt1.', 'ExampleDP_Rpt2.', 'ExampleDP_Rpt3.', 'ExampleDP_Rpt4.']
const RPT_DP  = RPT_DPS[0]

// Write 100 timed values to a DPE as fast as possible (no artificial delay).
// Returns { writtenValues, start, end } where start/end bracket the writes with ±2 s margin.
async function writeHistoryValues(dpe) {
  const startMs = Date.now()
  const writtenValues = []
  for (let i = 0; i < 100; i++) {
    const ts  = new Date().toISOString()
    const val = parseFloat((i * 0.1).toFixed(1))
    await gql(`mutation { api { dp { setTimed(time: "${ts}", dpeNames: ["${dpe}"], values: [${val}]) } } }`)
    writtenValues.push({ ts, val })
  }
  return {
    writtenValues,
    start: new Date(startMs - 2000).toISOString(),
    end:   new Date(Date.now() + 2000).toISOString()
  }
}

module.exports = {
  name: 'Suite 7 — History (dpGetPeriod + REST history)',

  async run(t) {

    // ── GraphQL: single DP history ────────────────────────────────────────────
    await t('7.1', `api.dp.getPeriod(${RPT_DP}) — write 100 values then query window (SKIP if no RDB)`, async () => {
      const { writtenValues, start, end } = await writeHistoryValues(RPT_DP)

      const res = await gql(
        `{ api { dp { getPeriod(startTime: "${start}", endTime: "${end}", dpeNames: ["${RPT_DP}"]) } } }`
      )
      const skipReason = assertNoUnexpectedErrors(res, '7.1')
      if (skipReason) return `No RDB backend — ${skipReason}`
      const result = dig(res, 'data.api.dp.getPeriod')
      assertNotNull(result, 'getPeriod result')
      writeResult('07-01-dp-get-period-rpt1', { dp: RPT_DP, start, end, writtenValues, result })
    })

    // ── GraphQL: all four Rpt DPs in one call ─────────────────────────────────
    await t('7.2', 'api.dp.getPeriod(ExampleDP_Rpt1–4) — write values then query window (SKIP if no RDB)', async () => {
      // Write values to all four Rpt DPs and use the widest bracketing window
      let start, end
      const allWritten = {}
      for (const dp of RPT_DPS) {
        const r = await writeHistoryValues(dp)
        allWritten[dp] = r.writtenValues
        start = start ? (r.start < start ? r.start : start) : r.start
        end   = end   ? (r.end   > end   ? r.end   : end)   : r.end
      }

      const res = await gql(
        `{ api { dp { getPeriod(startTime: "${start}", endTime: "${end}", dpeNames: ${JSON.stringify(RPT_DPS)}) } } }`
      )
      const skipReason = assertNoUnexpectedErrors(res, '7.2')
      if (skipReason) return `No RDB backend — ${skipReason}`
      const result = dig(res, 'data.api.dp.getPeriod')
      assertNotNull(result, 'getPeriod multi result')
      writeResult('07-02-dp-get-period-rpt-all', { dpes: RPT_DPS, start, end, allWritten, result })
    })

    // ── REST: tag history ─────────────────────────────────────────────────────
    await t('7.3', `REST GET /restapi/tags/history(${DP_FLOAT}) — write 100 values then query (SKIP if no RDB)`, async () => {
      const { writtenValues, start, end } = await writeHistoryValues(DP_FLOAT)

      const params = `dpeNames=${encodeURIComponent(DP_FLOAT)}&startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`
      const { status, body } = await rest('GET', `/restapi/tags/history?${params}`)
      assertNotNull(body, 'response body')
      if (status === 500 || body.error) {
        writeResult('07-03-rest-tags-history', { skipped: true, status, error: body.error || body.message, writtenValues, note: 'values were written but RDB is not available' })
        return 'No RDB backend — history returns error (expected)'
      }
      assertNotNull(body.history, 'body.history')
      writeResult('07-03-rest-tags-history', { dpe: DP_FLOAT, start, end, writtenValues, history: body.history })
    })
  }
}
