// server.js - Express Backend Server
// Production Management System API

require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const rateLimit = require('express-rate-limit');
const { getSecret } = require('./security/secrets-manager');
const { securityLogger } = require('./security/security-logger');

// Initialize Express app
const app = express();

// Trust proxy setting - required when behind reverse proxy/load balancer
app.set('trust proxy', true);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = getSecret('JWT_SECRET') || process.env.JWT_SECRET || (() => {
  console.error('🚨 FATAL: JWT_SECRET not found in secrets manager or environment');
  console.error('Please store JWT_SECRET in secrets manager or set as environment variable');
  process.exit(1);
})();
const DATABASE_URL = process.env.DATABASE_URL;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiting (more restrictive)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.',
    code: 'LOGIN_RATE_LIMITED'
  }
});

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.tailwindcss.com",
        "https://unpkg.com",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Rate limiting enabled for production security
app.use(limiter);

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://oracles.africa',
    'https://www.oracles.africa',
    'https://dev.oracles.africa'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('dist'));

// PostgreSQL Database connection
console.log('🐘 Initializing PostgreSQL database connection...');

const { dbRun, dbGet, dbAll, dbTransaction, pool, checkHealth } = require('./postgresql/db-postgresql');

// PostgreSQL database interface with automatic SQLite to PostgreSQL conversion
const db = {
    get: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        // Convert SQLite ? syntax to PostgreSQL $1, $2 syntax
        let pgSql = sql;
        if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                pgSql = pgSql.replace('?', `$${i + 1}`);
            }
        }
        dbGet(pgSql, params).then(result => callback(null, result)).catch(callback);
    },
    
    all: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        // Convert SQLite ? syntax to PostgreSQL $1, $2 syntax
        let pgSql = sql;
        if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                pgSql = pgSql.replace('?', `$${i + 1}`);
            }
        }
        dbAll(pgSql, params).then(result => callback(null, result)).catch(callback);
    },
    
    run: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        // Convert SQLite ? syntax to PostgreSQL $1, $2 syntax
        let pgSql = sql;
        if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                pgSql = pgSql.replace('?', `$${i + 1}`);
            }
        }
        dbRun(pgSql, params).then(result => {
            if (callback) callback.call({lastID: result.lastID, changes: result.changes});
        }).catch(callback);
    },
    
    // Transaction support using PostgreSQL transactions
    serialize: (fn) => fn(), // PostgreSQL handles concurrency differently
    transaction: dbTransaction,
    close: () => {} // Handled by connection pool
};

console.log('✅ PostgreSQL database interface ready');
console.log('🔍 About to run health check...');

// Database health check
checkHealth().then(health => {
    console.log('🏥 Database health check:', health);
}).catch(err => {
    console.error('❌ Database health check failed:', err);
});

// Labor roster uses existing users table - no additional tables needed
console.log('📋 Labor roster will use existing users table');

// PostgreSQL schemas already exist - no table creation needed
console.log('✅ PostgreSQL schemas already exist, skipping table creation');

// Create default admin user if not exists (PostgreSQL version)
async function createDefaultAdmin() {
  try {
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const result = await dbRun(
      `INSERT INTO users (username, email, password_hash, role, is_active, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       ON CONFLICT (username) DO NOTHING`,
      ['admin', 'admin@example.com', hashedPassword, 'admin', true]
    );
    
    if (result.changes > 0) {
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('ℹ️ Default admin user already exists');
    }
  } catch (error) {
    console.error('❌ Failed to create default admin user:', error);
  }
}

// Initialize default data - temporarily disabled for debugging
// createDefaultAdmin();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files are allowed.'));
    }
  }
});

// Enhanced JWT Middleware with proper error handling
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

// Enhanced role-based access control with logging
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

// WebSocket connection handling with authentication
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection attempt');
  
  // Authenticate WebSocket connection using token from query or headers
  const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token') || 
                req.headers['sec-websocket-protocol'];
  
  if (!token) {
    console.log('❌ WebSocket connection denied: No token provided');
    ws.close(1008, 'Authentication required');
    return;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.user = decoded;
    ws.subscriptions = [];
    ws.isAuthenticated = true;
    
    console.log(`✅ WebSocket authenticated: ${decoded.username} (${decoded.role})`);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      data: {
        user: { id: decoded.id, username: decoded.username, role: decoded.role },
        message: 'WebSocket connection authenticated'
      }
    }));
    
  } catch (error) {
    console.log('❌ WebSocket authentication failed:', error.message);
    ws.close(1008, 'Invalid token');
    return;
  }
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Only handle messages from authenticated connections
      if (!ws.isAuthenticated) {
        ws.send(JSON.stringify({ type: 'error', data: { error: 'Not authenticated' } }));
        return;
      }
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ 
            type: 'pong', 
            data: { serverTime: new Date().toISOString() }
          }));
          break;
          
        case 'subscribe':
          ws.subscriptions = data.data?.channels || [];
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            data: { channels: ws.subscriptions }
          }));
          console.log(`📺 ${ws.user.username} subscribed to:`, ws.subscriptions);
          break;
          
        case 'join_room':
          ws.room = data.data?.room;
          ws.send(JSON.stringify({
            type: 'room_joined',
            data: { room: ws.room }
          }));
          console.log(`🏠 ${ws.user.username} joined room:`, ws.room);
          break;
          
        case 'leave_room':
          ws.room = null;
          ws.send(JSON.stringify({
            type: 'room_left',
            data: { room: data.data?.room }
          }));
          break;
          
        default:
          console.log('Unknown message type:', data.type);
          ws.send(JSON.stringify({
            type: 'error',
            data: { error: `Unknown message type: ${data.type}` }
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { error: 'Invalid message format' }
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${ws.user?.username || 'Unknown'}`);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Enhanced broadcast function with channel filtering and authentication
function broadcast(type, data, channel = 'all') {
  const message = { 
    type, 
    data, 
    channel,
    timestamp: new Date().toISOString()
  };
  
  let sentCount = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.isAuthenticated && client.user) {
      // Check channel permissions
      if (channel === 'all' || (client.subscriptions && client.subscriptions.includes(channel))) {
        try {
          client.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to client ${client.user.username}:`, error);
        }
      }
    }
  });
  
  console.log(`📡 Broadcast sent: ${type} to channel: ${channel} (${sentCount} clients)`);
}

