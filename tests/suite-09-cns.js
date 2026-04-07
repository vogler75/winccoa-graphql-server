// tests/suite-09-cns.js — CNS queries

const {
  gql, rest,
  assertNoErrors, assertIsArray, assertTypeOf, assertEqual, assertNotNull, dig,
  writeResult
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
      const result = dig(res, 'data.api.cns.viewExists')
      assertEqual(result, false, 'cns.viewExists')
      writeResult('09-02-cns-view-exists-false', { path: 'nonexistent_view', result })
    })

    await t('9.3', 'api.cns.treeExists("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { treeExists(path: "nonexistent") } } }')
      assertNoErrors(res, '9.3')
      const result = dig(res, 'data.api.cns.treeExists')
      assertEqual(result, false, 'cns.treeExists')
      writeResult('09-03-cns-tree-exists-false', { path: 'nonexistent', result })
    })

    await t('9.4', 'api.cns.nodeExists("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { nodeExists(path: "nonexistent") } } }')
      assertNoErrors(res, '9.4')
      const result = dig(res, 'data.api.cns.nodeExists')
      assertEqual(result, false, 'cns.nodeExists')
      writeResult('09-04-cns-node-exists-false', { path: 'nonexistent', result })
    })

    await t('9.5', 'api.cns.checkSeparator(".") → Boolean', async () => {
      const res = await gql('{ api { cns { checkSeparator(separator: ".") } } }')
      assertNoErrors(res, '9.5')
      const result = dig(res, 'data.api.cns.checkSeparator')
      assertTypeOf(result, 'boolean', 'cns.checkSeparator')
      writeResult('09-05-cns-check-separator', { separator: '.', result })
    })

    await t('9.6', 'api.cns.checkId("valid-id") → Boolean', async () => {
      const res = await gql('{ api { cns { checkId(id: "valid-id") } } }')
      assertNoErrors(res, '9.6')
      const result = dig(res, 'data.api.cns.checkId')
      assertTypeOf(result, 'boolean', 'cns.checkId')
      writeResult('09-06-cns-check-id', { id: 'valid-id', result })
    })

    await t('9.7', 'api.cns.checkName → Int', async () => {
      const res = await gql('{ api { cns { checkName(name: "TestName") } } }')
      assertNoErrors(res, '9.7')
      const result = dig(res, 'data.api.cns.checkName')
      assertTypeOf(result, 'number', 'cns.checkName')
      writeResult('09-07-cns-check-name', { name: 'TestName', result })
    })

    await t('9.8', 'api.cns.isView("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { isView(path: "nonexistent") } } }')
      assertNoErrors(res, '9.8')
      const result = dig(res, 'data.api.cns.isView')
      assertEqual(result, false, 'cns.isView')
      writeResult('09-08-cns-is-view-false', { path: 'nonexistent', result })
    })

    await t('9.9', 'api.cns.isTree("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { isTree(path: "nonexistent") } } }')
      assertNoErrors(res, '9.9')
      const result = dig(res, 'data.api.cns.isTree')
      assertEqual(result, false, 'cns.isTree')
      writeResult('09-09-cns-is-tree-false', { path: 'nonexistent', result })
    })

    await t('9.10', 'api.cns.isNode("nonexistent") → false', async () => {
      const res = await gql('{ api { cns { isNode(path: "nonexistent") } } }')
      assertNoErrors(res, '9.10')
      const result = dig(res, 'data.api.cns.isNode')
      assertEqual(result, false, 'cns.isNode')
      writeResult('09-10-cns-is-node-false', { path: 'nonexistent', result })
    })

    await t('9.11', 'REST GET /restapi/cns/views/:systemName → 200 with array', async () => {
      const { status, body } = await rest('GET', '/restapi/cns/views/')
      // Empty system name yields [] on this server; 404 also acceptable
      assertNotNull(body, 'response body')
      if (status === 404) return 'Route needs system name — skipping'
      assertEqual(status, 200, 'HTTP status')
      const views = body.views || body
      assertIsArray(views, 'views')
      writeResult('09-11-rest-cns-views', { status, views })
    })
  }
}
