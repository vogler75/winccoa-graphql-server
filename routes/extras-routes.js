// Extras routes for REST API
const express = require('express')

module.exports = function(winccoa, logger, resolvers, requireAdmin) {
  const router = express.Router()

  /**
   * POST /restapi/extras/opcua/address
   * Set OPC UA address configuration for a data point
   *
   * Body:
   * {
   *   "datapointName": "string",
   *   "driverNumber": number,
   *   "addressDirection": number,
   *   "addressDataType": number,
   *   "serverName": "string",
   *   "subscriptionName": "string",
   *   "nodeId": "string"
   * }
   *
   * Response: { success: boolean }
   */
  router.post('/opcua/address', requireAdmin, async (req, res, next) => {
    try {
      const {
        datapointName,
        driverNumber,
        addressDirection,
        addressDataType,
        serverName,
        subscriptionName,
        nodeId
      } = req.body

      if (!datapointName || driverNumber === undefined || addressDirection === undefined ||
          addressDataType === undefined || !serverName || !subscriptionName || !nodeId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'All parameters are required: datapointName, driverNumber, addressDirection, addressDataType, serverName, subscriptionName, nodeId'
        })
      }

      const result = await resolvers.Mutation.setOpcUaAddress(
        null,
        {
          datapointName,
          driverNumber,
          addressDirection,
          addressDataType,
          serverName,
          subscriptionName,
          nodeId
        }
      )

      res.json({ success: result })
    } catch (error) {
      next(error)
    }
  })

  return router
}
