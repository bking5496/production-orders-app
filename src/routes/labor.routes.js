// Labor Routes
const express = require('express');
const { body, validationResult, query } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const laborService = require('../services/labor.service');

const router = express.Router();

/**
 * GET /api/labor/assignments
 * Get labor assignments with filtering
 */
router.get('/assignments',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('environment').optional().isString(),
    query('machine_id').optional().isInt(),
    query('employee_id').optional().isInt(),
    query('shift_type').optional().isIn(['day', 'night', 'afternoon'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const assignments = await laborService.getLaborAssignments(req.query);
    return res.success(assignments, 'Labor assignments retrieved successfully');
  })
);

/**
 * GET /api/labor/planner/machines
 * Get machines scheduled for labor planning by date
 */
router.get('/planner/machines',
  authenticateToken,
  [
    query('date').notEmpty().isISO8601().withMessage('Valid date is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { date } = req.query;
    const machines = await laborService.getMachinesForLaborPlanning(date);
    return res.success(machines, 'Machines for labor planning retrieved successfully');
  })
);

/**
 * GET /api/labor/roster
 * Get labour roster for a specific date
 */
router.get('/roster',
  authenticateToken,
  [
    query('date').optional().isISO8601()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const roster = await laborService.getLabourRoster(req.query.date);
    return res.success(roster, 'Labour roster retrieved successfully');
  })
);

/**
 * GET /api/labor/today
 * Get today's labour data
 */
router.get('/today',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const todayData = await laborService.getTodayLabourData();
    return res.success(todayData, 'Today\'s labour data retrieved successfully');
  })
);

/**
 * POST /api/labor/assignments
 * Create or update labor assignment
 */
router.post('/assignments',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
    body('machine_id').isInt({ min: 1 }).withMessage('Valid machine ID is required'),
    body('assignment_date').isISO8601().withMessage('Valid assignment date is required'),
    body('shift_type')
      .isIn(['day', 'night', 'afternoon'])
      .withMessage('Shift type must be one of: day, night, afternoon'),
    body('role')
      .isIn(['operator', 'hopper_loader', 'packer', 'supervisor'])
      .withMessage('Role must be one of: operator, hopper_loader, packer, supervisor'),
    body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('hourly_rate').optional().isFloat({ min: 0 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const assignment = await laborService.createOrUpdateLaborAssignment(req.body, req.user.id);
    
    const statusCode = assignment.action === 'created' ? 201 : 200;
    const message = assignment.action === 'created' 
      ? 'Labor assignment created successfully'
      : 'Labor assignment updated successfully';
    
    return res.status(statusCode).success(assignment, message);
  })
);

/**
 * DELETE /api/labor/assignments/:id
 * Delete labor assignment
 */
router.delete('/assignments/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  asyncHandler(async (req, res) => {
    await laborService.deleteLaborAssignment(req.params.id);
    return res.success(null, 'Labor assignment deleted successfully');
  })
);

/**
 * POST /api/labor/assignments/copy-week
 * Copy previous week's assignments
 */
router.post('/assignments/copy-week',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('source_week').isISO8601().withMessage('Valid source week date is required'),
    body('target_week').isISO8601().withMessage('Valid target week date is required'),
    body('environment').notEmpty().isString().withMessage('Environment is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const result = await laborService.copyWeekAssignments(req.body, req.user.id);
    return res.success(result, result.message);
  })
);

/**
 * POST /api/labor/assignments/finalize-week
 * Finalize week assignments (lock them)
 */
router.post('/assignments/finalize-week',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('week').isISO8601().withMessage('Valid week date is required'),
    body('environment').notEmpty().isString().withMessage('Environment is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const result = await laborService.finalizeWeekAssignments(req.body);
    return res.success(result, result.message);
  })
);

/**
 * POST /api/labor/assignments/auto-populate-daily
 * Auto-populate daily assignments based on yesterday's assignments
 */
router.post('/assignments/auto-populate-daily',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('date').isISO8601().withMessage('Valid date is required'),
    body('environment').notEmpty().isString().withMessage('Environment is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const result = await laborService.autoPopulateDailyAssignments(req.body);
    return res.success(result, result.message);
  })
);

/**
 * POST /api/labor/assignments/lock-daily
 * Lock daily assignments (finalize the daily schedule)
 */
router.post('/assignments/lock-daily',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('date').isISO8601().withMessage('Valid date is required'),
    body('environment').notEmpty().isString().withMessage('Environment is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const result = await laborService.lockDailyAssignments(req.body);
    return res.success(result, result.message);
  })
);

module.exports = router;