// Standardized API response helper
const apiResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: statusCode < 400,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  if (statusCode >= 400) {
    response.error = message;
    delete response.message;
  }
  
  return res.status(statusCode).json(response);
};

// Enhanced error handler
const handleError = (res, error, context = 'Operation') => {
  console.error(`${context} error:`, error);
  
  if (error.code === '23505') { // PostgreSQL unique constraint violation
    return apiResponse(res, null, 'Duplicate entry found', 409);
  }
  
  if (error.code === '23503') { // PostgreSQL foreign key violation
    return apiResponse(res, null, 'Referenced record not found', 400);
  }
  
  return apiResponse(res, null, `${context} failed`, 500);
};

// ==================== API ROUTES ====================

// Add these missing routes:

// Update order
app.put('/api/orders/:id', 
  authenticateToken, 
  requireRole(['admin', 'supervisor']),
  (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    
    db.run(
      `UPDATE production_orders SET ${fields} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Order updated successfully' });
      }
    );
  }
);

// Delete order
app.delete('/api/orders/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM production_orders WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Order deleted successfully' });
    });
  }
);

// Analytics endpoints
app.get('/api/analytics/stops', authenticateToken, (req, res) => {
  res.json([]); // Empty for now
});

// Settings endpoints
app.get('/api/settings/general', authenticateToken, (req, res) => {
  res.json({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    pageSize: 25
  });
});

app.put('/api/settings/general', authenticateToken, (req, res) => {
  res.json({ success: true });
});

// Enhanced health check with database status
app.get('/api/health', async (req, res) => {
  try {
    await dbGet('SELECT 1 as health_check');
    return apiResponse(res, {
      status: 'healthy',
      database: { status: 'connected', type: 'PostgreSQL' },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      websocket_clients: wss.clients.size
    });
  } catch (error) {
    return apiResponse(res, {
      status: 'unhealthy',
      database: { status: 'disconnected', error: error.message }
    }, 'Service unhealthy', 503);
  }
});

// Authentication routes with rate limiting
app.post('/api/auth/login',
  loginLimiter, // Apply login rate limiting
  [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.logAuthFailure(req.body.username || 'unknown', req.ip, 'Invalid input', req.get('User-Agent'));
      return apiResponse(res, null, 'Invalid input data', 400);
    }

    const { username, password } = req.body;

    try {
      const user = await dbGet('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        // Log authentication failure
        securityLogger.logAuthFailure(username, req.ip, 'Invalid credentials', req.get('User-Agent'));
        return apiResponse(res, null, 'Invalid credentials', 401);
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Update last login
      await dbRun('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      // Log successful authentication
      securityLogger.logAuthSuccess(username, req.ip, req.get('User-Agent'));

      return apiResponse(res, {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }, 'Login successful');
    } catch (error) {
      securityLogger.logAuthFailure(username, req.ip, `System error: ${error.message}`, req.get('User-Agent'));
      return handleError(res, error, 'Login');
    }
  }
);

app.post('/api/auth/verify', authenticateToken, (req, res) => {
  return apiResponse(res, { user: req.user }, 'Token valid');
});

// Session verification endpoint for WebSocket authentication
app.get('/api/auth/verify-session', authenticateToken, (req, res) => {
  res.json({
    authenticated: true, 
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Session status endpoint for frontend session management
app.get('/api/auth/session-status', authenticateToken, (req, res) => {
  try {
    // Extract token expiration from JWT payload
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = (decoded.exp - currentTime) * 1000; // Convert to milliseconds
    
    if (timeRemaining <= 0) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.json({
      timeRemaining: timeRemaining,
      expiresAt: decoded.exp * 1000,
      user: req.user 
    });
  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ error: 'Failed to check session status' });
  }
});

// WebSocket token endpoint for enhanced WebSocket authentication
app.get('/api/auth/websocket-token', authenticateToken, (req, res) => {
  try {
    // Return the current JWT token for WebSocket connection
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token is still valid
    const decoded = jwt.verify(token, JWT_SECRET);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (decoded.exp && decoded.exp <= currentTime) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.json({
      token: token,
      user: req.user,
      expiresAt: decoded.exp * 1000
    });
  } catch (error) {
    console.error('WebSocket token error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

console.log('JWT_SECRET exists:', !!JWT_SECRET);

// User management routes
app.get('/api/users', authenticateToken, requireRole(['admin', 'supervisor']), (req, res) => {
  db.all('SELECT id, username, email, role, is_active as active, created_at, last_login FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

app.post('/api/users',
  authenticateToken,
  requireRole(['admin']),
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'supervisor', 'operator', 'viewer']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      db.run(
        `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, role],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              return res.status(400).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: 'Database error' });
          }
          
          broadcast('user_created', { id: this.lastID, username, role });
          res.json({ id: this.lastID, message: 'User created successfully' });
        }
      );
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Machine management routes
app.get('/api/machines', authenticateToken, (req, res) => {
  const { environment } = req.query;
  let query = 'SELECT * FROM machines';
  const params = [];

  if (environment) {
    query += ' WHERE environment = ?';
    params.push(environment);
  }

  db.all(query, params, (err, machines) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(machines);
  });
});

