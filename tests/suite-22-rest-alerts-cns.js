// tests/suite-22-rest-alerts-cns.js — REST /restapi/v1/alerts and /restapi/v1/cns routes

const {
  gql, rest,
  DP_BIT, DP_FLOAT,
  assertNotNull, assertEqual, assertIsArray, assertTypeOf, dig,
  writeResult
} = require('./helpers')

const ALERT_DP    = DP_BIT
const ALERT_NAMES = [':_alert_hdl.._value', ':_alert_hdl.._text']
const SYSTEM      = 'System1'

// CNS path constants — same WinCC OA single-colon format as suite-09-gql-cns.js
const VIEW_NAME = 'AutotestView'
const TREE_NAME = 'AutotestTree'
const NODE_NAME = 'AutotestNode'
const VIEW_PATH = `${SYSTEM}.${VIEW_NAME}:`
const TREE_PATH = `${SYSTEM}.${VIEW_NAME}:${TREE_NAME}`
const NODE_PATH = `${SYSTEM}.${VIEW_NAME}:${TREE_NAME}.${NODE_NAME}`

function enc(s) { return encodeURIComponent(s) }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Trigger (true) and reset (false) the alert 3 times with 50ms spacing.
async function triggerAlerts() {
  const startMs = Date.now()
  for (let i = 0; i < 3; i++) {
    await gql(`mutation { api { dp { setWait(dpeNames: ["${ALERT_DP}"], values: [true]) } } }`)
    await sleep(50)
    await gql(`mutation { api { dp { setWait(dpeNames: ["${ALERT_DP}"], values: [false]) } } }`)
    await sleep(50)
  }
  return {
    start: new Date(startMs - 1000).toISOString(),
    end:   new Date(Date.now() + 1000).toISOString()
  }
}

