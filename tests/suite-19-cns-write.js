// tests/suite-19-cns-write.js — CNS mutations lifecycle
//
// Full create → read → change → delete cycle for CNS views, trees, nodes and
// properties.  All read results are written to tests/results/ for manual review.
//
// WinCC OA CNS path format:
//   createView / deleteView / addTree / getTrees:  "System1.VIEW:"
//   addNode / getChildren / changeTree / deleteTree / getProperty / setProperty:
//                                                   "System1.VIEW:TREE"
//   getParent / nested nodes:                       "System1.VIEW:TREE.NODE"
//   viewExists:  "System1.VIEW::"  (double colon)
//   treeExists:  "System1.VIEW::TREE"
//   nodeExists:  "System1.VIEW::TREE.NODE"

const {
  gql, rest,
  assertNoErrors, assertEqual, assertIsArray, assertTypeOf, assertNotNull, dig,
  writeResult
} = require('./helpers')

const SYSTEM    = 'System1'
const VIEW_NAME = 'AutotestView'
const TREE_NAME = 'AutotestTree'
const NODE_NAME = 'AutotestNode'

// Path helpers matching WinCC OA CNS conventions
const VIEW_ARG       = `${SYSTEM}.${VIEW_NAME}:`           // for create/delete/addTree/getTrees
const VIEW_EXISTS    = `${SYSTEM}.${VIEW_NAME}::`          // for viewExists (double colon)
const TREE_ARG       = `${SYSTEM}.${VIEW_NAME}:${TREE_NAME}`   // for addNode/delete/change/children
const TREE_EXISTS    = `${SYSTEM}.${VIEW_NAME}::${TREE_NAME}`  // for treeExists
const NODE_ARG       = `${SYSTEM}.${VIEW_NAME}:${TREE_NAME}.${NODE_NAME}`  // for setProperty/getProperty/getChildren/getParent
const NODE_EXISTS    = `${SYSTEM}.${VIEW_NAME}::${TREE_NAME}.${NODE_NAME}` // for nodeExists

