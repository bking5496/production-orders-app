// Orders Routes
const express = require('express');
const multer = require('multer');
const { body, validationResult, query } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const ordersService = require('../services/orders.service');
const DatabaseUtils = require('../utils/database');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv|xlsx|xls/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

/**
 * GET /api/orders
 * Get all orders with optional filtering
 */
router.get('/',
  authenticateToken,
  [
    query('environment').optional().isString(),
    query('status').optional().isString(),
    query('machine_id').optional().isInt(),
    query('include_archived').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const orders = await ordersService.getAllOrders(req.query);
    return res.success(orders, 'Orders retrieved successfully');
  })
);

/**
 * GET /api/orders/archived
 * Get archived orders (admin/supervisor only)
 */
router.get('/archived',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  asyncHandler(async (req, res) => {
    const orders = await ordersService.getArchivedOrders(req.query);
    return res.success(orders, 'Archived orders retrieved successfully');
  })
);

/**
 * GET /api/orders/active
 * Get currently active orders
 */
router.get('/active',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { environment } = req.query;
    const activeOrders = await ordersService.getActiveOrders(environment);
    return res.success(activeOrders, 'Active orders retrieved successfully');
  })
);

/**
 * GET /api/orders/stats
 * Get order statistics
 */
router.get('/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { environment } = req.query;
    const stats = await ordersService.getOrderStats(environment);
    return res.success(stats, 'Order statistics retrieved successfully');
  })
);

/**
 * GET /api/orders/:id
 * Get single order by ID
 */
router.get('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const order = await ordersService.getOrderById(req.params.id);
    return res.success(order, 'Order retrieved successfully');
  })
);

/**
 * GET /api/orders/:id/enhanced
 * Get order with enhanced details (materials, setup, quality checks)
 */
router.get('/:id/enhanced',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const orderId = req.params.id;
    
    // Get basic order info
    const order = await ordersService.getOrderById(orderId);
    
    // Get additional details
    const [materials, setupProgress, qualityChecks, workflowProgress] = await Promise.all([
      DatabaseUtils.select('material_allocations', { order_id: orderId }),
      DatabaseUtils.select('setup_progress', { order_id: orderId }),
      DatabaseUtils.select('quality_results', { order_id: orderId }),
      DatabaseUtils.select('workflow_progress', { order_id: orderId })
    ]);

    const enhancedOrder = {
      ...order,
      materials,
      setup_progress: setupProgress,
      quality_checks: qualityChecks,
      workflow_progress: workflowProgress
    };

    return res.success(enhancedOrder, 'Enhanced order details retrieved successfully');
  })
);

/**
 * GET /api/orders/:id/downtime
 * Get downtime history for an order
 */
router.get('/:id/downtime',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const downtimeHistory = await DatabaseUtils.raw(`
      SELECT 
        ps.id,
        ps.start_time,
        ps.end_time,
        ps.duration,
        ps.reason,
        ps.category,
        ps.subcategory,
        ps.notes,
        ps.cost_impact,
        ps.production_loss,
        ps.supervisor_notified,
        ps.created_at,
        ps.resolved_at,
        ps.resolved_by,
        u.username as resolved_by_name
      FROM production_stops ps
      LEFT JOIN users u ON ps.resolved_by = u.id
      WHERE ps.order_id = $1
      ORDER BY ps.start_time DESC
    `, [id]);

    return res.success(downtimeHistory.rows, 'Order downtime history retrieved successfully');
  })
);

/**
 * POST /api/orders
 * Create new order
 */
router.post('/',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('order_number').notEmpty().trim(),
    body('product_name').notEmpty().trim(),
    body('quantity').isInt({ min: 1 }),
    body('due_date').optional().isISO8601(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('environment').optional().isString(),
    body('machine_id').optional().isInt(),
    body('customer_info').optional().isObject(),
    body('specifications').optional().isObject(),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const newOrder = await ordersService.createOrder(req.body, req.user.id);
    
    // Broadcast order creation
    req.broadcast('order_created', {
      id: newOrder.id,
      order_number: newOrder.order_number,
      product_name: newOrder.product_name,
      status: newOrder.status,
      environment: newOrder.environment
    }, 'production');
    
    return res.created(newOrder, 'Order created successfully');
  })
);

/**
 * PUT /api/orders/:id
 * Update existing order
 */
router.put('/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('order_number').optional().notEmpty().trim(),
    body('product_name').optional().notEmpty().trim(),
    body('quantity').optional().isInt({ min: 1 }),
    body('due_date').optional().isISO8601(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('machine_id').optional().isInt(),
    body('customer_info').optional().isObject(),
    body('specifications').optional().isObject(),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const updatedOrder = await ordersService.updateOrder(req.params.id, req.body, req.user.id);
    return res.success(updatedOrder, 'Order updated successfully');
  })
);

