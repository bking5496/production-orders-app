// Maturation Room Routes
const express = require('express');
const { body, validationResult, query } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const DatabaseUtils = require('../utils/database');

const router = express.Router();

/**
 * GET /api/maturation-room
 * Get all maturation room data
 */
router.get('/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const query = `
      SELECT 
        mr.*,
        po.order_number,
        po.product_name,
        u.username as confirmed_by_name,
        qc_user.username as quality_checked_by_name,
        -- Calculate variance percentage
        CASE 
          WHEN mr.quantity_expected > 0 THEN 
            ROUND(((mr.quantity_produced - mr.quantity_expected) / mr.quantity_expected * 100)::numeric, 2)
          ELSE 0 
        END as variance_percentage,
        -- Calculate estimated completion date
        (mr.maturation_date + INTERVAL '1 day' * mr.expected_maturation_days) as estimated_completion_date
      FROM maturation_room mr
      LEFT JOIN production_orders po ON mr.production_order_id = po.id
      LEFT JOIN users u ON mr.confirmed_by = u.id
      LEFT JOIN users qc_user ON mr.quality_checked_by = qc_user.id
      ORDER BY mr.maturation_date DESC, mr.id DESC
    `;
    
    const result = await DatabaseUtils.raw(query);
    return res.success(result.rows, 'Maturation room data retrieved successfully');
  })
);

/**
 * POST /api/maturation-room
 * Add blend to maturation room
 */
router.post('/',
  authenticateToken,
  requireRole(['supervisor', 'admin']),
  [
    body('production_order_id').isInt({ min: 1 }).withMessage('Valid production order ID is required'),
    body('blend_name').notEmpty().withMessage('Blend name is required'),
    body('batch_number').notEmpty().withMessage('Batch number is required'),
    body('quantity_produced').isFloat({ min: 0 }).withMessage('Valid quantity produced is required'),
    body('quantity_expected').isFloat({ min: 0 }).withMessage('Valid quantity expected is required'),
    body('unit_of_measurement').notEmpty().withMessage('Unit of measurement is required'),
    body('maturation_date').isISO8601().withMessage('Valid maturation date is required'),
    body('expected_maturation_days').isInt({ min: 1 }).withMessage('Expected maturation days must be at least 1'),
    body('storage_location').notEmpty().withMessage('Storage location is required'),
    body('temperature').optional().isFloat(),
    body('humidity').optional().isFloat(),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const {
      production_order_id, blend_name, batch_number, quantity_produced, quantity_expected,
      unit_of_measurement, maturation_date, expected_maturation_days, storage_location,
      temperature, humidity, notes
    } = req.body;

    const maturationRecord = {
      production_order_id,
      blend_name,
      batch_number,
      quantity_produced,
      quantity_expected,
      unit_of_measurement,
      maturation_date,
      expected_maturation_days,
      storage_location,
      temperature: temperature || null,
      humidity: humidity || null,
      notes: notes || '',
      status: 'maturing',
      confirmed_by: req.user.id,
      created_at: new Date()
    };

    const result = await DatabaseUtils.insert('maturation_room', maturationRecord, '*');
    
    // Broadcast update via WebSocket
    if (req.broadcast) {
      req.broadcast('maturation_added', {
        record: result,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'maturation');
    }

    return res.success(result, 'Blend added to maturation room successfully', 201);
  })
);

/**
 * PUT /api/maturation-room/:id/status
 * Update maturation room status
 */
router.put('/:id/status',
  authenticateToken,
  requireRole(['supervisor', 'admin']),
  [
    body('status').isIn(['maturing', 'ready', 'completed', 'quality_check', 'rejected']).withMessage('Valid status is required'),
    body('quality_checked').optional().isBoolean(),
    body('quality_check_date').optional().isISO8601(),
    body('quality_checked_by').optional().isInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { id } = req.params;
    const { status, quality_checked, quality_check_date, quality_checked_by } = req.body;

    const updateData = {
      status,
      updated_at: new Date()
    };

    if (quality_checked !== undefined) updateData.quality_checked = quality_checked;
    if (quality_check_date) updateData.quality_check_date = quality_check_date;
    if (quality_checked_by) updateData.quality_checked_by = quality_checked_by;

    const result = await DatabaseUtils.update('maturation_room', { id }, updateData, '*');
    
    if (!result) {
      return res.notFound('Maturation record not found');
    }

    // Broadcast update via WebSocket
    if (req.broadcast) {
      req.broadcast('maturation_status_updated', {
        record: result,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'maturation');
    }

    return res.success(result, 'Maturation status updated successfully');
  })
);

/**
 * POST /api/maturation-room/daily-check
 * Add daily check for maturation
 */
router.post('/daily-check',
  authenticateToken,
  requireRole(['supervisor', 'admin', 'operator']),
  [
    body('maturation_room_id').isInt({ min: 1 }).withMessage('Valid maturation room ID is required'),
    body('check_date').isISO8601().withMessage('Valid check date is required'),
    body('temperature').optional().isFloat(),
    body('humidity').optional().isFloat(),
    body('visual_condition').isIn(['Excellent', 'Good', 'Fair', 'Poor', 'Concerning']).withMessage('Valid visual condition is required'),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { maturation_room_id, check_date, temperature, humidity, visual_condition, notes } = req.body;

    const dailyCheck = {
      maturation_room_id,
      check_date,
      temperature: temperature || null,
      humidity: humidity || null,
      visual_condition,
      notes: notes || '',
      checked_by: req.user.id,
      created_at: new Date()
    };

    const result = await DatabaseUtils.insert('maturation_daily_checks', dailyCheck, '*');

    // Broadcast update via WebSocket
    if (req.broadcast) {
      req.broadcast('maturation_check_added', {
        check: result,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'maturation');
    }

    return res.success(result, 'Daily check added successfully', 201);
  })
);

/**
 * GET /api/maturation-room/:id/daily-checks
 * Get daily checks for a specific maturation record
 */
router.get('/:id/daily-checks',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const query = `
      SELECT 
        mdc.*,
        u.username as checked_by_name
      FROM maturation_daily_checks mdc
      LEFT JOIN users u ON mdc.checked_by = u.id
      WHERE mdc.maturation_room_id = $1
      ORDER BY mdc.check_date DESC
    `;
    
    const result = await DatabaseUtils.raw(query, [id]);
    return res.success(result.rows, 'Daily checks retrieved successfully');
  })
);

module.exports = router;