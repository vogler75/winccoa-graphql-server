// GraphQL V2 Resolvers - Main resolver combiner

const { createQueryResolvers } = require('./query-resolvers')
const { createSystemResolvers } = require('./system-resolvers')
const { createDataPointResolvers } = require('./datapoint-resolvers')
const { createTagResolvers } = require('./tag-resolvers')
const { createAlertResolvers } = require('./alert-resolvers')
const { createCnsResolvers } = require('./cns-resolvers')
const { createMethodsResolvers } = require('./methods-resolvers')
const {
  createMutationResolvers,
  createDataPointMutationResolvers,
  createDataPointTypeMutationResolvers,
  createAlertMutationResolvers,
  createCnsMutationResolvers,
  createOpcUaMutationResolvers
} = require('./mutation-resolvers')

function createV2Resolvers(winccoa, logger, existingResolvers) {
  const queryResolvers = createQueryResolvers(winccoa, logger, existingResolvers)
  const systemResolvers = createSystemResolvers(winccoa, logger)
  const dataPointResolvers = createDataPointResolvers(winccoa, logger)
  const tagResolvers = createTagResolvers(winccoa, logger, existingResolvers)
  const alertResolvers = createAlertResolvers(winccoa, logger)
  const cnsResolvers = createCnsResolvers(winccoa, logger)
  const methodsResolvers = createMethodsResolvers(existingResolvers)

  // Mutation namespaces
  const mutationResolvers = createMutationResolvers(existingResolvers)
  const dataPointMutations = createDataPointMutationResolvers(existingResolvers)
  const dataPointTypeMutations = createDataPointTypeMutationResolvers(existingResolvers)
  const alertMutations = createAlertMutationResolvers(existingResolvers)
  const cnsMutations = createCnsMutationResolvers(existingResolvers)
  const opcuaMutations = createOpcUaMutationResolvers(existingResolvers)

  return {
    Query: queryResolvers,
    System: systemResolvers,
    ...dataPointResolvers,
    Tag: tagResolvers,
    Alert: alertResolvers,
    ...cnsResolvers,
    Methods: methodsResolvers,

    // MethodTag - keep existing resolver
    MethodTag: existingResolvers.Tag,

    // Version info types
    VersionInfo: {
      api(info) {
        return info.api
      },
      winccoa(info) {
        return info.winccoa
      }
    },

    // Mutations - namespaced by domain
    Mutation: mutationResolvers,
    DataPointMutations: dataPointMutations,
    DataPointTypeMutations: dataPointTypeMutations,
    AlertMutations: alertMutations,
    CnsMutations: cnsMutations,
    OpcUaMutations: opcuaMutations,

    // Subscriptions - keep all existing subscriptions from V1
    Subscription: existingResolvers.Subscription
  }
}

module.exports = { createV2Resolvers }
