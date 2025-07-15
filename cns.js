// CNS (Central Navigation Service) GraphQL resolver functions for WinCC OA

const { WinccoaCnsTreeNode } = require('winccoa-manager');

// Helper function to convert WinccoaCnsTreeNode input to WinCC OA object
function convertTreeNodeInput(treeNodeInput) {
  const node = new WinccoaCnsTreeNode(
    treeNodeInput.name,
    treeNodeInput.displayName,
    treeNodeInput.dp,
    treeNodeInput.children ? treeNodeInput.children.map(convertTreeNodeInput) : undefined
  );
  return node;
}

// Helper function to convert WinCC OA tree node to GraphQL output
function convertTreeNodeOutput(treeNode) {
  return {
    name: treeNode.name,
    displayName: treeNode.displayName,
    dp: treeNode.dp || '',
    children: treeNode.children ? treeNode.children.map(convertTreeNodeOutput) : []
  };
}

function createCnsResolvers(winccoa, logger) {
  return {
    Query: {
      // View Management Functions
      async cnsGetViews(_, { systemName }) {
        try {
          const result = await winccoa.cnsGetViews(systemName);
          return result;
        } catch (error) {
          logger.error('cnsGetViews error:', error);
          throw new Error(`Failed to get CNS views: ${error.message}`);
        }
      },

      async cnsGetTrees(_, { view }) {
        try {
          const result = await winccoa.cnsGetTrees(view);
          return result;
        } catch (error) {
          logger.error('cnsGetTrees error:', error);
          throw new Error(`Failed to get CNS trees: ${error.message}`);
        }
      },

      // Navigation Functions
      async cnsGetChildren(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetChildren(cnsPath);
          return result;
        } catch (error) {
          logger.error('cnsGetChildren error:', error);
          throw new Error(`Failed to get CNS children: ${error.message}`);
        }
      },

      async cnsGetParent(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetParent(cnsPath);
          return result;
        } catch (error) {
          logger.error('cnsGetParent error:', error);
          throw new Error(`Failed to get CNS parent: ${error.message}`);
        }
      },

      async cnsGetRoot(_, { cnsNodePath }) {
        try {
          const result = await winccoa.cnsGetRoot(cnsNodePath);
          return result;
        } catch (error) {
          logger.error('cnsGetRoot error:', error);
          throw new Error(`Failed to get CNS root: ${error.message}`);
        }
      },

      // Display and ID Functions
      async cnsGetDisplayNames(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetDisplayNames(cnsPath);
          return result;
        } catch (error) {
          logger.error('cnsGetDisplayNames error:', error);
          throw new Error(`Failed to get CNS display names: ${error.message}`);
        }
      },

      async cnsGetDisplayPath(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetDisplayPath(cnsPath);
          return result;
        } catch (error) {
          logger.error('cnsGetDisplayPath error:', error);
          throw new Error(`Failed to get CNS display path: ${error.message}`);
        }
      },

      async cnsGetId(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetId(cnsPath);
          return result || '';
        } catch (error) {
          logger.error('cnsGetId error:', error);
          throw new Error(`Failed to get CNS ID: ${error.message}`);
        }
      },

      // Search Functions
      async cnsGetIdSet(_, { pattern, viewPath, searchMode, langIdx, type }) {
        try {
          const result = await winccoa.cnsGetIdSet(pattern, viewPath, searchMode, langIdx, type);
          return result;
        } catch (error) {
          logger.error('cnsGetIdSet error:', error);
          throw new Error(`Failed to get CNS ID set: ${error.message}`);
        }
      },

      async cnsGetNodesByName(_, { pattern, viewPath, searchMode, langIdx, type }) {
        try {
          const result = await winccoa.cnsGetNodesByName(pattern, viewPath, searchMode, langIdx, type);
          return result;
        } catch (error) {
          logger.error('cnsGetNodesByName error:', error);
          throw new Error(`Failed to get CNS nodes by name: ${error.message}`);
        }
      },

      async cnsGetNodesByData(_, { dpName, type, viewPath }) {
        try {
          const result = await winccoa.cnsGetNodesByData(dpName, type, viewPath);
          return result;
        } catch (error) {
          logger.error('cnsGetNodesByData error:', error);
          throw new Error(`Failed to get CNS nodes by data: ${error.message}`);
        }
      },

      // Property Functions
      async cnsGetProperty(_, { cnsPath, key }) {
        try {
          const result = await winccoa.cnsGetProperty(cnsPath, key);
          return result;
        } catch (error) {
          logger.error('cnsGetProperty error:', error);
          throw new Error(`Failed to get CNS property: ${error.message}`);
        }
      },

      async cnsGetPropertyKeys(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetPropertyKeys(cnsPath);
          return result;
        } catch (error) {
          logger.error('cnsGetPropertyKeys error:', error);
          throw new Error(`Failed to get CNS property keys: ${error.message}`);
        }
      },

      // Utility Functions
      async cnsNodeExists(_, { path }) {
        try {
          const result = await winccoa.cns_nodeExists(path);
          return result;
        } catch (error) {
          logger.error('cnsNodeExists error:', error);
          throw new Error(`Failed to check if CNS node exists: ${error.message}`);
        }
      },

      async cnsTreeExists(_, { path }) {
        try {
          const result = await winccoa.cns_treeExists(path);
          return result;
        } catch (error) {
          logger.error('cnsTreeExists error:', error);
          throw new Error(`Failed to check if CNS tree exists: ${error.message}`);
        }
      },

      async cnsViewExists(_, { path }) {
        try {
          const result = await winccoa.cns_viewExists(path);
          return result;
        } catch (error) {
          logger.error('cnsViewExists error:', error);
          throw new Error(`Failed to check if CNS view exists: ${error.message}`);
        }
      },

      async cnsIsNode(_, { path }) {
        try {
          const result = await winccoa.cns_isNode(path);
          return result;
        } catch (error) {
          logger.error('cnsIsNode error:', error);
          throw new Error(`Failed to check if path is CNS node: ${error.message}`);
        }
      },

      async cnsIsTree(_, { path }) {
        try {
          const result = await winccoa.cns_isTree(path);
          return result;
        } catch (error) {
          logger.error('cnsIsTree error:', error);
          throw new Error(`Failed to check if path is CNS tree: ${error.message}`);
        }
      },

      async cnsIsView(_, { path }) {
        try {
          const result = await winccoa.cns_isView(path);
          return result;
        } catch (error) {
          logger.error('cnsIsView error:', error);
          throw new Error(`Failed to check if path is CNS view: ${error.message}`);
        }
      },

      async cnsCheckId(_, { id }) {
        try {
          const result = await winccoa.cns_checkId(id);
          return result;
        } catch (error) {
          logger.error('cnsCheckId error:', error);
          throw new Error(`Failed to check CNS ID: ${error.message}`);
        }
      },

      async cnsCheckName(_, { name }) {
        try {
          const result = await winccoa.cns_checkName(name);
          return result;
        } catch (error) {
          logger.error('cnsCheckName error:', error);
          throw new Error(`Failed to check CNS name: ${error.message}`);
        }
      },

      async cnsCheckSeparator(_, { separator }) {
        try {
          const result = await winccoa.cns_checkSeparator(separator);
          return result;
        } catch (error) {
          logger.error('cnsCheckSeparator error:', error);
          throw new Error(`Failed to check CNS separator: ${error.message}`);
        }
      }
    },

    Mutation: {
      // Creation Functions
      async cnsCreateView(_, { view, displayName, separator }) {
        try {
          const result = await winccoa.cnsCreateView(view, displayName, separator);
          return result;
        } catch (error) {
          logger.error('cnsCreateView error:', error);
          throw new Error(`Failed to create CNS view: ${error.message}`);
        }
      },

      async cnsAddTree(_, { cnsParentPath, tree }) {
        try {
          const winccoaTree = convertTreeNodeInput(tree);
          const result = await winccoa.cnsAddTree(cnsParentPath, winccoaTree);
          return result;
        } catch (error) {
          logger.error('cnsAddTree error:', error);
          throw new Error(`Failed to add CNS tree: ${error.message}`);
        }
      },

      async cnsAddNode(_, { cnsParentPath, name, displayName, dp }) {
        try {
          const result = await winccoa.cnsAddNode(cnsParentPath, name, displayName, dp);
          return result;
        } catch (error) {
          logger.error('cnsAddNode error:', error);
          throw new Error(`Failed to add CNS node: ${error.message}`);
        }
      },

      // Modification Functions
      async cnsChangeTree(_, { cnsPath, tree }) {
        try {
          const winccoaTree = convertTreeNodeInput(tree);
          const result = await winccoa.cnsChangeTree(cnsPath, winccoaTree);
          return result;
        } catch (error) {
          logger.error('cnsChangeTree error:', error);
          throw new Error(`Failed to change CNS tree: ${error.message}`);
        }
      },

      async cnsDeleteTree(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsDeleteTree(cnsPath);
          return result;
        } catch (error) {
          logger.error('cnsDeleteTree error:', error);
          throw new Error(`Failed to delete CNS tree: ${error.message}`);
        }
      },

      async cnsDeleteView(_, { view }) {
        try {
          const result = await winccoa.cnsDeleteView(view);
          return result;
        } catch (error) {
          logger.error('cnsDeleteView error:', error);
          throw new Error(`Failed to delete CNS view: ${error.message}`);
        }
      },

      // Property Functions
      async cnsSetProperty(_, { cnsPath, key, value, valueType }) {
        try {
          const result = await winccoa.cnsSetProperty(cnsPath, key, value, valueType);
          return result;
        } catch (error) {
          logger.error('cnsSetProperty error:', error);
          throw new Error(`Failed to set CNS property: ${error.message}`);
        }
      }
    }
  };
}

module.exports = {
  createCnsResolvers,
  convertTreeNodeInput,
  convertTreeNodeOutput
};