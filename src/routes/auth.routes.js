// Authentication Routes
const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const { authenticateToken, generateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const DatabaseUtils = require('../utils/database');
const { ResponseUtils } = require('../utils/response');

const router = express.Router();

// Security logging utility - simplified for now
const securityLogger = {
  logAuthFailure: (username, ip, reason, userAgent) => {
    console.warn(`🔒 Auth failure: ${username} from ${ip} - ${reason} - ${userAgent}`);
  },
  logAuthSuccess: (username, ip, userAgent) => {
    console.log(`✅ Auth success: ${username} from ${ip} - ${userAgent}`);
  }
};

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many login attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    success: false,
    error: 'Too many registration attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
});

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post('/login',
  loginLimiter,
  [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('password').isLength({ min: 6 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logAuthFailure(req.body.username || 'unknown', req.ip, 'Invalid input', req.get('User-Agent'));
      return ResponseUtils.validationError(res, errors.array(), 'Invalid input data');
    }

    const { username, password } = req.body;

    // Find user
    const user = await DatabaseUtils.findOne('users', { username, is_active: true });
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      securityLogger.logAuthFailure(username, req.ip, 'Invalid credentials', req.get('User-Agent'));
      return ResponseUtils.unauthorized(res, 'Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update last login
    await DatabaseUtils.update('users', { last_login: new Date() }, { id: user.id });

    // Log successful authentication
    securityLogger.logAuthSuccess(username, req.ip, req.get('User-Agent'));

    return ResponseUtils.success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        employee_code: user.employee_code
      }
    }, 'Login successful');
  })
);

/**
 * POST /api/auth/register
 * User registration endpoint
 */
router.post('/register',
  registerLimiter,
  [
    body('username').trim().isLength({ min: 3, max: 50 }).escape(),
    body('password').isLength({ min: 6 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('full_name').optional().trim().isLength({ max: 100 }).escape(),
    body('employee_code').optional().trim().isLength({ max: 20 }).escape()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtils.validationError(res, errors.array(), 'Invalid input data');
    }

    const { username, password, email, full_name, employee_code } = req.body;

    // Check if user already exists
    const existingUser = await DatabaseUtils.findOne('users', { username });
    if (existingUser) {
      return ResponseUtils.error(res, 'Username already exists', 409);
    }

    if (email) {
      const existingEmail = await DatabaseUtils.findOne('users', { email });
      if (existingEmail) {
        return ResponseUtils.error(res, 'Email already exists', 409);
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await DatabaseUtils.insert('users', {
      username,
      password_hash,
      email: email || null,
      full_name: full_name || null,
      employee_code: employee_code || null,
      role: 'operator', // Default role
      is_active: true,
      created_at: new Date()
    });

    // Generate token
    const token = generateToken(newUser);

    return ResponseUtils.created(res, {
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        full_name: newUser.full_name,
        employee_code: newUser.employee_code
      }
    }, 'Registration successful');
  })
);

/**
 * POST /api/auth/verify
 * Verify JWT token
 */
router.post('/verify',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // Fetch fresh user data
    const user = await DatabaseUtils.findOne('users', { id: req.user.id, is_active: true });
    
    if (!user) {
      return ResponseUtils.unauthorized(res, 'User not found or inactive');
    }

    return ResponseUtils.success(res, {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        employee_code: user.employee_code
      }
    }, 'Token valid');
  })
);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // Generate new token
    const token = generateToken(req.user);
    
    return ResponseUtils.success(res, { token }, 'Token refreshed');
  })
);

/**
 * POST /api/auth/logout
 * User logout (client-side token removal)
 */
router.post('/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // In a more sophisticated setup, you would blacklist the token
    // For now, we just acknowledge the logout
    console.log(`📤 User ${req.user.username} logged out`);
    
    return ResponseUtils.success(res, null, 'Logout successful');
  })
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword').isLength({ min: 6 }),
    body('newPassword').isLength({ min: 6 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtils.validationError(res, errors.array(), 'Invalid input data');
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user
    const user = await DatabaseUtils.findOne('users', { id: req.user.id });
    
    // Verify current password
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      return ResponseUtils.unauthorized(res, 'Current password is incorrect');
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 12);

    // Update password
    await DatabaseUtils.update('users', { password_hash }, { id: req.user.id });

    console.log(`🔐 Password changed for user: ${req.user.username}`);
    
    return ResponseUtils.success(res, null, 'Password changed successfully');
  })
);

/**
 * GET /api/auth/verify-session
 * Verify session and return user data (alternative to POST verify)
 */
router.get('/verify-session',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // Fetch fresh user data
    const user = await DatabaseUtils.findOne('users', { id: req.user.id, is_active: true });
    
    if (!user) {
      return ResponseUtils.unauthorized(res, 'User not found or inactive');
    }

    return ResponseUtils.success(res, {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        employee_code: user.employee_code
      }
    }, 'Session verified');
  })
);

/**
 * GET /api/auth/session-status
 * Check session status and token expiration
 */
router.get('/session-status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    try {
      // Extract token expiration from JWT payload
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return ResponseUtils.unauthorized(res, 'No token provided');
      }
      
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return ResponseUtils.unauthorized(res, 'Invalid token');
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeRemaining = (decoded.exp - currentTime) * 1000; // Convert to milliseconds
      
      if (timeRemaining <= 0) {
        return ResponseUtils.unauthorized(res, 'Token expired');
      }
      
      return ResponseUtils.success(res, {
        timeRemaining: timeRemaining,
        expiresAt: decoded.exp * 1000,
        user: req.user
      }, 'Session status retrieved');
    } catch (error) {
      console.error('Session status error:', error);
      return ResponseUtils.error(res, 'Failed to check session status', 500);
    }
  })
);

/**
 * GET /api/auth/websocket-token
 * Get WebSocket authentication token
 */
router.get('/websocket-token',
  authenticateToken,
  asyncHandler(async (req, res) => {
    try {
      // Return the current JWT token for WebSocket connection
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return ResponseUtils.unauthorized(res, 'No token provided');
      }
      
      const jwt = require('jsonwebtoken');
      const { getSecret } = require('../../security/secrets-manager');
      const JWT_SECRET = getSecret('JWT_SECRET');
      
      // Verify token is still valid
      const decoded = jwt.verify(token, JWT_SECRET);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (decoded.exp && decoded.exp <= currentTime) {
        return ResponseUtils.unauthorized(res, 'Token expired');
      }
      
      return ResponseUtils.success(res, { 
        token,
        user: req.user,
        expiresAt: decoded.exp * 1000
      }, 'WebSocket token retrieved');
    } catch (error) {
      console.error('WebSocket token error:', error);
      return ResponseUtils.unauthorized(res, 'Invalid or expired token');
    }
  })
);

module.exports = router;