// CNS hierarchy resolvers

const { parseDataPointName, getSystemInfo } = require('./helpers')

function createCnsResolvers(winccoa, logger) {
  return {
    CNS: {
      async view(cns, { name }) {
        try {
          const systemName = cns.system ? cns.system.name : winccoa.getSystemName()
          const views = await winccoa.cnsGetViews(systemName)

          if (!views.includes(name)) return null

          const displayNames = await winccoa.cnsGetDisplayNames(name)

          return {
            name,
            displayName: displayNames,
            separator: '/',
            system: cns.system
          }
        } catch (error) {
          logger.error('CNS.view error:', error)
          return null
        }
      },

      async views(cns) {
        try {
          const systemName = cns.system ? cns.system.name : winccoa.getSystemName()
          const viewNames = await winccoa.cnsGetViews(systemName)

          const views = []
          for (const name of viewNames) {
            try {
              const displayNames = await winccoa.cnsGetDisplayNames(name)
              views.push({
                name,
                displayName: displayNames,
                separator: '/',
                system: cns.system
              })
            } catch (e) {
              logger.warn(`Failed to get display name for view ${name}:`, e)
            }
          }

          return views
        } catch (error) {
          logger.error('CNS.views error:', error)
          return []
        }
      },

      async searchNodes(cns, { pattern, viewPath, searchMode, langIdx, type }) {
        try {
          const paths = await winccoa.cnsGetNodesByName(pattern, viewPath, searchMode, langIdx, type)

          return paths.map(path => ({
            path,
            system: cns.system
          }))
        } catch (error) {
          logger.error('CNS.searchNodes error:', error)
          return []
        }
      },

      async searchByDataPoint(cns, { dataPoint, type, viewPath }) {
        try {
          const paths = await winccoa.cnsGetNodesByData(dataPoint, type, viewPath)

          return paths.map(path => ({
            path,
            dpName: dataPoint,
            system: cns.system
          }))
        } catch (error) {
          logger.error('CNS.searchByDataPoint error:', error)
          return []
        }
      }
    },

    CNSView: {
      system(view) {
        return view.system
      },

      async tree(view, { name }) {
        try {
          const treePath = `${view.name}/${name}`
          const exists = await winccoa.cns_treeExists(treePath)
          if (!exists) return null

          const displayNames = await winccoa.cnsGetDisplayNames(treePath)
          const rootPath = await winccoa.cnsGetRoot(treePath)

          return {
            name,
            displayName: displayNames,
            rootPath,
            view
          }
        } catch (error) {
          logger.error('CNSView.tree error:', error)
          return null
        }
      },

      async trees(view) {
        try {
          const treePaths = await winccoa.cnsGetTrees(view.name)

          const trees = []
          for (const path of treePaths) {
            try {
              const name = path.split('/').pop()
              const displayNames = await winccoa.cnsGetDisplayNames(path)
              const rootPath = await winccoa.cnsGetRoot(path)

              trees.push({
                name,
                displayName: displayNames,
                rootPath,
                view
              })
            } catch (e) {
              logger.warn(`Failed to get tree info for ${path}:`, e)
            }
          }

          return trees
        } catch (error) {
          logger.error('CNSView.trees error:', error)
          return []
        }
      },

      async exists(view) {
        try {
          return await winccoa.cns_viewExists(view.name)
        } catch (error) {
          return false
        }
      }
    },

    CNSTree: {
      view(tree) {
        return tree.view
      },

      async root(tree) {
        try {
          const rootPath = tree.rootPath || await winccoa.cnsGetRoot(`${tree.view.name}/${tree.name}`)
          const displayNames = await winccoa.cnsGetDisplayNames(rootPath)
          const displayPath = await winccoa.cnsGetDisplayPath(rootPath)
          const dpName = await winccoa.cnsGetId(rootPath)

          return {
            path: rootPath,
            name: rootPath.split('/').pop(),
            displayName: displayNames,
            displayPath: displayPath,
            dpName: dpName,
            tree
          }
        } catch (error) {
          logger.error('CNSTree.root error:', error)
          throw error
        }
      },

      async exists(tree) {
        try {
          const treePath = `${tree.view.name}/${tree.name}`
          return await winccoa.cns_treeExists(treePath)
        } catch (error) {
          return false
        }
      }
    },

    CNSNode: {
      async name(node) {
        if (node.name) return node.name
        return node.path.split('/').pop()
      },

      async displayName(node) {
        if (node.displayName) return node.displayName

        try {
          return await winccoa.cnsGetDisplayNames(node.path)
        } catch (error) {
          logger.error('CNSNode.displayName error:', error)
          return {}
        }
      },

      async displayPath(node) {
        if (node.displayPath) return node.displayPath

        try {
          return await winccoa.cnsGetDisplayPath(node.path)
        } catch (error) {
          logger.error('CNSNode.displayPath error:', error)
          return {}
        }
      },

      async parent(node) {
        try {
          const parentPath = await winccoa.cnsGetParent(node.path)
          if (!parentPath || parentPath === node.path) return null

          return {
            path: parentPath,
            tree: node.tree
          }
        } catch (error) {
          logger.error('CNSNode.parent error:', error)
          return null
        }
      },

      async children(node) {
        try {
          const childPaths = await winccoa.cnsGetChildren(node.path)

          return childPaths.map(path => ({
            path,
            tree: node.tree
          }))
        } catch (error) {
          logger.error('CNSNode.children error:', error)
          return []
        }
      },

      async root(node) {
        if (node.tree && node.tree.rootPath) {
          return {
            path: node.tree.rootPath,
            tree: node.tree
          }
        }

        try {
          const rootPath = await winccoa.cnsGetRoot(node.path)
          return {
            path: rootPath,
            tree: node.tree
          }
        } catch (error) {
          logger.error('CNSNode.root error:', error)
          throw error
        }
      },

      tree(node) {
        return node.tree
      },

      async dp(node) {
        const dpeName = node.dpName || (await winccoa.cnsGetId(node.path))
        if (!dpeName) return null

        try {
          const parsed = parseDataPointName(dpeName)
          const system = await getSystemInfo(winccoa, parsed.systemName)
          const typeName = await winccoa.dpTypeName(parsed.dpName)

          return {
            name: parsed.dpName,
            fullName: dpeName,
            system,
            typeName
          }
        } catch (error) {
          logger.error('CNSNode.dp error:', error)
          return null
        }
      },

      async dpName(node) {
        if (node.dpName) return node.dpName

        try {
          return await winccoa.cnsGetId(node.path)
        } catch (error) {
          return null
        }
      },

      async property(node, { key }) {
        try {
          return await winccoa.cnsGetProperty(node.path, key)
        } catch (error) {
          logger.error('CNSNode.property error:', error)
          return null
        }
      },

      async properties(node) {
        try {
          const keys = await winccoa.cnsGetPropertyKeys(node.path)

          const properties = []
          for (const key of keys) {
            try {
              const value = await winccoa.cnsGetProperty(node.path, key)
              properties.push({
                key,
                value,
                type: 'STRING_VAR' // Default, could be enhanced
              })
            } catch (e) {
              logger.warn(`Failed to get property ${key}:`, e)
            }
          }

          return properties
        } catch (error) {
          logger.error('CNSNode.properties error:', error)
          return []
        }
      },

      async exists(node) {
        try {
          return await winccoa.cns_nodeExists(node.path)
        } catch (error) {
          return false
        }
      }
    }
  }
}

module.exports = { createCnsResolvers }
