// tests/suite-11-auth.js — Authentication (login mutation + REST login)

const {
  gql, rest,
  assertNotNull, assertEqual, assertTypeOf, dig,
  writeResult
} = require('./helpers')

module.exports = {
  name: 'Suite 11 — Authentication',

  async run(t) {

    await t('11.1', 'login with wrong credentials → GraphQL error', async () => {
      const res = await gql('mutation { login(username: "wrong", password: "wrong") { token expiresAt } }')
      assertNotNull(res.errors, 'errors array')
      if (!Array.isArray(res.errors) || res.errors.length === 0)
        throw new Error('Expected errors array to be non-empty')
      const msg = res.errors[0].message
      if (!msg.toLowerCase().includes('invalid'))
        throw new Error(`Expected "Invalid ..." error, got: ${msg}`)
      writeResult('11-01-login-wrong-creds', { errors: res.errors.map(e => e.message) })
    })

    await t('11.2', 'REST POST /restapi/auth/login with wrong creds → 401', async () => {
      const { status, body } = await rest('POST', '/restapi/auth/login', {
        username: 'wrong',
        password: 'wrong'
      })
      assertEqual(status, 401, 'HTTP status')
      writeResult('11-02-rest-login-wrong-creds', { status, body })
    })

    await t('11.3', 'login with correct creds → { token, expiresAt } (skipped if not configured)', async () => {
      const username = process.env.ADMIN_USERNAME
      const password = process.env.ADMIN_PASSWORD
      if (!username || !password) {
        writeResult('11-03-login-correct-creds', { skipped: true, note: 'ADMIN_USERNAME/ADMIN_PASSWORD env vars not set' })
        return 'ADMIN_USERNAME/ADMIN_PASSWORD env vars not set — skipping'
      }
      const res = await gql(
        `mutation { login(username: "${username}", password: "${password}") { token expiresAt } }`
      )
      assertNotNull(res.data, 'response.data')
      const payload = dig(res, 'data.login')
      assertNotNull(payload, 'login payload')
      assertTypeOf(payload.token, 'string', 'token')
      assertNotNull(payload.expiresAt, 'expiresAt')
      writeResult('11-03-login-correct-creds', { expiresAt: payload.expiresAt })
    })
  }
}
