// Data point type routes for REST API
const express = require('express')

module.exports = function(winccoa, logger, resolvers, requireAdmin) {
  const router = express.Router()

  /**
   * GET /restapi/datapoint-types
   * List all data point types
   *
   * Query params:
   *   pattern: string (optional) - Pattern to filter types
   *   systemId: number (optional) - System ID
   *   includeEmpty: boolean (optional) - Include types without existing data points
   *
   * Response: { dpTypes: string[] }
   */
  router.get('/', async (req, res, next) => {
    try {
      const { pattern, systemId, includeEmpty } = req.query
      const result = await resolvers.Query.dpTypes(
        null,
        {
          pattern,
          systemId: systemId ? parseInt(systemId) : undefined,
          includeEmpty: includeEmpty === 'true' || includeEmpty === undefined
        }
      )
      res.json({ dpTypes: result })
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /restapi/datapoint-types
   * Create a new data point type
   *
   * Body:
   * {
   *   "startNode": {
   *     "name": "string",
   *     "type": "ElementType",
   *     "refName": "string" (optional),
   *     "children": [...] (optional),
   *     "newName": "string" (optional)
   *   }
   * }
   *
   * Response: { success: boolean }
   */
  router.post('/', requireAdmin, async (req, res, next) => {
    try {
      const { startNode } = req.body

      if (!startNode) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'startNode is required'
        })
      }

      const result = await resolvers.DataPointTypeMutation.dpTypeCreate(
        null,
        { startNode }
      )

      res.json({ success: result })
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /restapi/datapoint-types/:dpt/structure
   * Get structure of a data point type
   *
   * URL params:
   *   dpt: string - Name of the data point type (URL encoded)
   *
   * Query params:
   *   includeSubTypes: boolean (optional) - Include subtypes in structure
   *
   * Response: { structure: DpTypeNode }
   */
  router.get('/:dpt/structure', async (req, res, next) => {
    try {
      const dpt = decodeURIComponent(req.params.dpt)
      const { includeSubTypes } = req.query

      const result = await resolvers.DataPointTypeMutation.dpTypeGet(
        null,
        {
          dpt,
          includeSubTypes: includeSubTypes === 'true'
        }
      )

      res.json({ structure: result })
    } catch (error) {
      next(error)
    }
  })

  /**
   * PUT /restapi/datapoint-types/:dpt
   * Change an existing data point type
   *
   * URL params:
   *   dpt: string - Name of the data point type (URL encoded)
   *
   * Body:
   * {
   *   "startNode": {
   *     "name": "string",
   *     "type": "ElementType",
   *     "refName": "string" (optional),
   *     "children": [...] (optional),
   *     "newName": "string" (optional)
   *   }
   * }
   *
   * Response: { success: boolean }
   */
  router.put('/:dpt', requireAdmin, async (req, res, next) => {
    try {
      const { startNode } = req.body

      if (!startNode) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'startNode is required'
        })
      }

      const result = await resolvers.DataPointTypeMutation.dpTypeChange(
        null,
        { startNode }
      )

      res.json({ success: result })
    } catch (error) {
      next(error)
    }
  })

  /**
   * DELETE /restapi/datapoint-types/:dpt
   * Delete a data point type
   *
   * URL params:
   *   dpt: string - Name of the data point type to delete (URL encoded)
   *
   * Response: { success: boolean }
   */
  router.delete('/:dpt', requireAdmin, async (req, res, next) => {
    try {
      const dpt = decodeURIComponent(req.params.dpt)
      const result = await resolvers.DataPointTypeMutation.dpTypeDelete(
        null,
        { dpt }
      )
      res.json({ success: result })
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /restapi/datapoint-types/:dpt/references
   * Get references to other DPTs in a DPT
   *
   * URL params:
   *   dpt: string - Name of the data point type (URL encoded)
   *
   * Response: { dptNames: string[], dpePaths: string[] }
   */
  router.get('/:dpt/references', async (req, res, next) => {
    try {
      const dpt = decodeURIComponent(req.params.dpt)
      const result = await resolvers.DataPointTypeMutation.dpGetDpTypeRefs(
        null,
        { dpt }
      )
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /restapi/datapoint-types/:reference/usages
   * Get all DPTs and DPs that contain a specific DPT as a reference
   *
   * URL params:
   *   reference: string - Name of the DPT reference (URL encoded)
   *
   * Response: { dptNames: string[], dpePaths: string[] }
   */
  router.get('/:reference/usages', async (req, res, next) => {
    try {
      const reference = decodeURIComponent(req.params.reference)
      const result = await resolvers.DataPointTypeMutation.dpGetRefsToDpType(
        null,
        { reference }
      )
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  return router
}
