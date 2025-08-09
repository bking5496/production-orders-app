// Reports Routes
const express = require('express');
const { query, validationResult } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const reportsService = require('../services/reports.service');

const router = express.Router();

/**
 * GET /api/reports/downtime
 * Get comprehensive downtime report with analytics
 */
router.get('/downtime',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('machine_id').optional().isInt(),
    query('category').optional().isString(),
    query('format').optional().isIn(['json', 'csv'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { format = 'json', ...filters } = req.query;

    if (format === 'csv') {
      const csvData = await reportsService.exportDowntimeReport(filters, 'csv');
      res.setHeader('Content-Type', csvData.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${csvData.filename}"`);
      return res.send(csvData.data);
    }

    const report = await reportsService.getDowntimeReport(filters);
    return res.success(report, 'Downtime report retrieved successfully');
  })
);

/**
 * GET /api/reports/waste
 * Get production waste report
 */
router.get('/waste',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('machine_id').optional().isInt(),
    query('category').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const wasteReport = await reportsService.getWasteReport(req.query);
    return res.success(wasteReport, 'Waste report retrieved successfully');
  })
);

/**
 * GET /api/reports/production-summary
 * Get production summary report
 */
router.get('/production-summary',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
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

    const report = await reportsService.getProductionSummaryReport(req.query);
    return res.success(report, 'Production summary report retrieved successfully');
  })
);

/**
 * GET /api/reports/quality
 * Get quality report with yield and waste metrics
 */
router.get('/quality',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
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

    const report = await reportsService.getQualityReport(req.query);
    return res.success(report, 'Quality report retrieved successfully');
  })
);

/**
 * GET /api/reports/efficiency
 * Get efficiency report with completion rates and cycle times
 */
router.get('/efficiency',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
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

    const report = await reportsService.getEfficiencyReport(req.query);
    return res.success(report, 'Efficiency report retrieved successfully');
  })
);

module.exports = router;