module.exports = {
  name: 'Suite 22 — REST Alert & CNS Routes',

  async run(t) {

    // ── Alerts — read ─────────────────────────────────────────────────────────
    await t('22.1', 'GET /restapi/alerts (missing params) → 400', async () => {
      const { status, body } = await rest('GET', '/restapi/alerts')
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
      writeResult('22-01-rest-alerts-missing-params', { status, body })
    })

    await t('22.2', 'GET /restapi/alerts/period → trigger 3x then query', async () => {
      const { start, end } = await triggerAlerts()
      await sleep(300)

      const namesParam = ALERT_NAMES.join(',')
      const params = `startTime=${enc(start)}&endTime=${enc(end)}&names=${enc(namesParam)}`
      const { status, body } = await rest('GET', `/restapi/alerts/period?${params}`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body.alertTimes, 'body.alertTimes')
      assertIsArray(body.alertTimes, 'alertTimes')
      if (body.alertTimes.length === 0)
        throw new Error('Expected alert events but got empty alertTimes array')
      writeResult('22-02-rest-alert-period', { start, end, alertDp: ALERT_DP, names: ALERT_NAMES, result: body })
    })

    // ── Alerts — write (missing-param validation) ─────────────────────────────
    await t('22.3', 'PUT /restapi/alerts (missing params) → 400', async () => {
      const { status, body } = await rest('PUT', '/restapi/alerts', {})
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
      writeResult('22-03-rest-alert-set-missing-params', { status, body })
    })

    await t('22.4', 'PUT /restapi/alerts/wait (missing params) → 400', async () => {
      const { status, body } = await rest('PUT', '/restapi/alerts/wait', {})
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
      writeResult('22-04-rest-alert-set-wait-missing-params', { status, body })
    })

    await t('22.5', 'PUT /restapi/alerts/timed (missing params) → 400', async () => {
      const { status, body } = await rest('PUT', '/restapi/alerts/timed', {})
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
      writeResult('22-05-rest-alert-set-timed-missing-params', { status, body })
    })

    await t('22.6', 'PUT /restapi/alerts/timed-wait (missing params) → 400', async () => {
      const { status, body } = await rest('PUT', '/restapi/alerts/timed-wait', {})
      assertEqual(status, 400, 'HTTP status')
      assertNotNull(body.error, 'body.error')
      writeResult('22-06-rest-alert-set-timed-wait-missing-params', { status, body })
    })

    // ── CNS — baseline read ───────────────────────────────────────────────────
    await t('22.7', `GET /restapi/cns/views/${SYSTEM} → 200 with array`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/views/${enc(SYSTEM)}`)
      assertNotNull(body, 'response body')
      assertEqual(status, 200, 'HTTP status')
      const views = body.views || body
      assertIsArray(views, 'views')
      writeResult('22-07-rest-cns-views', { status, views })
    })

    // ── CNS — pre-cleanup ─────────────────────────────────────────────────────
    await t('22.8', `Pre-cleanup: DELETE /cns/views/${VIEW_PATH} if it exists`, async () => {
      await rest('DELETE', `/restapi/cns/views/${enc(VIEW_PATH)}`).catch(() => {})
    })

    // ── CNS — createView ──────────────────────────────────────────────────────
    await t('22.9', `POST /restapi/cns/views (create ${VIEW_PATH}) → { success: true }`, async () => {
      const { status, body } = await rest('POST', '/restapi/cns/views', {
        view: VIEW_PATH,
        displayName: VIEW_NAME
      })
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.success, true, 'body.success')
      writeResult('22-09-rest-cns-create-view', { view: VIEW_PATH, status, body })
    })

    await t('22.10', `GET /restapi/cns/views/${VIEW_PATH}/exists → { exists: true }`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/views/${enc(VIEW_PATH)}/exists`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.exists, true, 'body.exists')
      writeResult('22-10-rest-cns-view-exists-true', { path: VIEW_PATH, status, body })
    })

    // ── CNS — addTree ─────────────────────────────────────────────────────────
    await t('22.11', `POST /restapi/cns/trees (add ${TREE_NAME}) → { success: true }`, async () => {
      const { status, body } = await rest('POST', '/restapi/cns/trees', {
        cnsParentPath: VIEW_PATH,
        tree: { name: TREE_NAME, displayName: TREE_NAME }
      })
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.success, true, 'body.success')
      writeResult('22-11-rest-cns-add-tree', { parent: VIEW_PATH, tree: TREE_NAME, status, body })
    })

    await t('22.12', `GET /restapi/cns/trees/${VIEW_PATH} → { trees: [...] } contains ${TREE_NAME}`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/trees/${enc(VIEW_PATH)}`)
      assertEqual(status, 200, 'HTTP status')
      assertIsArray(body.trees, 'body.trees')
      if (!body.trees.some(tr => tr.includes(TREE_NAME)))
        throw new Error(`Expected tree "${TREE_NAME}" in ${JSON.stringify(body.trees)}`)
      writeResult('22-12-rest-cns-trees', { view: VIEW_PATH, status, trees: body.trees })
    })

    await t('22.13', `GET /restapi/cns/trees/${TREE_PATH}/exists → { exists: true }`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/trees/${enc(TREE_PATH)}/exists`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.exists, true, 'body.exists')
      writeResult('22-13-rest-cns-tree-exists-true', { path: TREE_PATH, status, body })
    })

    // ── CNS — addNode ─────────────────────────────────────────────────────────
    await t('22.14', `POST /restapi/cns/nodes (add ${NODE_NAME} to ${TREE_PATH}) → { success: true }`, async () => {
      const { status, body } = await rest('POST', '/restapi/cns/nodes', {
        cnsParentPath: TREE_PATH,
        name: NODE_NAME,
        displayName: NODE_NAME
      })
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.success, true, 'body.success')
      writeResult('22-14-rest-cns-add-node', { parent: TREE_PATH, node: NODE_NAME, status, body })
    })

    await t('22.15', `GET /restapi/cns/nodes/${TREE_PATH}/children → contains ${NODE_NAME}`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(TREE_PATH)}/children`)
      assertEqual(status, 200, 'HTTP status')
      assertIsArray(body.children, 'body.children')
      if (!body.children.some(c => c.includes(NODE_NAME)))
        throw new Error(`Expected node "${NODE_NAME}" in children ${JSON.stringify(body.children)}`)
      writeResult('22-15-rest-cns-children', { parent: TREE_PATH, status, children: body.children })
    })

    await t('22.16', `GET /restapi/cns/nodes/${NODE_PATH}/parent → contains ${TREE_NAME}`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(NODE_PATH)}/parent`)
      assertEqual(status, 200, 'HTTP status')
      assertTypeOf(body.parent, 'string', 'body.parent')
      if (!body.parent.includes(TREE_NAME))
        throw new Error(`Expected parent to contain "${TREE_NAME}", got: "${body.parent}"`)
      writeResult('22-16-rest-cns-parent', { node: NODE_PATH, status, body })
    })

    await t('22.17', `GET /restapi/cns/nodes/${NODE_PATH}/root → string`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(NODE_PATH)}/root`)
      assertEqual(status, 200, 'HTTP status')
      assertTypeOf(body.root, 'string', 'body.root')
      writeResult('22-17-rest-cns-root', { node: NODE_PATH, status, body })
    })

    await t('22.18', `GET /restapi/cns/nodes/${NODE_PATH}/display-name → displayName`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(NODE_PATH)}/display-name`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body.displayName, 'body.displayName')
      writeResult('22-18-rest-cns-display-name', { node: NODE_PATH, status, body })
    })

    await t('22.19', `GET /restapi/cns/nodes/${NODE_PATH}/display-path → displayPath`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(NODE_PATH)}/display-path`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      writeResult('22-19-rest-cns-display-path', { node: NODE_PATH, status, body })
    })

    await t('22.20', `GET /restapi/cns/nodes/${NODE_PATH}/id → string or null`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(NODE_PATH)}/id`)
      assertEqual(status, 200, 'HTTP status')
      assertNotNull(body, 'body')
      // id may be null/empty if no DP is linked to the node
      writeResult('22-20-rest-cns-node-id', { node: NODE_PATH, status, body })
    })

    await t('22.21', `GET /restapi/cns/nodes/${NODE_PATH}/exists → { exists: true }`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(NODE_PATH)}/exists`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.exists, true, 'body.exists')
      writeResult('22-21-rest-cns-node-exists-true', { path: NODE_PATH, status, body })
    })

    // ── CNS — property set/get ────────────────────────────────────────────────
    await t('22.22', `PUT /restapi/cns/nodes/${NODE_PATH}/property → set testKey`, async () => {
      const { status, body } = await rest('PUT', `/restapi/cns/nodes/${enc(NODE_PATH)}/property`, {
        key: 'testKey',
        value: 'testValue',
        valueType: 'STRING_VAR'
      })
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.success, true, 'body.success')
      writeResult('22-22-rest-cns-set-property', { node: NODE_PATH, key: 'testKey', status, body })
    })

    await t('22.23', `GET /restapi/cns/nodes/${NODE_PATH}/property/testKey → "testValue"`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(NODE_PATH)}/property/testKey`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.value, 'testValue', 'body.value round-trip')
      writeResult('22-23-rest-cns-get-property', { node: NODE_PATH, key: 'testKey', status, body })
    })

    await t('22.24', `GET /restapi/cns/nodes/${NODE_PATH}/properties → contains testKey`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/nodes/${enc(NODE_PATH)}/properties`)
      assertEqual(status, 200, 'HTTP status')
      assertIsArray(body.keys, 'body.keys')
      if (!body.keys.includes('testKey'))
        throw new Error(`Expected "testKey" in keys: ${JSON.stringify(body.keys)}`)
      writeResult('22-24-rest-cns-properties', { node: NODE_PATH, status, keys: body.keys })
    })

    // ── CNS — search ──────────────────────────────────────────────────────────
    await t('22.25', `GET /restapi/cns/nodes/search/by-name?pattern=${VIEW_NAME}* → nodes array`, async () => {
      const params = `pattern=${enc(VIEW_NAME + '*')}`
      const { status, body } = await rest('GET', `/restapi/cns/nodes/search/by-name?${params}`)
      assertEqual(status, 200, 'HTTP status')
      assertIsArray(body.nodes, 'body.nodes')
      writeResult('22-25-rest-cns-search-by-name', { pattern: VIEW_NAME + '*', status, nodes: body.nodes })
    })

    await t('22.26', `GET /restapi/cns/nodes/search/by-data?dpName=${DP_FLOAT} → nodes array`, async () => {
      const params = `dpName=${enc(DP_FLOAT)}`
      const { status, body } = await rest('GET', `/restapi/cns/nodes/search/by-data?${params}`)
      assertEqual(status, 200, 'HTTP status')
      assertIsArray(body.nodes, 'body.nodes')
      writeResult('22-26-rest-cns-search-by-data', { dpName: DP_FLOAT, status, nodes: body.nodes })
    })

    await t('22.27', `GET /restapi/cns/nodes/search/id-set?pattern=${VIEW_NAME}* → ids array`, async () => {
      const params = `pattern=${enc(VIEW_NAME + '*')}`
      const { status, body } = await rest('GET', `/restapi/cns/nodes/search/id-set?${params}`)
      assertEqual(status, 200, 'HTTP status')
      assertIsArray(body.ids, 'body.ids')
      writeResult('22-27-rest-cns-search-id-set', { pattern: VIEW_NAME + '*', status, ids: body.ids })
    })

    // ── CNS — validation ──────────────────────────────────────────────────────
    await t('22.28', 'GET /restapi/cns/validation/check-id?id=valid-id → { valid: boolean }', async () => {
      const { status, body } = await rest('GET', '/restapi/cns/validation/check-id?id=valid-id')
      assertEqual(status, 200, 'HTTP status')
      assertTypeOf(body.valid, 'boolean', 'body.valid')
      writeResult('22-28-rest-cns-check-id', { id: 'valid-id', status, body })
    })

    await t('22.29', 'POST /restapi/cns/validation/check-name { name: "TestName" } → { result: number }', async () => {
      const { status, body } = await rest('POST', '/restapi/cns/validation/check-name', { name: 'TestName' })
      assertEqual(status, 200, 'HTTP status')
      assertTypeOf(body.result, 'number', 'body.result')
      writeResult('22-29-rest-cns-check-name', { name: 'TestName', status, body })
    })

    await t('22.30', 'GET /restapi/cns/validation/check-separator?separator=. → { valid: boolean }', async () => {
      const { status, body } = await rest('GET', '/restapi/cns/validation/check-separator?separator=.')
      assertEqual(status, 200, 'HTTP status')
      assertTypeOf(body.valid, 'boolean', 'body.valid')
      writeResult('22-30-rest-cns-check-separator', { separator: '.', status, body })
    })

    // ── CNS — changeTree ──────────────────────────────────────────────────────
    await t('22.31', `PUT /restapi/cns/trees/${TREE_PATH} → change display name → success`, async () => {
      const { status, body } = await rest('PUT', `/restapi/cns/trees/${enc(TREE_PATH)}`, {
        tree: { name: TREE_NAME, displayName: `${TREE_NAME} (changed)` }
      })
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.success, true, 'body.success')
      writeResult('22-31-rest-cns-change-tree', { path: TREE_PATH, status, body })
    })

    // ── CNS — cleanup: deleteTree then deleteView ─────────────────────────────
    await t('22.32', `DELETE /restapi/cns/trees/${TREE_PATH} → success`, async () => {
      const { status, body } = await rest('DELETE', `/restapi/cns/trees/${enc(TREE_PATH)}`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.success, true, 'body.success')
    })

    await t('22.33', `GET /restapi/cns/trees/${TREE_PATH}/exists → false after delete`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/trees/${enc(TREE_PATH)}/exists`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.exists, false, 'body.exists after tree delete')
      writeResult('22-33-rest-cns-tree-exists-false', { path: TREE_PATH, status, body })
    })

    await t('22.34', `DELETE /restapi/cns/views/${VIEW_PATH} → success`, async () => {
      const { status, body } = await rest('DELETE', `/restapi/cns/views/${enc(VIEW_PATH)}`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.success, true, 'body.success')
    })

    await t('22.35', `GET /restapi/cns/views/${VIEW_PATH}/exists → false after delete`, async () => {
      const { status, body } = await rest('GET', `/restapi/cns/views/${enc(VIEW_PATH)}/exists`)
      assertEqual(status, 200, 'HTTP status')
      assertEqual(body.exists, false, 'body.exists after view delete')
      writeResult('22-35-rest-cns-view-exists-false', { path: VIEW_PATH, status, body })
    })
  }
}
