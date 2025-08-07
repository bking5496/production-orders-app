// Users Routes
const express = require('express');
const { body, validationResult, query } = require('express-validator');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const usersService = require('../services/users.service');

const router = express.Router();

/**
 * GET /api/users
 * Get all users with optional filtering
 */
router.get('/',
  authenticateToken,
  [
    query('role').optional().isString(),
    query('include_inactive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const users = await usersService.getAllUsers(req.query);
    return res.success(users, 'Users retrieved successfully');
  })
);

/**
 * GET /api/users/stats
 * Get user statistics by role
 */
router.get('/stats',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  asyncHandler(async (req, res) => {
    const stats = await usersService.getUserStats();
    return res.success(stats, 'User statistics retrieved successfully');
  })
);

/**
 * GET /api/users/search
 * Search users by name, username, or employee code
 */
router.get('/search',
  authenticateToken,
  [
    query('q').notEmpty().isLength({ min: 2 }).withMessage('Search term must be at least 2 characters'),
    query('role').optional().isString(),
    query('include_inactive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const { q: searchTerm, ...filters } = req.query;
    const users = await usersService.searchUsers(searchTerm, filters);
    return res.success(users, 'Search results retrieved successfully');
  })
);

/**
 * GET /api/users/by-role/:role
 * Get users by specific role (for dropdowns and selections)
 */
router.get('/by-role/:role',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { role } = req.params;
    const users = await usersService.getUsersByRole(role);
    return res.success(users, `${role} users retrieved successfully`);
  })
);

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get('/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(req.params.id);
    return res.success(user, 'User retrieved successfully');
  })
);

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/',
  authenticateToken,
  requireRole(['admin']),
  [
    body('username')
      .isLength({ min: 3 })
      .trim()
      .withMessage('Username must be at least 3 characters long'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('role')
      .isIn(['admin', 'supervisor', 'operator', 'viewer'])
      .withMessage('Role must be one of: admin, supervisor, operator, viewer'),
    body('full_name').optional().trim().isLength({ max: 100 }),
    body('employee_code').optional().trim().isLength({ max: 20 }),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('profile_data').optional().isObject()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const newUser = await usersService.createUser(req.body, req.user.id);
    
    // Broadcast user creation via WebSocket if available
    if (req.app.get('broadcast')) {
      req.app.get('broadcast')('user_created', {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      });
    }
    
    return res.created(newUser, 'User created successfully');
  })
);

/**
 * PUT /api/users/:id
 * Update existing user (admin only)
 */
router.put('/:id',
  authenticateToken,
  requireRole(['admin']),
  [
    body('username').optional().isLength({ min: 3 }).trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'supervisor', 'operator', 'viewer']),
    body('full_name').optional().trim().isLength({ max: 100 }),
    body('employee_code').optional().trim().isLength({ max: 20 }),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('profile_data').optional().isObject(),
    body('is_active').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }

    const updatedUser = await usersService.updateUser(req.params.id, req.body, req.user.id);
    
    // Broadcast user update via WebSocket if available
    if (req.app.get('broadcast')) {
      req.app.get('broadcast')('user_updated', {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        is_active: updatedUser.is_active
      });
    }
    
    return res.success(updatedUser, 'User updated successfully');
  })
);

/**
 * POST /api/users/:id/deactivate
 * Deactivate user (soft delete)
 */
router.post('/:id/deactivate',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const deactivatedUser = await usersService.deactivateUser(req.params.id, req.user.id);
    
    // Broadcast user deactivation via WebSocket if available
    if (req.app.get('broadcast')) {
      req.app.get('broadcast')('user_deactivated', {
        id: deactivatedUser.id,
        username: deactivatedUser.username,
        role: deactivatedUser.role
      });
    }
    
    return res.success(deactivatedUser, 'User deactivated successfully');
  })
);

/**
 * POST /api/users/:id/reactivate
 * Reactivate user
 */
router.post('/:id/reactivate',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const reactivatedUser = await usersService.reactivateUser(req.params.id, req.user.id);
    
    // Broadcast user reactivation via WebSocket if available
    if (req.app.get('broadcast')) {
      req.app.get('broadcast')('user_reactivated', {
        id: reactivatedUser.id,
        username: reactivatedUser.username,
        role: reactivatedUser.role
      });
    }
    
    return res.success(reactivatedUser, 'User reactivated successfully');
  })
);

/**
 * DELETE /api/users/:id
 * Hard delete user (admin only, use with extreme caution)
 * This is typically not recommended - use deactivate instead
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    // For safety, we'll just deactivate instead of hard delete
    const deactivatedUser = await usersService.deactivateUser(req.params.id, req.user.id);
    
    // Broadcast user deletion via WebSocket if available
    if (req.app.get('broadcast')) {
      req.app.get('broadcast')('user_deleted', {
        id: deactivatedUser.id,
        username: deactivatedUser.username,
        role: deactivatedUser.role
      });
    }
    
    return res.success(null, 'User removed successfully');
  })
);

module.exports = router;