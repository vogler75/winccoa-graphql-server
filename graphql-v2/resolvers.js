// GraphQL V2 Resolvers - Main resolver combiner

const { createQueryResolvers } = require('./query-resolvers')
const { createSystemResolvers } = require('./system-resolvers')
const { createDataPointResolvers } = require('./datapoint-resolvers')
const { createTagResolvers } = require('./tag-resolvers')
const { createAlertResolvers } = require('./alert-resolvers')
const { createCnsResolvers } = require('./cns-resolvers')
const { createMethodsResolvers } = require('./methods-resolvers')

function createV2Resolvers(winccoa, logger, existingResolvers) {
  const queryResolvers = createQueryResolvers(winccoa, logger, existingResolvers)
  const systemResolvers = createSystemResolvers(winccoa, logger)
  const dataPointResolvers = createDataPointResolvers(winccoa, logger)
  const tagResolvers = createTagResolvers(winccoa, logger, existingResolvers)
  const alertResolvers = createAlertResolvers(winccoa, logger)
  const cnsResolvers = createCnsResolvers(winccoa, logger)
  const methodsResolvers = createMethodsResolvers(existingResolvers)

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

    // Mutations - keep all existing mutations from V1
    Mutation: existingResolvers.Mutation,

    // Subscriptions - keep all existing subscriptions from V1
    Subscription: existingResolvers.Subscription
  }
}

module.exports = { createV2Resolvers }