app.post('/api/machines',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('name').notEmpty().trim(),
    body('type').notEmpty().trim(),
    body('environment').isIn(['blending', 'packaging', 'beverage']),
    body('capacity').isInt({ min: 1, max: 200 }).optional(),
  ],
  (req, res) => {
    console.log('Machine endpoint hit:', req.path, req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, environment, capacity = 100 } = req.body;

    db.run(
      `INSERT INTO machines (name, type, environment, capacity, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 'available', datetime('now', '+2 hours'), datetime('now', '+2 hours'))`,
      [name, type, environment, capacity],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create machine' });
        }
        
        res.json({
          id: this.lastID, 
          message: 'Machine created successfully' 
        });
      }
    );
  }
);

// Update machine
app.put('/api/machines/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('name').notEmpty().trim().optional(),
    body('type').notEmpty().trim().optional(),
    body('capacity').isInt({ min: 1, max: 200 }).optional(),
  ],
  (req, res) => {
    console.log('Machine endpoint hit:', req.path, req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;
    
    // Check if machine is in use
    db.get(
      'SELECT status FROM machines WHERE id = ?',
      [id],
      (err, machine) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!machine) {
          return res.status(404).json({ error: 'Machine not found' });
        }
        
        if (machine.status === 'in_use') {
          return res.status(400).json({ error: 'Cannot update machine while in use' });
        }
        
        // Build update query
        const fields = Object.keys(updates).map(key => `${key} = ?`);
        fields.push('updated_at = datetime("now", "+2 hours")');
        const values = Object.values(updates);
        values.push(id);
        
        db.run(
          `UPDATE machines SET ${fields.join(', ')} WHERE id = ?`,
          values,
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update machine' });
            }
            
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Machine not found' });
            }
            
            res.json({ message: 'Machine updated successfully' });
          }
        );
      }
    );
  }
);

// Update machine status only
app.patch('/api/machines/:id/status',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('status').isIn(['available', 'maintenance', 'offline']),
  (req, res) => {
    console.log('Machine endpoint hit:', req.path, req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Check current status
    db.get(
      'SELECT status FROM machines WHERE id = ?',
      [id],
      (err, machine) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!machine) {
          return res.status(404).json({ error: 'Machine not found' });
        }
        
        if (machine.status === 'in_use' || machine.status === 'paused') {
          return res.status(400).json({
            error: 'Cannot change status while machine is in use or paused' 
          });
        }
        
        db.run(
          `UPDATE machines 
           SET status = $1, updated_at = NOW()
           WHERE id = $2`,
          [status, id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update status' });
            }
            
            res.json({ message: 'Machine status updated successfully' });
          }
        );
      }
    );
  }
);

// Delete machine
app.delete('/api/machines/:id',
  authenticateToken,
  requireRole(['admin']),
  (req, res) => {
    const { id } = req.params;

    // Check if machine is in use or has history
    db.get(
      `SELECT m.status, 
              (SELECT COUNT(*) FROM production_orders WHERE machine_id = m.id) as order_count
       FROM machines m 
       WHERE m.id = ?`,
      [id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!result) {
          return res.status(404).json({ error: 'Machine not found' });
        }
        
        if (result.status === 'in_use' || result.status === 'paused') {
          return res.status(400).json({ error: 'Cannot delete machine while in use' });
        }
        
        if (result.order_count > 0) {
          return res.status(400).json({
            error: 'Cannot delete machine with production history. Set to offline instead.' 
          });
        }
        
        db.run('DELETE FROM machines WHERE id = ?', [id], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to delete machine' });
          }
          
          res.json({ message: 'Machine deleted successfully' });
        });
      }
    );
  }
);

// Get machine statistics
app.get('/api/machines/stats',
  authenticateToken,
  (req, res) => {
    db.all(
      `SELECT 
        environment,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline
       FROM machines
       GROUP BY environment`,
      [],
      (err, stats) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(stats);
      }
    );
  }
);