/**
 * DELETE /api/orders/:id
 * Delete (archive) order
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  asyncHandler(async (req, res) => {
    await ordersService.deleteOrder(req.params.id, req.user.id);
    return res.success(null, 'Order archived successfully');
  })
);

/**
 * POST /api/orders/:id/start
 * Start order production
 */
router.post('/:id/start',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  [
    body('machine_id').isInt({ min: 1 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { machine_id } = req.body;
    const startedOrder = await ordersService.startOrder(req.params.id, machine_id, req.user.id);
    
    // Broadcast order start
    req.broadcast('order_started', {
      id: startedOrder.id,
      order_number: startedOrder.order_number,
      status: startedOrder.status,
      start_time: startedOrder.start_time
    }, 'production');
    
    return res.success(startedOrder, 'Order started successfully');
  })
);

/**
 * POST /api/orders/:id/pause
 * Pause order production
 */
router.post('/:id/pause',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  [
    body('reason').notEmpty().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { reason } = req.body;
    const pausedOrder = await ordersService.pauseOrder(req.params.id, reason, req.user.id);
    
    // Broadcast order pause
    req.broadcast('order_paused', {
      id: pausedOrder.id,
      order_number: pausedOrder.order_number,
      status: pausedOrder.status,
      reason: reason
    }, 'production');
    
    return res.success(pausedOrder, 'Order paused successfully');
  })
);

/**
 * POST /api/orders/:id/stop
 * Stop order production
 */
router.post('/:id/stop',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('reason').notEmpty().trim(),
    body('notes').optional().trim(),
    body('category').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const stoppedOrder = await ordersService.stopOrder(req.params.id, req.body, req.user.id);
    
    // Broadcast order stop
    req.broadcast('order_stopped', {
      id: stoppedOrder.id,
      order_number: stoppedOrder.order_number,
      status: stoppedOrder.status,
      stop_reason: stoppedOrder.stop_reason
    }, 'production');
    
    return res.success(stoppedOrder, 'Order stopped successfully');
  })
);

/**
 * POST /api/orders/:id/resume
 * Resume paused order
 */
router.post('/:id/resume',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  asyncHandler(async (req, res) => {
    const resumedOrder = await ordersService.resumeOrder(req.params.id, req.user.id);
    
    // Broadcast order resume
    req.broadcast('order_resumed', {
      id: resumedOrder.id,
      order_number: resumedOrder.order_number,
      status: resumedOrder.status
    }, 'production');
    
    return res.success(resumedOrder, 'Order resumed successfully');
  })
);

/**
 * POST /api/orders/:id/complete
 * Complete order production
 */
router.post('/:id/complete',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  [
    body('actual_quantity').optional().isInt({ min: 0 }),
    body('waste_quantity').optional().isInt({ min: 0 }),
    body('quality_notes').optional().isString(),
    body('completion_notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const completedOrder = await ordersService.completeOrder(req.params.id, req.body, req.user.id);
    
    // Broadcast order completion
    req.broadcast('order_completed', {
      id: completedOrder.id,
      order_number: completedOrder.order_number,
      status: completedOrder.status,
      actual_quantity: completedOrder.actual_quantity,
      stop_time: completedOrder.stop_time
    }, 'production');
    
    return res.success(completedOrder, 'Order completed successfully');
  })
);

/**
 * POST /api/orders/upload
 * Bulk upload orders from CSV/Excel
 */
router.post('/upload',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.validationError([], 'File is required');
    }

    // TODO: Implement file parsing and bulk order creation
    // This would parse the uploaded CSV/Excel file and create multiple orders
    
    return res.success({ 
      message: 'File upload received',
      filename: req.file.originalname,
      size: req.file.size
    }, 'Orders upload completed');
  })
);

/**
 * POST /api/orders/:id/workflow/:stage
 * Update workflow stage
 */
router.post('/:id/workflow/:stage',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  [
    body('status').isIn(['pending', 'in_progress', 'completed', 'skipped']),
    body('notes').optional().isString(),
    body('data').optional().isObject()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { id, stage } = req.params;
    const { status, notes, data } = req.body;

    // Update or insert workflow progress
    const existingProgress = await DatabaseUtils.findOne('workflow_progress', {
      order_id: id,
      stage
    });

    if (existingProgress) {
      await DatabaseUtils.update('workflow_progress', {
        status,
        notes,
        data: JSON.stringify(data || {}),
        updated_at: new Date(),
        updated_by: req.user.id
      }, { id: existingProgress.id });
    } else {
      await DatabaseUtils.insert('workflow_progress', {
        order_id: id,
        stage,
        status,
        notes,
        data: JSON.stringify(data || {}),
        created_at: new Date(),
        created_by: req.user.id
      });
    }

    return res.success(null, `Workflow stage ${stage} updated successfully`);
  })
);

module.exports = router;