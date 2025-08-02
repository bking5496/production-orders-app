// server-fixed.js - Express Backend Server with PostgreSQL Fixes
// Production Management System API - FIXED VERSION

require('dotenv').config();
const express = require('express');
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

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('🚨 WARNING: Using default JWT secret. Set JWT_SECRET environment variable in production!');
  return 'production-orders-default-secret-change-immediately-in-production-' + Date.now();
})();
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Database Configuration - PostgreSQL Only
console.log('🐘 Loading PostgreSQL database module...');
const { dbRun, dbGet, dbAll, dbTransaction, checkHealth, pool } = require('./postgresql/db-postgresql');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Apply rate limiting to all requests
app.use(limiter);

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('dist'));

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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

// Role-based access control with enhanced logging
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
  
  // Extract token from query parameters for WebSocket authentication
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    console.warn('WebSocket connection rejected: No token provided');
    ws.close(1008, 'Token required');
    return;
  }
  
  // Verify JWT token for WebSocket
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('WebSocket connection rejected: Invalid token');
      ws.close(1008, 'Invalid token');
      return;
    }
    
    ws.user = user;
    ws.subscriptions = [];
    console.log(`✅ WebSocket authenticated: ${user.username} (${user.role})`);
    
    ws.send(JSON.stringify({ 
      type: 'authenticated', 
      user: { id: user.id, username: user.username, role: user.role },
      timestamp: new Date().toISOString()
    }));
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'subscribe':
          ws.subscriptions = data.channels || [];
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            channels: ws.subscriptions,
            timestamp: new Date().toISOString()
          }));
          break;
        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket connection closed: ${ws.user?.username || 'unknown'}`);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Enhanced broadcast function with channel filtering
function broadcast(type, data, channel = 'all') {
  const message = { 
    type, 
    data, 
    channel,
    timestamp: new Date().toISOString()
  };
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.user) {
      if (channel === 'all' || (client.subscriptions && client.subscriptions.includes(channel))) {
        client.send(JSON.stringify(message));
      }
    }
  });
  
  console.log(`📡 Broadcast sent: ${type} to channel: ${channel}`);
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

// Health check with database status
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkHealth();
    return apiResponse(res, {
      status: 'healthy',
      database: dbHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    return apiResponse(res, null, 'Service unhealthy', 503);
  }
});

// Authentication routes with enhanced security
app.post('/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // limit each IP to 5 login attempts per 15 minutes
    skipSuccessfulRequests: true,
  }),
  [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse(res, null, 'Invalid input data', 400);
    }

    const { username, password } = req.body;

    try {
      const user = await dbGet(
        'SELECT id, username, email, password, role, active FROM users WHERE username = $1 AND active = true',
        [username]
      );

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return apiResponse(res, null, 'Invalid credentials', 401);
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Update last login
      await dbRun('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

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
      return handleError(res, error, 'Login');
    }
  }
);

app.post('/api/auth/verify', authenticateToken, (req, res) => {
  return apiResponse(res, { user: req.user }, 'Token valid');
});

// Production order routes with proper PostgreSQL handling
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { environment, status, include_archived } = req.query;
    
    let query = `
      SELECT 
        o.*,
        m.name as machine_name,
        m.type as machine_type,
        u.username as operator_name
      FROM production_orders o
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN users u ON o.operator_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // By default, exclude archived orders unless specifically requested
    if (include_archived !== 'true') {
      query += ' AND (o.archived = false OR o.archived IS NULL)';
    }
    
    if (environment) {
      paramCount++;
      query += ` AND o.environment = $${paramCount}`;
      params.push(environment);
    }
    
    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    const orders = await dbAll(query, params);
    return apiResponse(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    return handleError(res, error, 'Get orders');
  }
});

app.post('/api/orders',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  [
    body('order_number').trim().notEmpty().escape(),
    body('product_name').trim().notEmpty().escape(),
    body('quantity').isInt({ min: 1 }),
    body('environment').isIn(['blending', 'packaging', 'production', 'Beverage', 'Processing']),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse(res, { errors: errors.array() }, 'Validation failed', 400);
    }

    const { order_number, product_name, quantity, environment, priority, due_date, notes } = req.body;

    try {
      const result = await dbRun(
        `INSERT INTO production_orders (
          order_number, product_name, quantity, environment, priority, 
          due_date, notes, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id`,
        [order_number, product_name, quantity, environment, priority || 'normal', due_date, notes, req.user.id]
      );
      
      broadcast('order_created', {
        id: result.lastID,
        order_number,
        product_name,
        environment,
        created_by: req.user.username
      });
      
      return apiResponse(res, { id: result.lastID }, 'Order created successfully', 201);
    } catch (error) {
      return handleError(res, error, 'Create order');
    }
  }
);