// Production order routes
app.get('/api/orders',
  authenticateToken,
  (req, res) => {
    const { environment, status, include_archived } = req.query;
    
    let query = `
      SELECT 
        o.*,
        m.name as machine_name,
        u.username as operator_name
      FROM production_orders o
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN users u ON o.operator_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // By default, exclude archived orders unless specifically requested
    if (include_archived !== 'true') {
      query += ' AND (o.archived = false OR o.archived IS NULL)';
    }
    
    if (environment) {
      query += ' AND o.environment = ?';
      params.push(environment);
    }
    
    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    db.all(query, params, (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(orders);
    });
  }
);

app.get('/api/orders/archived',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  (req, res) => {
    const query = `
      SELECT 
        o.*,
        m.name as machine_name,
        u.username as operator_name
      FROM production_orders o
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN users u ON o.operator_id = u.id
      WHERE o.archived = true
      ORDER BY o.complete_time DESC
    `;
    
    db.all(query, [], (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(orders);
    });
  }
);

app.post('/api/orders',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('order_number').notEmpty().trim(),
    body('product_name').notEmpty().trim(),
    body('quantity').isInt({ min: 1 }),
    body('environment').isIn(['blending', 'packaging', 'production', 'Beverage', 'Processing']),
    body('priority').isIn(['low', 'normal', 'high', 'urgent']).optional(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { order_number, product_name, quantity, environment, priority, due_date, notes } = req.body;

    db.run(
      `INSERT INTO production_orders (
        order_number, product_name, quantity, environment, priority, 
        due_date, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+2 hours'))`,
      [order_number, product_name, quantity, environment, priority || 'normal', due_date, notes, req.user.id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Order number already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        
        broadcast('order_created', {
          id: this.lastID,
          order_number,
          product_name,
          environment
        });
        
        res.json({ id: this.lastID, message: 'Order created successfully' });
      }
    );
  }
);

// Production actions

app.post('/api/orders/:id/start',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('machine_id').isInt(),
  (req, res) => {
    const { id } = req.params;
    const { machine_id } = req.body;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Update order with SAST time (+2 hours)
      db.run(
        `UPDATE production_orders 
         SET status = 'in_progress', 
             machine_id = $1, 
             operator_id = $2, 
             start_time = NOW(),
             updated_at = NOW()
         WHERE id = $3 AND status = 'pending'`,
        [machine_id, req.user.id, id],
        function(err, result) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!result || result.changes === 0) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Order not found or already started' });
          }
          
          // Update machine status
          db.run(
            'UPDATE machines SET status = $1 WHERE id = $2',
            ['in_use', machine_id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to update machine status' });
              }
              
              db.run('COMMIT');
              broadcast('order_started', { id, machine_id, operator_id: req.user.id });
              res.json({ message: 'Production started successfully' });
            }
          );
        }
      );
    });
  }
);

// Add these endpoints to your server.js file after the /api/orders/:id/start endpoint:

// Replace the pause endpoint in your server.js with this corrected version:

// Pause production


app.post('/api/orders/:id/pause',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('notes').optional(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason, notes } = req.body;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // First update the order
      db.run(
        `UPDATE production_orders 
         SET status = 'stopped', 
             stop_time = CURRENT_TIMESTAMP,
             stop_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND status = 'in_progress'`,
        [reason, id],
        function(updateErr) {
          if (updateErr) {
            console.error('Failed to update order:', updateErr);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update order status' });
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Order not found or not in progress' });
          }
          
          // Create stop record - simpler version
          db.run(
            `INSERT INTO production_stops (order_id, reason, notes, created_by) 
             VALUES ($1, $2, $3, $4)`,
            [id, reason, notes || '', req.user.id],
            function(insertErr) {
              if (insertErr) {
                console.error('Failed to create stop record:', insertErr);
                // Try without created_by if that's the issue
                db.run(
                  `INSERT INTO production_stops (order_id, reason, notes) 
                   VALUES ($1, $2, $3)`,
                  [id, reason, notes || ''],
                  function(retryErr) {
                    if (retryErr) {
                      console.error('Failed again:', retryErr);
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Failed to create stop record' });
                    }
                    
                    db.run('COMMIT');
                    res.json({
                      message: 'Production paused successfully',
                      stop_id: this.lastID
                    });
                  }
                );
              } else {
                db.run('COMMIT');
                res.json({
                  message: 'Production paused successfully',
                  stop_id: this.lastID
                });
              }
            }
          );
        }
      );
    });
  }
);


// Also update the resume endpoint to fix the ORDER BY issue:

// Resume production
app.post('/api/orders/:id/resume',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  (req, res) => {
    const { id } = req.params;
    const resumeTime = new Date().toISOString();

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      db.get(
        'SELECT * FROM production_orders WHERE id = $1 AND status = \'stopped\'',
        [id],
        (err, order) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!order) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Order not found or not stopped' });
          }
          
          // Update order status
          db.run(
            `UPDATE production_orders 
             SET status = 'in_progress',
                 stop_time = NOW(),
                 stop_reason = NULL::TEXT,
                 updated_at = NOW()
             WHERE id = $1`,
            [id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to update order status' });
              }
              
              // Update stop record with resume time
              db.get(
                `SELECT id, created_at FROM production_stops 
                 WHERE order_id = $1 AND resolved_at IS NULL 
                 ORDER BY created_at DESC 
                 LIMIT 1`,
                [id],
                (err, stopRecord) => {
                  if (!err && stopRecord) {
                    db.run(
                      `UPDATE production_stops 
                       SET resolved_at = NOW(),
                           duration = EXTRACT(EPOCH FROM (NOW() - created_at)) / 60
                       WHERE id = $1`,
                      [stopRecord.id],
                      (err) => {
                        if (err) { console.error('Failed to update stop record:', err); }
                      }
                    );
                  }
                  
                  if (order.machine_id) {
                    db.run(
                      'UPDATE machines SET status = $1 WHERE id = $2',
                      ['in_use', order.machine_id],
                      function(err) {
                        if (err) {
                          console.error('Failed to update machine status:', err);
                        }
                        
                        db.run('COMMIT');
                        
                        broadcast('order_resumed', {
                          id: order.id, 
                          order_number: order.order_number,
                          resumed_by: req.user.username,
                          resume_time: resumeTime
                        });
                        
                        res.json({
                          message: 'Production resumed successfully',
                          resume_time: resumeTime
                        });
                      }
                    );
                  } else {
                    db.run('COMMIT');
                    res.json({
                      message: 'Production resumed successfully',
                      resume_time: resumeTime
                    });
                  }
                }
              );
            }
          );
        }
      );
    });
  }
);

