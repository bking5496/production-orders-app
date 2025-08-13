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
    body('machine_id').custom((value, { req }) => {
      // Allow null for factory-wide roles (supervisor, forklift_driver)
      if (value === null && ['supervisor', 'forklift_driver'].includes(req.body.role)) {
        return true;
      }
      // Allow integers for regular machines
      if (Number.isInteger(parseInt(value)) && parseInt(value) > 0) {
        return true;
      }
      throw new Error('Valid machine ID is required (integer > 0) or null for factory-wide roles');
    }),
    body('assignment_date').isISO8601().withMessage('Valid assignment date is required'),
    body('shift_type')
      .isIn(['day', 'night', 'afternoon'])
      .withMessage('Shift type must be one of: day, night, afternoon'),
    body('role')
      .isIn(['operator', 'hopper_loader', 'packer', 'supervisor', 'forklift_driver'])
      .withMessage('Role must be one of: operator, hopper_loader, packer, supervisor, forklift_driver'),
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

/**
 * GET /api/labor/attendance-register
 * Get attendance data for a specific date, machine, and shift
 */
router.get('/attendance-register',
  authenticateToken,
  [
    query('date').optional().isISO8601(),
    query('shift').notEmpty().isIn(['day', 'night', 'afternoon']).withMessage('Valid shift is required'),
    query('machine_id').optional().isInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const attendanceData = await laborService.getAttendanceRegister(req.query);
    return res.success(attendanceData, 'Attendance register data retrieved successfully');
  })
);

/**
 * POST /api/labor/attendance-register
 * Mark or update attendance
 */
router.post('/attendance-register',
  authenticateToken,
  requireRole(['supervisor', 'admin']),
  [
    body('date').isISO8601().withMessage('Valid date is required'),
    body('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
    body('machine_id').custom((value, { req }) => {
      // Allow null for factory-wide roles or require integer for machine-specific roles
      if (value === null) {
        return true; // Allow null machine_id for factory-wide assignments
      }
      if (Number.isInteger(parseInt(value)) && parseInt(value) > 0) {
        return true;
      }
      throw new Error('Valid machine ID is required (integer > 0) or null for factory-wide assignments');
    }),
    body('shift_type').isIn(['day', 'night', 'afternoon']).withMessage('Valid shift type is required'),
    body('status').isIn(['present', 'absent', 'late']).withMessage('Valid status is required'),
    body('check_in_time').optional({ nullable: true }).matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
    body('notes').optional().isString(),
    body('marked_by').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Valid marked_by user ID is required')
  ],
  asyncHandler(async (req, res) => {
    // Log request data for debugging
    console.log('🔍 ATTENDANCE POST DEBUG:');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User:', req.user?.username);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
      return res.validationError(errors.array());
    }

    const attendanceRecord = await laborService.markAttendance(req.body, req.user.id);
    
    // Broadcast attendance update via WebSocket
    if (req.broadcast) {
      req.broadcast('attendance_marked', {
        attendanceRecord,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'labor');
    }
    
    return res.success(attendanceRecord, 'Attendance marked successfully');
  })
);

// British spelling aliases
router.get('/roster', 
  authenticateToken,
  [query('date').optional().isISO8601()],
  asyncHandler(async (req, res) => {
    const roster = await laborService.getLabourRoster(req.query.date);
    return res.success(roster, 'Labour roster retrieved successfully');
  })
);

router.get('/today',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const todayData = await laborService.getTodayLabourData();
    return res.success(todayData, 'Today\'s labour data retrieved successfully');
  })
);

module.exports = router;