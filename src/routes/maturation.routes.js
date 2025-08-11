// Maturation Room Routes
const express = require('express');
const { body, param, validationResult } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const maturationService = require('../services/maturation.service');
const { ResponseUtils, addResponseUtils } = require('../utils/response');

const router = express.Router();

// Middleware setup
router.use(addResponseUtils);

/**
 * GET /api/maturation
 * Get all maturation room records
 */
router.get('/', 
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    
    let records;
    if (status) {
      records = await maturationService.getMaturationRecordsByStatus(status);
    } else {
      records = await maturationService.getAllMaturationRecords();
    }
    
    return res.success(records, 'Maturation records retrieved successfully');
  })
);

/**
 * GET /api/maturation/stats
 * Get maturation room statistics
 */
router.get('/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const stats = await maturationService.getMaturationStatistics();
    return res.success(stats, 'Maturation statistics retrieved successfully');
  })
);

/**
 * GET /api/maturation/:id
 * Get specific maturation record
 */
router.get('/:id',
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid maturation record ID')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }
    
    const record = await maturationService.getMaturationRecordById(req.params.id);
    return res.success(record, 'Maturation record retrieved successfully');
  })
);

/**
 * POST /api/maturation
 * Add new maturation room record
 */
router.post('/',
  authenticateToken,
  requireRole(['supervisor', 'admin']),
  [
    body('production_order_id').isInt({ min: 1 }).withMessage('Valid production order ID is required'),
    body('maturation_date').isISO8601().withMessage('Valid maturation date is required'),
    body('expected_maturation_days').isInt({ min: 1 }).withMessage('Expected maturation days must be a positive integer'),
    body('quantity_produced').optional().isInt({ min: 0 }).withMessage('Quantity produced must be non-negative'),
    body('quantity_expected').optional().isInt({ min: 0 }).withMessage('Quantity expected must be non-negative'),
    body('temperature').optional().isFloat().withMessage('Temperature must be a number'),
    body('humidity').optional().isFloat().withMessage('Humidity must be a number'),
    body('ph_level').optional().isFloat({ min: 0, max: 14 }).withMessage('pH level must be between 0 and 14'),
    body('notes').optional().isString().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }
    
    const newRecord = await maturationService.addMaturationRecord(req.body, req.user.id);
    
    // Broadcast update via WebSocket
    req.broadcast('maturation_room_added', newRecord, 'production');
    
    return res.success(newRecord, 'Order added to maturation room successfully', 201);
  })
);

/**
 * PUT /api/maturation/:id
 * Update maturation room record
 */
router.put('/:id',
  authenticateToken,
  requireRole(['supervisor', 'admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid maturation record ID'),
    body('quantity_produced').optional().isInt({ min: 0 }).withMessage('Quantity produced must be non-negative'),
    body('quantity_expected').optional().isInt({ min: 0 }).withMessage('Quantity expected must be non-negative'),
    body('temperature').optional().isFloat().withMessage('Temperature must be a number'),
    body('humidity').optional().isFloat().withMessage('Humidity must be a number'),
    body('ph_level').optional().isFloat({ min: 0, max: 14 }).withMessage('pH level must be between 0 and 14'),
    body('notes').optional().isString().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
    body('status').optional().isIn(['maturing', 'quality_check', 'completed', 'rejected']).withMessage('Invalid status')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }
    
    const updatedRecord = await maturationService.updateMaturationRecord(
      req.params.id, 
      req.body, 
      req.user.id
    );
    
    // Broadcast update via WebSocket
    req.broadcast('maturation_room_updated', updatedRecord, 'production');
    
    return res.success(updatedRecord, 'Maturation record updated successfully');
  })
);

/**
 * POST /api/maturation/:id/complete
 * Complete maturation process (quality check)
 */
router.post('/:id/complete',
  authenticateToken,
  requireRole(['supervisor', 'admin', 'quality_control']),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid maturation record ID'),
    body('quantity_produced').isInt({ min: 0 }).withMessage('Final quantity produced is required'),
    body('quality_notes').optional().isString().trim().isLength({ max: 1000 }).withMessage('Quality notes must be less than 1000 characters'),
    body('quality_rating').optional().isInt({ min: 1, max: 5 }).withMessage('Quality rating must be between 1 and 5')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }
    
    const completedRecord = await maturationService.completeMaturation(
      req.params.id, 
      req.body, 
      req.user.id
    );
    
    // Broadcast completion via WebSocket
    req.broadcast('maturation_room_completed', completedRecord, 'production');
    
    return res.success(completedRecord, 'Maturation process completed successfully');
  })
);

/**
 * DELETE /api/maturation/:id
 * Delete maturation room record (soft delete by setting status)
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid maturation record ID')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }
    
    const deletedRecord = await maturationService.updateMaturationRecord(
      req.params.id, 
      { status: 'deleted', deleted_at: new Date() }, 
      req.user.id
    );
    
    // Broadcast deletion via WebSocket
    req.broadcast('maturation_room_deleted', { id: req.params.id }, 'production');
    
    return res.success(deletedRecord, 'Maturation record deleted successfully');
  })
);

module.exports = router;