// Stop production (different from pause - this is for ending production without completion)
app.post('/api/orders/:id/stop',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  body('reason').notEmpty(),
  body('notes').optional(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason, notes } = req.body;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Update order status to stopped (so it can be resumed)
      db.run(
        `UPDATE production_orders 
         SET status = 'stopped',
             stop_time = CURRENT_TIMESTAMP,
             stop_reason = $1,
             notes = CASE WHEN $2::TEXT IS NOT NULL THEN COALESCE(notes, '') || ' | Stopped: ' || $2::TEXT ELSE COALESCE(notes, '') END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND status IN ('pending', 'in_progress', 'stopped')`,
        [reason, notes, id],
        function(err, result) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!result || result.changes === 0) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Order not found or cannot be stopped' });
          }
          
          // Machine remains locked (in_use) during stop - only freed on completion
          // No machine status change needed here
          
          db.run('COMMIT');
          
          broadcast('order_stopped', {
            id: id, 
            reason: reason,
            stopped_by: req.user.username 
          });
          
          res.json({ message: 'Production stopped successfully' });
        }
      );
    });
  }
);

// Add this endpoint to your server.js file after the /api/orders/:id/start endpoint

// Complete production

app.post('/api/orders/:id/complete',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('actual_quantity').isInt().optional(),
  body('notes').optional(),
  body('waste_quantity').isFloat().optional(),
  body('waste_type').optional(),
  // Add fields for multiple waste types
  body('waste_powder').isFloat().optional(),
  body('waste_corrugated_box').isFloat().optional(),
  body('waste_paper').isFloat().optional(),
  body('waste_display').isFloat().optional(),
  (req, res) => {
    const { id } = req.params;
    const { 
      actual_quantity, 
      notes, 
      waste_quantity, 
      waste_type,
      waste_powder,
      waste_corrugated_box,
      waste_paper,
      waste_display
    } = req.body;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      db.get(
        'SELECT * FROM production_orders WHERE id = $1 AND status = \'in_progress\'',
        [id],
        (err, order) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!order) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Order not found or not in progress' });
          }
          
          const finalQuantity = actual_quantity || order.quantity;
          const efficiency = (finalQuantity / order.quantity) * 100;
          
          // Prepare notes with waste information
          let finalNotes = notes || '';
          
          // For blending environment - single waste type
          if (order.environment === 'blending' && waste_quantity && waste_quantity > 0) {
            finalNotes += `\nWaste: ${waste_quantity} kg`;
          }
          
          // For packaging environment - multiple waste types
          if (order.environment === 'packaging') {
            let wasteDetails = [];
            if (waste_powder > 0) wasteDetails.push(`Powder: ${waste_powder}`);
            if (waste_corrugated_box > 0) wasteDetails.push(`Corrugated Box: ${waste_corrugated_box}`);
            if (waste_paper > 0) wasteDetails.push(`Paper: ${waste_paper}`);
            if (waste_display > 0) wasteDetails.push(`Display: ${waste_display}`);
            
            if (wasteDetails.length > 0) {
              finalNotes += `\nWaste - ${wasteDetails.join(', ')}`;
            }
          }
          
          // Update order with completion time and archive it
          db.run(
            `UPDATE production_orders 
             SET status = 'completed', 
                 complete_time = NOW(),
                 actual_quantity = $1,
                 efficiency_percentage = $2,
                 notes = CASE WHEN $3::TEXT IS NOT NULL THEN COALESCE(notes, '') || ' | Completion: ' || $3::TEXT ELSE COALESCE(notes, '') END,
                 archived = true,
                 updated_at = NOW()
             WHERE id = $5`,
            [finalQuantity, efficiency, finalNotes, id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to update order' });
              }
              
              // Log waste details if any
              if (order.environment === 'packaging' && 
                  (waste_powder > 0 || waste_corrugated_box > 0 || waste_paper > 0 || waste_display > 0)) {
                const totalWaste = (waste_powder || 0) + (waste_corrugated_box || 0) + 
                                  (waste_paper || 0) + (waste_display || 0);
                
                db.run(
                  `INSERT INTO production_waste (order_id, waste_type, quantity, created_by, created_at)
                   VALUES ($1, $2, $3, $4, NOW())`,
                  [id, 'packaging_mixed', totalWaste, req.user.id],
                  (err) => {
                    if (err) console.error('Failed to log waste:', err);
                  }
                );
              }
              
              // Update machine status
              if (order.machine_id) {
                db.run(
                  'UPDATE machines SET status = $1 WHERE id = $2',
                  ['available', order.machine_id],
                  function(err) {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Failed to update machine status' });
                    }
                    
                    db.run('COMMIT');
                    
                    broadcast('order_completed',{
                      id: order.id,
                      order_number: order.order_number,
                      actual_quantity: finalQuantity,
                      efficiency: efficiency,
                      completed_by: req.user.username
                    });
                    
                    res.json({
                      message: 'Production completed successfully',
                      efficiency: efficiency,
                      actual_quantity: finalQuantity
                    });
                  }
                );
              } else {
                db.run('COMMIT');
                res.json({
                  message: 'Production completed successfully',
                  efficiency: efficiency,
                  actual_quantity: finalQuantity
                });
              }
            }
          );
        }
      );
    });
  }
);

