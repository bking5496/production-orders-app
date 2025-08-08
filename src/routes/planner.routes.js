// Planner Routes - Legacy labor planner endpoint compatibility
const express = require('express');
const { body, validationResult, query } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const laborService = require('../services/labor.service');

const router = express.Router();

/**
 * GET /api/planner/assignments
 * Get labor assignments - legacy compatibility
 */
router.get('/assignments',
  authenticateToken,
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('date').optional().isISO8601(),
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
 * GET /api/planner/machines
 * Get machines for labor planning
 */
router.get('/machines',
  authenticateToken,
  [
    query('date').optional().isISO8601()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const machines = await laborService.getMachinesForLaborPlanning(req.query.date);
    return res.success(machines, 'Machines for labor planning retrieved successfully');
  })
);

/**
 * GET /api/planner/employees  
 * Get employees for labor planning
 */
router.get('/employees',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const employees = await laborService.getEmployeesForPlanning();
    return res.success(employees, 'Employees for labor planning retrieved successfully');
  })
);

/**
 * GET /api/planner/supervisors
 * Get supervisors for planning
 */
router.get('/supervisors',
  authenticateToken,
  [
    query('date').optional().isISO8601(),
    query('shift').optional().isIn(['day', 'night', 'afternoon'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const supervisors = await laborService.getSupervisors(req.query);
    return res.success(supervisors, 'Supervisors retrieved successfully');
  })
);

/**
 * POST /api/planner/assignments
 * Create labor assignment - legacy compatibility
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
 * POST /api/planner/supervisors
 * Create supervisor assignment
 */
router.post('/supervisors',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('user_id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('shift').isIn(['day', 'night', 'afternoon']).withMessage('Valid shift is required'),
    body('environment').notEmpty().isString().withMessage('Environment is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const supervisor = await laborService.addSupervisor(req.body, req.user.id);
    return res.success(supervisor, 'Supervisor assigned successfully', 201);
  })
);

/**
 * DELETE /api/planner/assignments/:id
 * Delete labor assignment - legacy compatibility
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
 * DELETE /api/planner/supervisors/:id
 * Delete supervisor assignment
 */
router.delete('/supervisors/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  asyncHandler(async (req, res) => {
    await laborService.deleteSupervisor(req.params.id);
    return res.success(null, 'Supervisor assignment deleted successfully');
  })
);

/**
 * PATCH /api/planner/assignments/:id
 * Update assignment status
 */
router.patch('/assignments/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('status').isIn(['active', 'completed', 'cancelled']).withMessage('Valid status is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const assignment = await laborService.updateAssignmentStatus(req.params.id, req.body.status, req.user.id);
    return res.success(assignment, 'Assignment status updated successfully');
  })
);

module.exports = router;