// tests/suite-01-system.js — System & Health checks

const { gql, rest, assertEqual, assertNotNull, assertTypeOf, assertNoErrors, dig, writeResult } = require('./helpers')

module.exports = {
  name: 'Suite 1 — System / Health',

  async run(t) {

    await t('1.1', 'GET /health → status: "healthy"', async () => {
      const { status, body } = await rest('GET', '/health')
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.status, 'healthy', 'body.status')
    })

    await t('1.2', 'api.system.getSystemName → "System1:"', async () => {
      const res = await gql('{ api { system { getSystemName } } }')
      assertNoErrors(res, '1.2')
      assertEqual(dig(res, 'data.api.system.getSystemName'), 'System1:', 'getSystemName')
    })

    await t('1.3', 'api.system.getSystemId → 1', async () => {
      const res = await gql('{ api { system { getSystemId } } }')
      assertNoErrors(res, '1.3')
      assertEqual(dig(res, 'data.api.system.getSystemId'), 1, 'getSystemId')
    })

    await t('1.4', 'api.system.getVersionInfo → api.version + winccoa.version', async () => {
      const res = await gql('{ api { system { getVersionInfo { api { version } winccoa { version display } } } } }')
      assertNoErrors(res, '1.4')
      const info = dig(res, 'data.api.system.getVersionInfo')
      assertNotNull(info, 'getVersionInfo')
      assertTypeOf(info.api.version, 'number', 'api.version')
      assertTypeOf(info.winccoa.version, 'string', 'winccoa.version')
      writeResult('01-04-version-info', info)
    })

    await t('1.5', 'api.redundancy.isRedundant → Boolean', async () => {
      const res = await gql('{ api { redundancy { isRedundant } } }')
      assertNoErrors(res, '1.5')
      assertTypeOf(dig(res, 'data.api.redundancy.isRedundant'), 'boolean', 'isRedundant')
    })

    await t('1.6', 'api.redundancy.isReduActive → Boolean', async () => {
      const res = await gql('{ api { redundancy { isReduActive } } }')
      assertNoErrors(res, '1.6')
      assertTypeOf(dig(res, 'data.api.redundancy.isReduActive'), 'boolean', 'isReduActive')
    })
  }
}