// Pause production
app.post('/api/orders/:id/pause',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('reason').notEmpty(),
  (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Update order status
      db.run(
        `UPDATE production_orders 
         SET status = 'stopped', 
             stop_time = CURRENT_TIMESTAMP,
             stop_reason = $1
         WHERE id = $2 AND status = 'in_progress'`,
        [reason, id],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Order not found or not in progress' });
          }
          
          // Create stop record
          db.run(
            `INSERT INTO production_stops (order_id, reason, created_by) 
             VALUES ($1, $2, $3)`,
            [id, reason, req.user.id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to create stop record' });
              }
              
              db.run('COMMIT');
              broadcast('order_paused', { id, reason });
              res.json({ message: 'Production paused successfully' });
            }
          );
        }
      );
    });
  }
);

// Resume production
app.post('/api/orders/:id/resume',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  (req, res) => {
    const { id } = req.params;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Update order status back to in_progress
      db.run(
        `UPDATE production_orders 
         SET status = 'in_progress',
             stop_time = NULL::TIMESTAMP,
             stop_reason = NULL::TEXT
         WHERE id = $1 AND status = 'stopped'`,
        [id],
        function(err, result) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!result || result.changes === 0) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Order not found or not stopped' });
          }
          
          // Update the latest stop record
          db.run(
            `UPDATE production_stops 
             SET resolved_at = CURRENT_TIMESTAMP,
                 duration = CAST(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60 AS INTEGER)
             WHERE order_id = $1 AND resolved_at IS NULL`,
            [id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to update stop record' });
              }
              
              db.run('COMMIT');
              broadcast('order_resumed', { id });
              res.json({ message: 'Production resumed successfully' });
            }
          );
        }
      );
    });
  }
);

// Export routes
app.get('/api/export/:type',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  (req, res) => {
    const { type } = req.params;
    const { start_date, end_date, environment } = req.query;
    
    let query;
    let params = [];
    let filename;

    switch (type) {
      case 'orders':
        query = `
          SELECT o.*, m.name as machine_name, u.username as operator_name
          FROM production_orders o
          LEFT JOIN machines m ON o.machine_id = m.id
          LEFT JOIN users u ON o.operator_id = u.id
          WHERE 1=1
        `;
        filename = 'production_orders.xlsx';
        break;
      case 'downtime':
        query = `
          SELECT p.*, o.order_number 
          FROM production_stops p
          LEFT JOIN production_orders o ON p.order_id = o.id
          WHERE 1=1
        `;
        filename = 'downtime_report.xlsx';
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (start_date && end_date) {
      query += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    if (environment) {
      query += ' AND o.environment = ?';
      params.push(environment);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Data');

      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    });
  }
);

// Environment management
app.get('/api/environments', authenticateToken, (req, res) => {
  db.all('SELECT DISTINCT environment FROM machines ORDER BY environment', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows.map(r => ({ name: r.environment })));
  });
});

