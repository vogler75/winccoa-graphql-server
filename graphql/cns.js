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
      async getViews(_, { systemName }) {
        try {
          const result = await winccoa.cnsGetViews(systemName);
          return result;
        } catch (error) {
          logger.error('getViews error:', error);
          throw new Error(`Failed to get CNS views: ${error.message}`);
        }
      },

      async getTrees(_, { view }) {
        try {
          const result = await winccoa.cnsGetTrees(view);
          return result;
        } catch (error) {
          logger.error('getTrees error:', error);
          throw new Error(`Failed to get CNS trees: ${error.message}`);
        }
      },

      // Navigation Functions
      async getChildren(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetChildren(cnsPath);
          return result;
        } catch (error) {
          logger.error('getChildren error:', error);
          throw new Error(`Failed to get CNS children: ${error.message}`);
        }
      },

      async getParent(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetParent(cnsPath);
          return result;
        } catch (error) {
          logger.error('getParent error:', error);
          throw new Error(`Failed to get CNS parent: ${error.message}`);
        }
      },

      async getRoot(_, { cnsNodePath }) {
        try {
          const result = await winccoa.cnsGetRoot(cnsNodePath);
          return result;
        } catch (error) {
          logger.error('getRoot error:', error);
          throw new Error(`Failed to get CNS root: ${error.message}`);
        }
      },

      // Display and ID Functions
      async getDisplayNames(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetDisplayNames(cnsPath);
          return result;
        } catch (error) {
          logger.error('getDisplayNames error:', error);
          throw new Error(`Failed to get CNS display names: ${error.message}`);
        }
      },

      async getDisplayPath(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetDisplayPath(cnsPath);
          return result;
        } catch (error) {
          logger.error('getDisplayPath error:', error);
          throw new Error(`Failed to get CNS display path: ${error.message}`);
        }
      },

      async getId(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetId(cnsPath);
          return result || '';
        } catch (error) {
          logger.error('getId error:', error);
          throw new Error(`Failed to get CNS ID: ${error.message}`);
        }
      },

      // Search Functions
      async getIdSet(_, { pattern, viewPath, searchMode, langIdx, type }) {
        try {
          const result = await winccoa.cnsGetIdSet(pattern, viewPath, searchMode, langIdx, type);
          return result;
        } catch (error) {
          logger.error('getIdSet error:', error);
          throw new Error(`Failed to get CNS ID set: ${error.message}`);
        }
      },

      async getNodesByName(_, { pattern, viewPath, searchMode, langIdx, type }) {
        try {
          const result = await winccoa.cnsGetNodesByName(pattern, viewPath, searchMode, langIdx, type);
          return result;
        } catch (error) {
          logger.error('getNodesByName error:', error);
          throw new Error(`Failed to get CNS nodes by name: ${error.message}`);
        }
      },

      async getNodesByData(_, { dpName, type, viewPath }) {
        try {
          const result = await winccoa.cnsGetNodesByData(dpName, type, viewPath);
          return result;
        } catch (error) {
          logger.error('getNodesByData error:', error);
          throw new Error(`Failed to get CNS nodes by data: ${error.message}`);
        }
      },

      // Property Functions
      async getProperty(_, { cnsPath, key }) {
        try {
          const result = await winccoa.cnsGetProperty(cnsPath, key);
          return result;
        } catch (error) {
          logger.error('getProperty error:', error);
          throw new Error(`Failed to get CNS property: ${error.message}`);
        }
      },

      async getPropertyKeys(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsGetPropertyKeys(cnsPath);
          return result;
        } catch (error) {
          logger.error('getPropertyKeys error:', error);
          throw new Error(`Failed to get CNS property keys: ${error.message}`);
        }
      },

      // Utility Functions
      async nodeExists(_, { path }) {
        try {
          const result = await winccoa.cns_nodeExists(path);
          return result;
        } catch (error) {
          logger.error('nodeExists error:', error);
          throw new Error(`Failed to check if CNS node exists: ${error.message}`);
        }
      },

      async treeExists(_, { path }) {
        try {
          const result = await winccoa.cns_treeExists(path);
          return result;
        } catch (error) {
          logger.error('treeExists error:', error);
          throw new Error(`Failed to check if CNS tree exists: ${error.message}`);
        }
      },

      async viewExists(_, { path }) {
        try {
          const result = await winccoa.cns_viewExists(path);
          return result;
        } catch (error) {
          logger.error('viewExists error:', error);
          throw new Error(`Failed to check if CNS view exists: ${error.message}`);
        }
      },

      async isNode(_, { path }) {
        try {
          const result = await winccoa.cns_isNode(path);
          return result;
        } catch (error) {
          logger.error('isNode error:', error);
          throw new Error(`Failed to check if path is CNS node: ${error.message}`);
        }
      },

      async isTree(_, { path }) {
        try {
          const result = await winccoa.cns_isTree(path);
          return result;
        } catch (error) {
          logger.error('isTree error:', error);
          throw new Error(`Failed to check if path is CNS tree: ${error.message}`);
        }
      },

      async isView(_, { path }) {
        try {
          const result = await winccoa.cns_isView(path);
          return result;
        } catch (error) {
          logger.error('isView error:', error);
          throw new Error(`Failed to check if path is CNS view: ${error.message}`);
        }
      },

      async checkId(_, { id }) {
        try {
          const result = await winccoa.cns_checkId(id);
          return result;
        } catch (error) {
          logger.error('checkId error:', error);
          throw new Error(`Failed to check CNS ID: ${error.message}`);
        }
      },

      async checkName(_, { name }) {
        try {
          const result = await winccoa.cns_checkName(name);
          return result;
        } catch (error) {
          logger.error('checkName error:', error);
          throw new Error(`Failed to check CNS name: ${error.message}`);
        }
      },

      async checkSeparator(_, { separator }) {
        try {
          const result = await winccoa.cns_checkSeparator(separator);
          return result;
        } catch (error) {
          logger.error('checkSeparator error:', error);
          throw new Error(`Failed to check CNS separator: ${error.message}`);
        }
      }
    },

    Mutation: {
      // Creation Functions
      async createView(_, { view, displayName, separator }) {
        try {
          const result = await winccoa.cnsCreateView(view, displayName, separator);
          return result;
        } catch (error) {
          logger.error('createView error:', error);
          throw new Error(`Failed to create CNS view: ${error.message}`);
        }
      },

      async addTree(_, { cnsParentPath, tree }) {
        try {
          const winccoaTree = convertTreeNodeInput(tree);
          const result = await winccoa.cnsAddTree(cnsParentPath, winccoaTree);
          return result;
        } catch (error) {
          logger.error('addTree error:', error);
          throw new Error(`Failed to add CNS tree: ${error.message}`);
        }
      },

      async addNode(_, { cnsParentPath, name, displayName, dp }) {
        try {
          const result = await winccoa.cnsAddNode(cnsParentPath, name, displayName, dp);
          return result;
        } catch (error) {
          logger.error('addNode error:', error);
          throw new Error(`Failed to add CNS node: ${error.message}`);
        }
      },

      // Modification Functions
      async changeTree(_, { cnsPath, tree }) {
        try {
          const winccoaTree = convertTreeNodeInput(tree);
          const result = await winccoa.cnsChangeTree(cnsPath, winccoaTree);
          return result;
        } catch (error) {
          logger.error('changeTree error:', error);
          throw new Error(`Failed to change CNS tree: ${error.message}`);
        }
      },

      async deleteTree(_, { cnsPath }) {
        try {
          const result = await winccoa.cnsDeleteTree(cnsPath);
          return result;
        } catch (error) {
          logger.error('deleteTree error:', error);
          throw new Error(`Failed to delete CNS tree: ${error.message}`);
        }
      },

      async deleteView(_, { view }) {
        try {
          const result = await winccoa.cnsDeleteView(view);
          return result;
        } catch (error) {
          logger.error('deleteView error:', error);
          throw new Error(`Failed to delete CNS view: ${error.message}`);
        }
      },

      // Property Functions
      async setProperty(_, { cnsPath, key, value, valueType }) {
        try {
          const result = await winccoa.cnsSetProperty(cnsPath, key, value, valueType);
          return result;
        } catch (error) {
          logger.error('setProperty error:', error);
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