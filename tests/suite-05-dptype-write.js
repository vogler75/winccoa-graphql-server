// tests/suite-05-dptype-write.js — Data Point Type create → change → delete

const {
  gql,
  TEST_TYPE,
  assertNoErrors, assertEqual, assertIsArray, assertNotNull, dig
} = require('./helpers')

module.exports = {
  name: 'Suite 5 — Data Point Type Write',

  async run(t) {

    // ── Create ──────────────────────────────────────────────────────────────
    await t('5.1', `api.dpType.create(${TEST_TYPE}) → true`, async () => {
      // Clean up any leftover
      await gql(`mutation { api { dpType { delete(dpt: "${TEST_TYPE}") } } }`).catch(() => {})

      const res = await gql(`
        mutation {
          api { dpType { create(startNode: {
            name: "${TEST_TYPE}",
            type: STRUCT,
            children: [{ name: "value", type: FLOAT }]
          }) } }
        }
      `)
      assertNoErrors(res, '5.1')
      assertEqual(dig(res, 'data.api.dpType.create'), true, 'dpType.create')
    })

    await t('5.2', `api.dpType.dpTypeGet(${TEST_TYPE}) → has "value" child`, async () => {
      const res = await gql(`{ api { dpType { dpTypeGet(dpt: "${TEST_TYPE}") } } }`)
      assertNoErrors(res, '5.2')
      const node = dig(res, 'data.api.dpType.dpTypeGet')
      assertNotNull(node, 'dpTypeGet result')
      assertEqual(node.name, TEST_TYPE, 'dpTypeGet.name')
      assertIsArray(node.children, 'dpTypeGet.children')
      const names = node.children.map(c => c.name)
      if (!names.includes('value'))
        throw new Error(`Expected child "value" in ${JSON.stringify(names)}`)
    })

    // ── Change (add a second element) ────────────────────────────────────────
    await t('5.3', `api.dpType.change(${TEST_TYPE}) → add "count" INT child → true`, async () => {
      const res = await gql(`
        mutation {
          api { dpType { change(startNode: {
            name: "${TEST_TYPE}",
            type: STRUCT,
            children: [
              { name: "value", type: FLOAT },
              { name: "count", type: INT }
            ]
          }) } }
        }
      `)
      assertNoErrors(res, '5.3')
      assertEqual(dig(res, 'data.api.dpType.change'), true, 'dpType.change')
    })

    await t('5.4', `api.dpType.dpTypeGet(${TEST_TYPE}) → now has 2 children`, async () => {
      const res = await gql(`{ api { dpType { dpTypeGet(dpt: "${TEST_TYPE}") } } }`)
      assertNoErrors(res, '5.4')
      const node = dig(res, 'data.api.dpType.dpTypeGet')
      assertIsArray(node.children, 'children')
      if (node.children.length < 2)
        throw new Error(`Expected ≥2 children, got ${node.children.length}`)
    })

    // ── Delete ───────────────────────────────────────────────────────────────
    await t('5.5', `api.dpType.delete(${TEST_TYPE}) → true`, async () => {
      const res = await gql(`mutation { api { dpType { delete(dpt: "${TEST_TYPE}") } } }`)
      assertNoErrors(res, '5.5')
      assertEqual(dig(res, 'data.api.dpType.delete'), true, 'dpType.delete')
    })

    await t('5.6', `api.dp.exists(${TEST_TYPE}) → false after delete`, async () => {
      const res = await gql(`{ api { dp { exists(dpeName: "${TEST_TYPE}") } } }`)
      assertNoErrors(res, '5.6')
      assertEqual(dig(res, 'data.api.dp.exists'), false, 'dp.exists after dpType.delete')
    })
  }
}