// File upload for bulk orders
app.post('/api/upload-orders',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const row of data) {
        try {
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO production_orders 
               (order_number, product_name, quantity, environment, priority, due_date, notes, created_by) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                row.order_number || row['Order Number'],
                row.product_name || row['Product Name'],
                parseInt(row.quantity || row['Quantity']),
                row.environment || row['Environment'] || 'default',
                row.priority || row['Priority'] || 'normal',
                row.due_date || row['Due Date'],
                row.notes || row['Notes'] || '',
                req.user.id
              ],
              (err) => {
                if (err) {
                  results.failed++;
                  results.errors.push(`Row ${results.success + results.failed}: ${err.message}`);
                  resolve();
                } else {
                  results.success++;
                  resolve();
                }
              }
            );
          });
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: ${error.message}`);
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json(results);
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to process file' });
    }
  }
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: 'File upload error' });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Test endpoint
app.get('/api/machines/test', (req, res) => {
  res.json({ message: 'Machines endpoints are working' });
});

// Test endpoint
app.get('/api/test-login', (req, res) => {
  db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
    if (err) {
      return res.json({ error: err.message, stack: err.stack });
    }
    res.json({
      user: user ? {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        has_password_hash: !!user.password_hash
      } : null
    });
  });
});

// Analytics endpoint
app.get('/api/analytics/stops', authenticateToken, async (req, res) => {
  const { start_date, end_date, environment } = req.query;
  res.json([]); // Return empty array for now
});

// Analytics summary endpoint
app.get('/api/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Get basic summary data
    const totalOrdersQuery = 'SELECT COUNT(*) as count FROM production_orders';
    const completedOrdersQuery = 'SELECT COUNT(*) as count FROM production_orders WHERE status = \'completed\'' ;
    const activeOrdersQuery = 'SELECT COUNT(*) as count FROM production_orders WHERE status = \'in_progress\'' ;
    
    const [totalOrders, completedOrders, activeOrders] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get(totalOrdersQuery, [], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(completedOrdersQuery, [], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(activeOrdersQuery, [], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      })
    ]);
    
    res.json({
      summary: {
        totalOrders,
        completedOrders,
        activeOrders,
        totalProduction: totalOrders * 100, // Mock data
        efficiency: completedOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

// Analytics downtime endpoint
app.get('/api/analytics/downtime', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Get downtime data from production_stops
    const downtimeQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(duration) as total_duration
      FROM production_stops 
      GROUP BY category
    `;
    
    const downtime = await new Promise((resolve, reject) => {
      db.all(downtimeQuery, [], (err, results) => {
        if (err) reject(err);
        else resolve(results || []);
      });
    });
    
    res.json({
      downtime: downtime.reduce((acc, item) => {
        acc[item.category] = {
          count: item.count,
          duration: item.total_duration || 0
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Analytics downtime error:', error);
    res.status(500).json({ error: 'Failed to fetch downtime analytics' });
  }
});

// Reports downtime endpoint
app.get('/api/reports/downtime', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Get detailed downtime records
    const recordsQuery = `
      SELECT 
        ps.*,
        po.order_number,
        po.product_name
      FROM production_stops ps
      LEFT JOIN production_orders po ON ps.order_id = po.id
      ORDER BY ps.start_time DESC
      LIMIT 50
    `;
    
    const records = await new Promise((resolve, reject) => {
      db.all(recordsQuery, [], (err, results) => {
        if (err) reject(err);
        else resolve(results || []);
      });
    });
    
    // Generate summary
    const summary = {
      totalStops: records.length,
      totalDuration: records.reduce((sum, record) => sum + (record.duration || 0), 0),
      averageDuration: records.length > 0 ? Math.round(records.reduce((sum, record) => sum + (record.duration || 0), 0) / records.length) : 0
    };
    
    const categoryBreakdown = records.reduce((acc, record) => {
      const category = record.category || 'Other';
      if (!acc[category]) {
        acc[category] = { count: 0, duration: 0 };
      }
      acc[category].count++;
      acc[category].duration += (record.duration || 0);
      return acc;
    }, {});
    
    res.json({
      records,
      summary,
      category_breakdown: categoryBreakdown
    });
  } catch (error) {
    console.error('Downtime reports error:', error);
    res.status(500).json({ error: 'Failed to fetch downtime reports' });
  }
});

// ================================
// PRODUCTION DATA API ENDPOINTS
// ================================

