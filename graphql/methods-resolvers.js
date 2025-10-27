// API type resolvers - Backward compatibility layer
// Delegates to existing V1 resolvers, grouped by category

function createMethodsResolvers(existingResolvers) {
  return {
    API: {
      alert: () => ({}),
      cns: () => ({}),
      dataPoint: () => ({}),
      dataPointType: () => ({}),
      system: () => ({}),
      redundancy: () => ({})
    },

    AlertMethods: {
      alertGet: existingResolvers.Query.alertGet,
      alertGetPeriod: existingResolvers.Query.alertGetPeriod
    },

    CnsMethods: {
      getViews: existingResolvers.Query.getViews,
      getTrees: existingResolvers.Query.getTrees,
      getChildren: existingResolvers.Query.getChildren,
      getParent: existingResolvers.Query.getParent,
      getRoot: existingResolvers.Query.getRoot,
      getDisplayNames: existingResolvers.Query.getDisplayNames,
      getDisplayPath: existingResolvers.Query.getDisplayPath,
      getId: existingResolvers.Query.getId,
      getIdSet: existingResolvers.Query.getIdSet,
      getNodesByName: existingResolvers.Query.getNodesByName,
      getNodesByData: existingResolvers.Query.getNodesByData,
      getProperty: existingResolvers.Query.getProperty,
      getPropertyKeys: existingResolvers.Query.getPropertyKeys,
      nodeExists: existingResolvers.Query.nodeExists,
      treeExists: existingResolvers.Query.treeExists,
      viewExists: existingResolvers.Query.viewExists,
      isNode: existingResolvers.Query.isNode,
      isTree: existingResolvers.Query.isTree,
      isView: existingResolvers.Query.isView,
      checkId: existingResolvers.Query.checkId,
      checkName: existingResolvers.Query.checkName,
      checkSeparator: existingResolvers.Query.checkSeparator
    },

    DataPointMethods: {
      dpGet: existingResolvers.Query.dpGet,
      dpNames: existingResolvers.Query.dpNames,
      dpTypes: existingResolvers.Query.dpTypes,
      dpGetMaxAge: existingResolvers.Query.dpGetMaxAge,
      dpElementType: existingResolvers.Query.dpElementType,
      dpAttributeType: existingResolvers.Query.dpAttributeType,
      dpTypeName: existingResolvers.Query.dpTypeName,
      dpTypeRefName: existingResolvers.Query.dpTypeRefName,
      dpExists: existingResolvers.Query.dpExists,
      dpGetPeriod: existingResolvers.Query.dpGetPeriod,
      dpQuery: existingResolvers.Query.dpQuery
    },

    DataPointTypeMethods: {
      dpTypeGet: existingResolvers.Query.dpTypeGet,
      dpGetDpTypeRefs: existingResolvers.Query.dpGetDpTypeRefs,
      dpGetRefsToDpType: existingResolvers.Query.dpGetRefsToDpType
    },

    SystemMethods: {
      getSystemId: existingResolvers.Query.getSystemId,
      getSystemName: existingResolvers.Query.getSystemName,
      getVersionInfo: existingResolvers.Query.getVersionInfo
    },

    RedundancyMethods: {
      isReduActive: existingResolvers.Query.isReduActive,
      isRedundant: existingResolvers.Query.isRedundant
    }
  }
}

module.exports = { createMethodsResolvers }
