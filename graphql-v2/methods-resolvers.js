// Methods type resolvers - Backward compatibility layer
// Delegates to existing V1 resolvers, grouped by category

function createMethodsResolvers(existingResolvers) {
  return {
    Methods: {
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
      cnsGetViews: existingResolvers.Query.cnsGetViews,
      cnsGetTrees: existingResolvers.Query.cnsGetTrees,
      cnsGetChildren: existingResolvers.Query.cnsGetChildren,
      cnsGetParent: existingResolvers.Query.cnsGetParent,
      cnsGetRoot: existingResolvers.Query.cnsGetRoot,
      cnsGetDisplayNames: existingResolvers.Query.cnsGetDisplayNames,
      cnsGetDisplayPath: existingResolvers.Query.cnsGetDisplayPath,
      cnsGetId: existingResolvers.Query.cnsGetId,
      cnsGetIdSet: existingResolvers.Query.cnsGetIdSet,
      cnsGetNodesByName: existingResolvers.Query.cnsGetNodesByName,
      cnsGetNodesByData: existingResolvers.Query.cnsGetNodesByData,
      cnsGetProperty: existingResolvers.Query.cnsGetProperty,
      cnsGetPropertyKeys: existingResolvers.Query.cnsGetPropertyKeys,
      cnsNodeExists: existingResolvers.Query.cnsNodeExists,
      cnsTreeExists: existingResolvers.Query.cnsTreeExists,
      cnsViewExists: existingResolvers.Query.cnsViewExists,
      cnsIsNode: existingResolvers.Query.cnsIsNode,
      cnsIsTree: existingResolvers.Query.cnsIsTree,
      cnsIsView: existingResolvers.Query.cnsIsView,
      cnsCheckId: existingResolvers.Query.cnsCheckId,
      cnsCheckName: existingResolvers.Query.cnsCheckName,
      cnsCheckSeparator: existingResolvers.Query.cnsCheckSeparator
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
