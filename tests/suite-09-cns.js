// tests/suite-09-cns.js — CNS queries

const {
  gql, rest,
  assertNoErrors, assertIsArray, assertTypeOf, assertEqual, assertNotNull, dig, writeResult
} = require('./helpers')

module.exports = {
  name: 'Suite 9 — CNS Queries',

  async run(t) {

    await t('9.1', 'api.cns.getViews("") → array (empty ok)', async () => {
      const res = await gql('{ api { cns { getViews(systemName: "") } } }')
      assertNoErrors(res, '9.1')
      const views = dig(res, 'data.api.cns.getViews')
      assertIsArray(views, 'cns.getViews')
      writeResult('09-01-cns-views', { views })
    })

    await t('9.2', 'api.cns.viewExists("nonexistent_view") → false', async () => {
      const res = await gql('{ api { cns { viewExists(path: "nonexistent_view") } } }')
      assertNoErrors(res, '9.2')
      assertEqual(dig(res, 'data.api.cns.viewExists'), false, 'cns.viewExists')
    })

    await t('9.3', 'api.cns.treeExists("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { treeExists(path: "nonexistent") } } }')
      assertNoErrors(res, '9.3')
      assertEqual(dig(res, 'data.api.cns.treeExists'), false, 'cns.treeExists')
    })

    await t('9.4', 'api.cns.nodeExists("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { nodeExists(path: "nonexistent") } } }')
      assertNoErrors(res, '9.4')
      assertEqual(dig(res, 'data.api.cns.nodeExists'), false, 'cns.nodeExists')
    })

    await t('9.5', 'api.cns.checkSeparator(".") → Boolean', async () => {
      const res = await gql('{ api { cns { checkSeparator(separator: ".") } } }')
      assertNoErrors(res, '9.5')
      assertTypeOf(dig(res, 'data.api.cns.checkSeparator'), 'boolean', 'cns.checkSeparator')
    })

    await t('9.6', 'api.cns.checkId("valid-id") → Boolean', async () => {
      const res = await gql('{ api { cns { checkId(id: "valid-id") } } }')
      assertNoErrors(res, '9.6')
      assertTypeOf(dig(res, 'data.api.cns.checkId'), 'boolean', 'cns.checkId')
    })

    await t('9.7', 'api.cns.checkName → Int', async () => {
      const res = await gql('{ api { cns { checkName(name: "TestName") } } }')
      assertNoErrors(res, '9.7')
      assertTypeOf(dig(res, 'data.api.cns.checkName'), 'number', 'cns.checkName')
    })

    await t('9.8', 'api.cns.isView("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { isView(path: "nonexistent") } } }')
      assertNoErrors(res, '9.8')
      assertEqual(dig(res, 'data.api.cns.isView'), false, 'cns.isView')
    })

    await t('9.9', 'api.cns.isTree("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { isTree(path: "nonexistent") } } }')
      assertNoErrors(res, '9.9')
      assertEqual(dig(res, 'data.api.cns.isTree'), false, 'cns.isTree')
    })

    await t('9.10', 'api.cns.isNode("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { isNode(path: "nonexistent") } } }')
      assertNoErrors(res, '9.10')
      assertEqual(dig(res, 'data.api.cns.isNode'), false, 'cns.isNode')
    })

    await t('9.11', 'REST GET /restapi/cns/views/:systemName → 200 with array', async () => {
      const { status, body } = await rest('GET', '/restapi/cns/views/')
      // Empty system name yields [] on this server; 404 also acceptable
      assertNotNull(body, 'response body')
      if (status === 404) return 'Route needs system name — skipping'
      assertEqual(status, 200, 'HTTP status')
      assertIsArray(body.views || body, 'views')
    })
  }
}
