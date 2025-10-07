// Mutation resolvers - Namespaced by domain

function createMutationResolvers(existingResolvers) {
  return {
    // Top-level mutation resolvers return namespace objects
    dp() {
      return {} // DataPointMutations resolvers will handle fields
    },

    dpType() {
      return {} // DataPointTypeMutations resolvers will handle fields
    },

    alert() {
      return {} // AlertMutations resolvers will handle fields
    },

    cns() {
      return {} // CnsMutations resolvers will handle fields
    },

    opcua() {
      return {} // OpcUaMutations resolvers will handle fields
    },

    // Login stays at top level
    login: existingResolvers.Mutation.login
  }
}

// DataPoint mutation namespace resolvers
function createDataPointMutationResolvers(existingResolvers) {
  return {
    create: existingResolvers.Mutation.dpCreate,
    delete: existingResolvers.Mutation.dpDelete,
    copy: existingResolvers.Mutation.dpCopy,
    set: existingResolvers.Mutation.dpSet,
    setWait: existingResolvers.Mutation.dpSetWait,
    setTimed: existingResolvers.Mutation.dpSetTimed,
    setTimedWait: existingResolvers.Mutation.dpSetTimedWait
  }
}

// DataPointType mutation namespace resolvers
function createDataPointTypeMutationResolvers(existingResolvers) {
  return {
    create: existingResolvers.Mutation.dpTypeCreate,
    change: existingResolvers.Mutation.dpTypeChange,
    delete: existingResolvers.Mutation.dpTypeDelete
  }
}

// Alert mutation namespace resolvers
function createAlertMutationResolvers(existingResolvers) {
  return {
    set: existingResolvers.Mutation.alertSet,
    setWait: existingResolvers.Mutation.alertSetWait,
    setTimed: existingResolvers.Mutation.alertSetTimed,
    setTimedWait: existingResolvers.Mutation.alertSetTimedWait
  }
}

// CNS mutation namespace resolvers
function createCnsMutationResolvers(existingResolvers) {
  return {
    createView: existingResolvers.Mutation.cnsCreateView,
    addTree: existingResolvers.Mutation.cnsAddTree,
    addNode: existingResolvers.Mutation.cnsAddNode,
    changeTree: existingResolvers.Mutation.cnsChangeTree,
    deleteTree: existingResolvers.Mutation.cnsDeleteTree,
    deleteView: existingResolvers.Mutation.cnsDeleteView,
    setProperty: existingResolvers.Mutation.cnsSetProperty
  }
}

// OPC UA mutation namespace resolvers
function createOpcUaMutationResolvers(existingResolvers) {
  return {
    setAddress: existingResolvers.Mutation.setOpcUaAddress
  }
}

module.exports = {
  createMutationResolvers,
  createDataPointMutationResolvers,
  createDataPointTypeMutationResolvers,
  createAlertMutationResolvers,
  createCnsMutationResolvers,
  createOpcUaMutationResolvers
}
