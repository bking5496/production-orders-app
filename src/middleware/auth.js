// Authentication Middleware
const jwt = require('jsonwebtoken');
const { getSecret } = require('../../security/secrets-manager');

const JWT_SECRET = getSecret('JWT_SECRET') || process.env.JWT_SECRET || 'default-secret-key';

/**
 * Authenticate JWT token middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'NO_TOKEN'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    req.user = user;
    next();
  });
};

/**
 * Require specific role(s) middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      console.warn(`Access denied for user ${req.user.username} (${req.user.role}) to ${req.path}`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_roles: roles
      });
    }
    next();
  };
};

/**
 * Optional authentication - proceeds even if no token
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

/**
 * Verify JWT token (without middleware)
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from request
 */
const extractToken = (req) => {
  const authHeader = req.headers['authorization'];
  return authHeader && authHeader.split(' ')[1];
};

/**
 * Check if user has required role
 */
const hasRole = (user, requiredRoles) => {
  if (!user || !user.role) return false;
  return Array.isArray(requiredRoles) 
    ? requiredRoles.includes(user.role)
    : user.role === requiredRoles;
};

/**
 * Admin only middleware
 */
const adminOnly = requireRole(['admin']);

/**
 * Admin or supervisor middleware
 */
const adminOrSupervisor = requireRole(['admin', 'supervisor']);

/**
 * Any authenticated user
 */
const authenticated = authenticateToken;

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
  generateToken,
  verifyToken,
  extractToken,
  hasRole,
  adminOnly,
  adminOrSupervisor,
  authenticated,
  JWT_SECRET
};