module.exports = {
  name: 'Suite 19 — CNS Mutations (createView / addTree / addNode / setProperty / delete)',

  async run(t) {

    // ── Read existing views (baseline) ────────────────────────────────────────
    await t('19.1', 'api.cns.getViews("") → write current view list', async () => {
      const res = await gql('{ api { cns { getViews(systemName: "") } } }')
      assertNoErrors(res, '19.1')
      const views = dig(res, 'data.api.cns.getViews')
      assertIsArray(views, 'cns.getViews')
      writeResult('19-01-cns-views-before', { views })
    })

    // ── Clean up any leftover from previous failed run ─────────────────────────
    await t('19.2', `Pre-cleanup: delete ${VIEW_NAME} if it exists`, async () => {
      // Silently ignore errors — view may not exist
      await gql(
        `mutation { api { cns { deleteView(view: "${VIEW_ARG}") } } }`
      ).catch(() => {})
    })

    // ── createView ────────────────────────────────────────────────────────────
    await t('19.3', `api.cns.createView(${VIEW_ARG}) → true`, async () => {
      const res = await gql(`
        mutation {
          api {
            cns {
              createView(
                view: "${VIEW_ARG}",
                displayName: "${VIEW_NAME}"
              )
            }
          }
        }
      `)
      assertNoErrors(res, '19.3')
      assertEqual(dig(res, 'data.api.cns.createView'), true, 'cns.createView')
    })

    // ── viewExists after create ───────────────────────────────────────────────
    await t('19.4', `api.cns.viewExists(${VIEW_EXISTS}) → true`, async () => {
      const res = await gql(`{ api { cns { viewExists(path: "${VIEW_EXISTS}") } } }`)
      assertNoErrors(res, '19.4')
      assertEqual(dig(res, 'data.api.cns.viewExists'), true, 'cns.viewExists')
    })

    // ── addTree ───────────────────────────────────────────────────────────────
    await t('19.5', `api.cns.addTree(${VIEW_ARG}, tree) → true`, async () => {
      const res = await gql(`
        mutation {
          api {
            cns {
              addTree(
                cnsParentPath: "${VIEW_ARG}",
                tree: {
                  name:        "${TREE_NAME}",
                  displayName: "${TREE_NAME}"
                }
              )
            }
          }
        }
      `)
      assertNoErrors(res, '19.5')
      assertEqual(dig(res, 'data.api.cns.addTree'), true, 'cns.addTree')
    })

    // ── treeExists after addTree ──────────────────────────────────────────────
    await t('19.6', `api.cns.treeExists(${TREE_EXISTS}) → true`, async () => {
      const res = await gql(`{ api { cns { treeExists(path: "${TREE_EXISTS}") } } }`)
      assertNoErrors(res, '19.6')
      assertEqual(dig(res, 'data.api.cns.treeExists'), true, 'cns.treeExists')
    })

    // ── addNode ───────────────────────────────────────────────────────────────
    await t('19.7', `api.cns.addNode(${TREE_ARG}, node) → true`, async () => {
      const res = await gql(`
        mutation {
          api {
            cns {
              addNode(
                cnsParentPath: "${TREE_ARG}",
                name:          "${NODE_NAME}",
                displayName:   "${NODE_NAME}"
              )
            }
          }
        }
      `)
      assertNoErrors(res, '19.7')
      assertEqual(dig(res, 'data.api.cns.addNode'), true, 'cns.addNode')
    })

    // ── nodeExists after addNode ──────────────────────────────────────────────
    await t('19.8', `api.cns.nodeExists(${NODE_EXISTS}) → true`, async () => {
      const res = await gql(`{ api { cns { nodeExists(path: "${NODE_EXISTS}") } } }`)
      assertNoErrors(res, '19.8')
      assertEqual(dig(res, 'data.api.cns.nodeExists'), true, 'cns.nodeExists')
    })

    // ── setProperty ──────────────────────────────────────────────────────────
    await t('19.9', `api.cns.setProperty(${NODE_ARG}, key=testKey) → true`, async () => {
      const res = await gql(`
        mutation {
          api {
            cns {
              setProperty(
                cnsPath:   "${NODE_ARG}",
                key:       "testKey",
                value:     "testValue",
                valueType: STRING_VAR
              )
            }
          }
        }
      `)
      assertNoErrors(res, '19.9')
      assertEqual(dig(res, 'data.api.cns.setProperty'), true, 'cns.setProperty')
    })

    // ── getProperty round-trip ────────────────────────────────────────────────
    await t('19.10', `api.cns.getProperty(${NODE_ARG}, testKey) → "testValue"`, async () => {
      const res = await gql(
        `{ api { cns { getProperty(cnsPath: "${NODE_ARG}", key: "testKey") } } }`
      )
      assertNoErrors(res, '19.10')
      const value = dig(res, 'data.api.cns.getProperty')
      assertEqual(value, 'testValue', 'cns.getProperty round-trip')
      writeResult('19-10-cns-property-roundtrip', { nodePath: NODE_ARG, key: 'testKey', value })
    })

    // ── getPropertyKeys ───────────────────────────────────────────────────────
    await t('19.11', `api.cns.getPropertyKeys(${NODE_ARG}) → contains "testKey"`, async () => {
      const res = await gql(
        `{ api { cns { getPropertyKeys(cnsPath: "${NODE_ARG}") } } }`
      )
      assertNoErrors(res, '19.11')
      const keys = dig(res, 'data.api.cns.getPropertyKeys')
      assertIsArray(keys, 'cns.getPropertyKeys')
      if (!keys.includes('testKey'))
        throw new Error(`Expected key "testKey" in [${keys.join(', ')}]`)
      writeResult('19-11-cns-property-keys', { nodePath: NODE_ARG, keys })
    })

    // ── getTrees ──────────────────────────────────────────────────────────────
    await t('19.12', `api.cns.getTrees(${VIEW_ARG}) → contains ${TREE_NAME}`, async () => {
      const res = await gql(`{ api { cns { getTrees(view: "${VIEW_ARG}") } } }`)
      assertNoErrors(res, '19.12')
      const trees = dig(res, 'data.api.cns.getTrees')
      assertIsArray(trees, 'cns.getTrees')
      if (!trees.some(t => t.includes(TREE_NAME)))
        throw new Error(`Expected tree "${TREE_NAME}" in [${trees.join(', ')}]`)
      writeResult('19-12-cns-trees', { view: VIEW_ARG, trees })
    })

    // ── getChildren of tree root ──────────────────────────────────────────────
    await t('19.13', `api.cns.getChildren(${TREE_ARG}) → contains ${NODE_NAME}`, async () => {
      const res = await gql(`{ api { cns { getChildren(cnsPath: "${TREE_ARG}") } } }`)
      assertNoErrors(res, '19.13')
      const children = dig(res, 'data.api.cns.getChildren')
      assertIsArray(children, 'cns.getChildren')
      if (!children.some(c => c.includes(NODE_NAME)))
        throw new Error(`Expected node "${NODE_NAME}" in children [${children.join(', ')}]`)
      writeResult('19-13-cns-children', { parent: TREE_ARG, children })
    })

    // ── getParent of node ─────────────────────────────────────────────────────
    await t('19.14', `api.cns.getParent(${NODE_ARG}) → contains ${TREE_NAME}`, async () => {
      const res = await gql(`{ api { cns { getParent(cnsPath: "${NODE_ARG}") } } }`)
      assertNoErrors(res, '19.14')
      const parent = dig(res, 'data.api.cns.getParent')
      assertTypeOf(parent, 'string', 'cns.getParent')
      if (!parent.includes(TREE_NAME))
        throw new Error(`Expected parent to contain "${TREE_NAME}", got: "${parent}"`)
      writeResult('19-14-cns-parent', { node: NODE_ARG, parent })
    })

    // ── changeTree ────────────────────────────────────────────────────────────
    await t('19.15', `api.cns.changeTree(${TREE_ARG}) → rename display name → true`, async () => {
      const res = await gql(`
        mutation {
          api {
            cns {
              changeTree(
                cnsPath: "${TREE_ARG}",
                tree: {
                  name:        "${TREE_NAME}",
                  displayName: "${TREE_NAME} (changed)"
                }
              )
            }
          }
        }
      `)
      assertNoErrors(res, '19.15')
      assertEqual(dig(res, 'data.api.cns.changeTree'), true, 'cns.changeTree')
    })

    // ── Cleanup: deleteTree ───────────────────────────────────────────────────
    await t('19.16', `api.cns.deleteTree(${TREE_ARG}) → true`, async () => {
      const res = await gql(
        `mutation { api { cns { deleteTree(cnsPath: "${TREE_ARG}") } } }`
      )
      assertNoErrors(res, '19.16')
      assertEqual(dig(res, 'data.api.cns.deleteTree'), true, 'cns.deleteTree')
    })

    await t('19.17', `api.cns.treeExists(${TREE_EXISTS}) → false after delete`, async () => {
      const res = await gql(`{ api { cns { treeExists(path: "${TREE_EXISTS}") } } }`)
      assertNoErrors(res, '19.17')
      assertEqual(dig(res, 'data.api.cns.treeExists'), false, 'cns.treeExists after delete')
    })

    // ── Cleanup: deleteView ───────────────────────────────────────────────────
    await t('19.18', `api.cns.deleteView(${VIEW_ARG}) → true`, async () => {
      const res = await gql(
        `mutation { api { cns { deleteView(view: "${VIEW_ARG}") } } }`
      )
      assertNoErrors(res, '19.18')
      assertEqual(dig(res, 'data.api.cns.deleteView'), true, 'cns.deleteView')
    })

    await t('19.19', `api.cns.viewExists(${VIEW_EXISTS}) → false after delete`, async () => {
      const res = await gql(`{ api { cns { viewExists(path: "${VIEW_EXISTS}") } } }`)
      assertNoErrors(res, '19.19')
      assertEqual(dig(res, 'data.api.cns.viewExists'), false, 'cns.viewExists after delete')
    })

    // ── Write final state to results ──────────────────────────────────────────
    await t('19.20', 'api.cns.getViews("") → write final view list', async () => {
      const res = await gql('{ api { cns { getViews(systemName: "") } } }')
      assertNoErrors(res, '19.20')
      const views = dig(res, 'data.api.cns.getViews')
      assertIsArray(views, 'cns.getViews final')
      writeResult('19-20-cns-views-after', { views })
     })
  }
}