// Production actions with proper transaction handling
app.post('/api/orders/:id/start',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  [body('machine_id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse(res, null, 'Invalid machine ID', 400);
    }

    const { id } = req.params;
    const { machine_id } = req.body;

    try {
      const result = await dbTransaction(async (client) => {
        // Update order
        const orderResult = await client.query(
          `UPDATE production_orders 
           SET status = 'in_progress', 
               machine_id = $1, 
               operator_id = $2, 
               start_time = NOW(),
               updated_at = NOW()
           WHERE id = $3 AND status = 'pending'`,
          [machine_id, req.user.id, id]
        );
        
        if (orderResult.rowCount === 0) {
          throw new Error('Order not found or already started');
        }
        
        // Update machine status
        await client.query(
          'UPDATE machines SET status = $1, updated_at = NOW() WHERE id = $2',
          ['in_use', machine_id]
        );
        
        return { orderId: id, machineId: machine_id };
      });
      
      broadcast('order_started', { 
        id: result.orderId, 
        machine_id: result.machineId, 
        operator_id: req.user.id,
        operator_name: req.user.username
      });
      
      return apiResponse(res, null, 'Production started successfully');
    } catch (error) {
      return handleError(res, error, 'Start production');
    }
  }
);

app.post('/api/orders/:id/complete',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  [
    body('actual_quantity').optional().isInt({ min: 0 }),
    body('notes').optional().trim().escape()
  ],
  async (req, res) => {
    const { id } = req.params;
    const { actual_quantity, notes } = req.body;

    try {
      const result = await dbTransaction(async (client) => {
        // Get current order
        const order = await client.query(
          'SELECT * FROM production_orders WHERE id = $1 AND status = $2',
          [id, 'in_progress']
        );
        
        if (order.rows.length === 0) {
          throw new Error('Order not found or not in progress');
        }
        
        const orderData = order.rows[0];
        const finalQuantity = actual_quantity || orderData.quantity;
        const efficiency = (finalQuantity / orderData.quantity) * 100;
        
        // Update order
        await client.query(
          `UPDATE production_orders 
           SET status = 'completed', 
               complete_time = NOW(),
               actual_quantity = $1,
               efficiency_percentage = $2,
               notes = CASE WHEN $3 IS NOT NULL THEN COALESCE(notes, '') || ' | Completion: ' || $3 ELSE notes END,
               archived = true,
               updated_at = NOW()
           WHERE id = $4`,
          [finalQuantity, efficiency, notes, id]
        );
        
        // Update machine status if assigned
        if (orderData.machine_id) {
          await client.query(
            'UPDATE machines SET status = $1, updated_at = NOW() WHERE id = $2',
            ['available', orderData.machine_id]
          );
        }
        
        return { 
          orderId: id,
          orderNumber: orderData.order_number,
          actualQuantity: finalQuantity,
          efficiency: efficiency
        };
      });
      
      broadcast('order_completed', {
        id: result.orderId,
        order_number: result.orderNumber,
        actual_quantity: result.actualQuantity,
        efficiency: result.efficiency,
        completed_by: req.user.username
      });
      
      return apiResponse(res, {
        efficiency: result.efficiency,
        actual_quantity: result.actualQuantity
      }, 'Production completed successfully');
    } catch (error) {
      return handleError(res, error, 'Complete production');
    }
  }
);

// Machine management with proper validation
app.get('/api/machines', authenticateToken, async (req, res) => {
  try {
    const { environment } = req.query;
    let query = 'SELECT * FROM machines';
    const params = [];
    
    if (environment) {
      query += ' WHERE environment = $1';
      params.push(environment);
    }
    
    query += ' ORDER BY name';
    
    const machines = await dbAll(query, params);
    return apiResponse(res, machines, 'Machines retrieved successfully');
  } catch (error) {
    return handleError(res, error, 'Get machines');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return apiResponse(res, null, 'File too large', 400);
    }
    return apiResponse(res, null, 'File upload error', 400);
  }
  
  return apiResponse(res, null, 'Internal server error', 500);
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(async () => {
    // Close database pool
    try {
      await pool.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
    
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 5)}...`);
  console.log(`🐘 PostgreSQL Database: ENABLED`);
  console.log(`🔒 Enhanced Security: ENABLED`);
  console.log(`⚡ Performance Optimizations: ENABLED`);
});

module.exports = app;