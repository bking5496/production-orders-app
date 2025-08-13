// Machines Routes
const express = require('express');
const { body, validationResult, query } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const machinesService = require('../services/machines.service');

const router = express.Router();

/**
 * GET /api/machines
 * Get all machines with optional filtering
 */
router.get('/',
  authenticateToken,
  [
    query('environment').optional().isString(),
    query('status').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const machines = await machinesService.getAllMachines(req.query);
    return res.success(machines, 'Machines retrieved successfully');
  })
);

/**
 * GET /api/machines/stats
 * Get machine statistics grouped by environment
 */
router.get('/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const stats = await machinesService.getMachineStats();
    return res.success(stats, 'Machine statistics retrieved successfully');
  })
);

/**
 * GET /api/machines/status
 * Get machine status overview
 */
router.get('/status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const machines = await machinesService.getMachineStatusOverview();
    return res.success(machines, 'Machine status overview retrieved successfully');
  })
);

/**
 * GET /api/machines/shift-cycles
 * Get machines with 2-2-2 shift cycles enabled
 */
router.get('/shift-cycles',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const machines = await machinesService.getMachinesWithShiftCycles();
    return res.success(machines, 'Shift cycle machines retrieved successfully');
  })
);

/**
 * GET /api/machines/daily-active
 * Get machines with active orders for a specific date and environment
 */
router.get('/daily-active',
  authenticateToken,
  [
    query('date').notEmpty().isISO8601().withMessage('Valid date is required'),
    query('environment').notEmpty().isString().withMessage('Environment is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { date, environment } = req.query;
    const machines = await machinesService.getDailyActiveMachines(date, environment);
    return res.success(machines, 'Daily active machines retrieved successfully');
  })
);

/**
 * GET /api/machines/:id
 * Get single machine by ID
 */
router.get('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const machine = await machinesService.getMachineById(req.params.id);
    return res.success(machine, 'Machine retrieved successfully');
  })
);

/**
 * POST /api/machines
 * Create new machine
 */
router.post('/',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('name').notEmpty().trim().withMessage('Machine name is required'),
    body('type').notEmpty().trim().withMessage('Machine type is required'),
    body('environment')
      .isIn(['blending', 'packaging', 'beverage'])
      .withMessage('Environment must be one of: blending, packaging, beverage'),
    body('capacity').optional().isInt({ min: 1, max: 200 }).withMessage('Capacity must be between 1 and 200')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const newMachine = await machinesService.createMachine(req.body, req.user.id);
    return res.created(newMachine, 'Machine created successfully');
  })
);

/**
 * PUT /api/machines/:id
 * Update existing machine
 */
router.put('/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('name').optional().notEmpty().trim().withMessage('Machine name cannot be empty'),
    body('type').optional().notEmpty().trim().withMessage('Machine type cannot be empty'),
    body('capacity').optional().isInt({ min: 1, max: 200 }).withMessage('Capacity must be between 1 and 200')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const updatedMachine = await machinesService.updateMachine(req.params.id, req.body, req.user.id);
    
    // Broadcast machine update via WebSocket if available
    if (req.app.get('broadcast')) {
      req.app.get('broadcast')('machine_updated', updatedMachine);
    }
    
    return res.success(updatedMachine, 'Machine updated successfully');
  })
);

/**
 * PATCH /api/machines/:id/status
 * Update machine status only
 */
router.patch('/:id/status',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  [
    body('status')
      .isIn(['available', 'maintenance', 'offline'])
      .withMessage('Status must be one of: available, maintenance, offline')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { status } = req.body;
    const updatedMachine = await machinesService.updateMachineStatus(req.params.id, status, req.user.id);
    
    // Broadcast machine status update via WebSocket if available
    if (req.app.get('broadcast')) {
      req.app.get('broadcast')('machine_status_updated', updatedMachine);
    }
    
    return res.success(updatedMachine, 'Machine status updated successfully');
  })
);

/**
 * GET /api/machines/:id/crews
 * Get crew assignments for a machine
 */
router.get('/:id/crews',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const crews = await machinesService.getMachineCrews(req.params.id);
    return res.success(crews, 'Machine crews retrieved successfully');
  })
);

/**
 * POST /api/machines/:id/crews
 * Save crew assignments for a machine
 */
router.post('/:id/crews',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [body('crews').isArray().withMessage('Crews must be an array')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const result = await machinesService.saveMachineCrews(req.params.id, req.body.crews || req.body, req.user.id);
    return res.success(result, 'Machine crews saved successfully');
  })
);

/**
 * DELETE /api/machines/:id
 * Delete machine (only if no production history)
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    await machinesService.deleteMachine(req.params.id, req.user.id);
    return res.success(null, 'Machine deleted successfully');
  })
);

/**
 * POST /api/machines/sync-statuses
 * Synchronize machine statuses using database function
 */
router.post('/sync-statuses',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  asyncHandler(async (req, res) => {
    const result = await machinesService.syncMachineStatuses();
    return res.success(result, result.message);
  })
);

module.exports = router;