// Production floor overview - Main dashboard endpoint (temporarily without auth for dev)
app.get('/api/production/floor-overview', async (req, res) => {
  try {
    // Get active orders with machine and progress information
    const activeOrdersQuery = `
      SELECT 
        po.*,
        m.name as machine_name,
        m.type as machine_type,
        u.username as operator_name,
        EXTRACT(EPOCH FROM (NOW() - po.start_time)) / 3600 as hours_running
      FROM production_orders po
      LEFT JOIN machines m ON po.machine_id = m.id
      LEFT JOIN users u ON po.operator_id = u.id
      WHERE po.status = 'in_progress'
      ORDER BY po.start_time DESC
    `;
    
    // Get all machines with their current status and any active orders
    const machinesQuery = `
      SELECT 
        m.id,
        m.name,
        m.code,
        m.type,
        m.environment,
        m.status,
        m.capacity,
        m.production_rate,
        m.location,
        po.id as order_id,
        po.order_number,
        po.product_name,
        po.quantity,
        po.start_time
      FROM machines m
      LEFT JOIN production_orders po ON m.id = po.machine_id AND po.status = 'in_progress'
      ORDER BY m.name
    `;
    
    // Get machine status summary for statistics
    const machineStatusSummaryQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM machines
      GROUP BY status
    `;
    
    // Get production summary for today
    const todayProductionQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders
      FROM production_orders
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    
    const [activeOrders, machines, machineStatusSummary, todayStats] = await Promise.all([
      dbAll(activeOrdersQuery),
      dbAll(machinesQuery),
      dbAll(machineStatusSummaryQuery),
      dbGet(todayProductionQuery)
    ]);
    
    // Calculate efficiency metrics
    const efficiency = todayStats.total_orders > 0 
      ? Math.round((todayStats.completed_orders / todayStats.total_orders) * 100)
      : 0;
    
    res.json({
      activeOrders: activeOrders || [],
      machines: machines || [],
      machineStatus: machines || [], // For compatibility with frontend expecting machineStatus
      machineStatusSummary: machineStatusSummary || [],
      todayStats: todayStats || { total_orders: 0, completed_orders: 0, active_orders: 0, pending_orders: 0 },
      efficiency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Production floor overview error:', error);
    res.status(500).json({ error: 'Failed to fetch production floor overview' });
  }
});

// Production status - Critical priority endpoint
app.get('/api/production/status', authenticateToken, async (req, res) => {
  try {
    const statusQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM production_orders
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    
    const status = await dbGet(statusQuery);
    res.json(status || { total: 0, active: 0, completed: 0, stopped: 0, pending: 0 });
  } catch (error) {
    console.error('Production status error:', error);
    res.status(500).json({ error: 'Failed to fetch production status' });
  }
});

// Machines status - Critical priority endpoint
app.get('/api/machines/status', authenticateToken, async (req, res) => {
  try {
    const statusQuery = `
      SELECT 
        id,
        name,
        type,
        status,
        environment
      FROM machines
      ORDER BY name
    `;
    
    const machines = await dbAll(statusQuery);
    res.json(machines || []);
  } catch (error) {
    console.error('Machines status error:', error);
    res.status(500).json({ error: 'Failed to fetch machines status' });
  }
});

// Active orders - High priority endpoint
app.get('/api/orders/active', authenticateToken, async (req, res) => {
  try {
    const activeQuery = `
      SELECT 
        po.*,
        m.name as machine_name
      FROM production_orders po
      LEFT JOIN machines m ON po.machine_id = m.id
      WHERE po.status = 'in_progress'
      ORDER BY po.start_time DESC
    `;
    
    const orders = await dbAll(activeQuery);
    res.json(orders || []);
  } catch (error) {
    console.error('Active orders error:', error);
    res.status(500).json({ error: 'Failed to fetch active orders' });
  }
});

// Labour/Roster endpoints - using users table directly
app.get('/api/labour/roster', authenticateToken, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Get all active users as potential roster members
    const usersQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.is_active,
        u.created_at
      FROM users u
      WHERE u.is_active = true
      ORDER BY u.role, u.username
    `;
    
    const users = await dbAll(usersQuery);
    
    // Get available machines
    const machinesQuery = `
      SELECT name, environment 
      FROM machines 
      WHERE status = 'active' 
      ORDER BY environment, name
    `;
    
    const machines = await dbAll(machinesQuery);
    const machineNames = machines.map(m => m.name);
    
    // Separate users by role
    const supervisors = users.filter(u => u.role === 'supervisor' || u.role === 'admin');
    const operators = users.filter(u => u.role === 'operator');
    const allUsers = users;
    
    const response = {
      supervisors: supervisors.map(s => ({
        id: s.id,
        fullName: s.username,
        name: s.username,
        employee_code: `EMP${s.id.toString().padStart(4, '0')}`,
        shift: 'morning', // Default shift
        status: s.is_active ? 'active' : 'inactive',
        role: s.role
      })),
      assignments: operators.map((a, index) => ({
        id: a.id,
        fullName: a.username,
        name: a.username,
        employee_code: `EMP${a.id.toString().padStart(4, '0')}`,
        machine: machineNames[index % machineNames.length] || 'Unassigned',
        position: a.role,
        shift: ['morning', 'afternoon', 'night'][index % 3],
        company: 'Production Company',
        status: 'scheduled',
        role: a.role
      })),
      attendance: allUsers.map(a => ({
        id: a.id,
        name: a.username,
        employee_code: `EMP${a.id.toString().padStart(4, '0')}`,
        production_area: 'Production Floor',
        position: a.role,
        shift: 'morning', // Default shift
        status: 'scheduled'
      })),
      machinesInUse: machineNames,
      summary: {
        total_supervisors: supervisors.length,
        total_assignments: operators.length,
        total_attendance: allUsers.length,
        total_machines_in_use: machineNames.length
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Labour roster error:', error);
    res.status(500).json({ error: 'Failed to fetch labour roster' });
  }
});

app.get('/api/labour/today', authenticateToken, async (req, res) => {
  try {
    // Get all active users for today's roster
    const usersQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.is_active
      FROM users u
      WHERE u.is_active = true
      ORDER BY u.role, u.username
    `;
    
    const users = await dbAll(usersQuery);
    
    const response = users.map(a => ({
      id: a.id,
      name: a.username,
      employee_code: `EMP${a.id.toString().padStart(4, '0')}`,
      production_area: 'Production Floor',
      position: a.role,
      shift: 'morning', // Default shift
      status: 'scheduled'
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Labour today error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s labour data' });
  }
});

// Serve React app for all other routes

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Load enhanced endpoints
try {
  const enhancedWorkflowEndpoints = require('./enhanced-workflow-endpoints.js');
  const enhancedDowntimeEndpoints = require('./enhanced-downtime-endpoints.js');
  const downtimeAnalyticsEndpoints = require('./downtime-analytics-endpoints.js');
  const realtimeDowntimeAlerts = require('./real-time-downtime-alerts.js');
  const configurationEndpoints = require('./configuration-endpoints.js');
  
  enhancedWorkflowEndpoints(app, db, authenticateToken, requireRole, body, broadcast);
  enhancedDowntimeEndpoints(app, db, authenticateToken, requireRole, body, broadcast);
  downtimeAnalyticsEndpoints(app, db, authenticateToken, requireRole, body, broadcast);
  realtimeDowntimeAlerts(app, db, authenticateToken, requireRole, body, broadcast);
  configurationEndpoints(app, db, authenticateToken, requireRole, broadcast);
  
  console.log('✨ Enhanced endpoints loaded successfully');
  console.log('🔧 Configuration management system enabled');
} catch (error) {
  console.error('❌ Failed to load enhanced endpoints:', error.message);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    pool.end();
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 5)}...`);
  });
}

module.exports = server;