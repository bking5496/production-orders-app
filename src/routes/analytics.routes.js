// Analytics Routes - Comprehensive analytics and dashboard endpoints
const express = require('express');
const { query, validationResult } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const analyticsService = require('../services/analytics.service');

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics data
 */
router.get('/dashboard',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('environment').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const dashboardData = await analyticsService.getDashboardData(req.query);
    return res.success(dashboardData, 'Dashboard data retrieved successfully');
  })
);

/**
 * GET /api/analytics/summary
 * Get analytics summary with basic production metrics
 */
router.get('/summary',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const summary = await analyticsService.getAnalyticsSummary(req.query);
    return res.success({ summary }, 'Analytics summary retrieved successfully');
  })
);

/**
 * GET /api/analytics/downtime
 * Get downtime analytics by category
 */
router.get('/downtime',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const downtimeData = await analyticsService.getDowntimeAnalytics(req.query);
    return res.success(downtimeData, 'Downtime analytics retrieved successfully');
  })
);

/**
 * GET /api/analytics/stops
 * Get stops analytics (basic version)
 */
router.get('/stops',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('environment').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const stopsData = await analyticsService.getStopsAnalytics(req.query);
    return res.success(stopsData, 'Stops analytics retrieved successfully');
  })
);

/**
 * GET /api/analytics/machine-utilization
 * Get machine utilization analytics
 */
router.get('/machine-utilization',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('environment').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const utilization = await analyticsService.getMachineUtilization(req.query);
    return res.success(utilization, 'Machine utilization analytics retrieved successfully');
  })
);

/**
 * GET /api/analytics/trends
 * Get production trends over time
 */
router.get('/trends',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('environment').optional().isString(),
    query('interval').optional().isIn(['hour', 'day', 'week', 'month'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const trends = await analyticsService.getProductionTrends(req.query);
    return res.success(trends, 'Production trends retrieved successfully');
  })
);

/**
 * GET /api/analytics/floor-overview
 * Get production floor overview - main dashboard data
 */
router.get('/floor-overview',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const overview = await analyticsService.getProductionFloorOverview();
    return res.success(overview, 'Production floor overview retrieved successfully');
  })
);

/**
 * GET /api/analytics/production-status
 * Get production status summary
 */
router.get('/production-status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const status = await analyticsService.getProductionStatus();
    return res.success(status, 'Production status retrieved successfully');
  })
);

/**
 * GET /api/analytics/active-orders  
 * Get active production orders
 */
router.get('/active-orders',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const activeOrders = await analyticsService.getActiveOrders();
    return res.success(activeOrders, 'Active orders retrieved successfully');
  })
);

/**
 * GET /api/analytics/machines-overview
 * Get machines overview data
 */
router.get('/machines-overview',
  authenticateToken,
  [query('environment').optional().isString()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const machinesOverview = await analyticsService.getMachinesOverview(req.query.environment);
    return res.success(machinesOverview, 'Machines overview retrieved successfully');
  })
);

module.exports = router;