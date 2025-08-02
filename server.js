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
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:prodapp123@localhost:5432/production_orders';
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

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// PostgreSQL Database connection
console.log('🐘 Initializing PostgreSQL database connection...');

const dbModule = require('./postgresql/db-postgresql');
const { dbRun, dbGet, dbAll } = dbModule;

// PostgreSQL database interface
const db = {
    get: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        // Convert SQLite ? syntax to PostgreSQL $1, $2 syntax
        let pgSql = sql;
        let pgParams = params;
        if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                pgSql = pgSql.replace('?', `$${i + 1}`);
            }
        }
        dbGet(pgSql, pgParams).then(result => callback(null, result)).catch(callback);
    },
    all: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        // Convert SQLite ? syntax to PostgreSQL $1, $2 syntax
        let pgSql = sql;
        let pgParams = params;
        if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                pgSql = pgSql.replace('?', `$${i + 1}`);
            }
        }
        dbAll(pgSql, pgParams).then(result => callback(null, result)).catch(callback);
    },
    run: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        // Convert SQLite ? syntax to PostgreSQL $1, $2 syntax
        let pgSql = sql;
        let pgParams = params;
        if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                pgSql = pgSql.replace('?', `$${i + 1}`);
            }
        }
        dbRun(pgSql, pgParams).then(result => {
            if (callback) callback.call({lastID: result.lastID, changes: result.changes});
        }).catch(callback);
    },
    serialize: (fn) => fn(), // PostgreSQL doesn't need serialization
    close: () => {} // Handled by connection pool
};

console.log('✅ PostgreSQL database interface ready');

// Initialize database (PostgreSQL schemas already exist)
initializeDatabase();

// Database initialization
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'supervisor', 'operator', 'viewer')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )`);

    // Machines table
    db.run(`CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'in_use', 'maintenance', 'offline')),
      environment TEXT NOT NULL,
      capacity INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Production orders table
    db.run(`CREATE TABLE IF NOT EXISTS production_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      completed_quantity INTEGER DEFAULT 0,
      environment TEXT NOT NULL,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
      machine_id INTEGER,
      operator_id INTEGER,
      due_date DATE,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_time DATETIME,
      FOREIGN KEY (machine_id) REFERENCES machines(id),
      FOREIGN KEY (operator_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Production stops table
    db.run(`CREATE TABLE IF NOT EXISTS production_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      duration INTEGER,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (order_id) REFERENCES production_orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Add this to your initializeDatabase function:
    db.run(`CREATE TABLE IF NOT EXISTS production_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      duration INTEGER,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (order_id) REFERENCES production_orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    db.run(`ALTER TABLE production_orders ADD COLUMN archived BOOLEAN DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.log('Note: archived column may already exist');
      }
    });

    // Add this to your database initialization:
    db.run(`CREATE TABLE IF NOT EXISTS production_waste (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      waste_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES production_orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON production_orders(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_orders_environment ON production_orders(environment)');
    db.run('CREATE INDEX IF NOT EXISTS idx_machines_environment ON machines(environment)');

    // Create default admin user if not exists
    const defaultPassword = 'admin123';
    bcrypt.hash(defaultPassword, 10, (err, hash) => {
      if (!err) {
        db.run(
          `INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
          ['admin', 'admin@example.com', hash, 'admin'],
          (err) => {
            if (!err) {
              console.log('✅ Default admin user created (username: admin, password: admin123)');
            }
          }
        );
      }
    });
  });
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

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'subscribe':
          ws.subscriptions = data.channels || [];
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Broadcast function for WebSocket
function broadcast(type, data, channel = 'all') {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (channel === 'all' || (client.subscriptions && client.subscriptions.includes(channel))) {
        client.send(JSON.stringify({ type, data, timestamp: new Date() }));
      }
    }
  });
}

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

// Health check
app.get('/api/health', (req, res) => {
  db.get('SELECT 1', (err) => {
    if (err) {
      return res.status(500).json({ status: 'unhealthy', database: false });
    }
    res.json({ 
      status: 'healthy', 
      database: true,
      uptime: process.uptime(),
      timestamp: new Date()
    });
  });
});

// Authentication routes
app.post('/api/auth/login',
  body('username').notEmpty(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const user = await dbGet('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Update last login
      await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }
);

app.post('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
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
        `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
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
                        if (err) {
                          console.error('Failed to update stop record:', err);
                        }
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
                    
                    broadcast('order_completed', {
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
    const completedOrdersQuery = 'SELECT COUNT(*) as count FROM production_orders WHERE status = \'completed\'';
    const activeOrdersQuery = 'SELECT COUNT(*) as count FROM production_orders WHERE status = \'in_progress\'';
    
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

// Production floor overview - Main dashboard endpoint
app.get('/api/production/floor-overview', authenticateToken, async (req, res) => {
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
    
    // Get machine status summary
    const machineStatusQuery = `
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
    
    const [activeOrders, machineStatus, todayStats] = await Promise.all([
      dbAll(activeOrdersQuery),
      dbAll(machineStatusQuery),
      dbGet(todayProductionQuery)
    ]);
    
    // Calculate efficiency metrics
    const efficiency = todayStats.total_orders > 0 
      ? Math.round((todayStats.completed_orders / todayStats.total_orders) * 100)
      : 0;
    
    res.json({
      activeOrders: activeOrders || [],
      machineStatus: machineStatus || [],
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

// Quality current - High priority endpoint
app.get('/api/quality/current', authenticateToken, async (req, res) => {
  try {
    // For now, return basic quality metrics
    // This can be expanded when quality tracking is implemented
    const qualityQuery = `
      SELECT 
        COUNT(*) as total_orders,
        AVG(efficiency_percentage) as avg_efficiency,
        COUNT(CASE WHEN efficiency_percentage >= 90 THEN 1 END) as high_quality
      FROM production_orders 
      WHERE efficiency_percentage IS NOT NULL
        AND DATE(created_at) = CURRENT_DATE
    `;
    
    const quality = await dbGet(qualityQuery);
    res.json(quality || { total_orders: 0, avg_efficiency: 0, high_quality: 0 });
  } catch (error) {
    console.error('Quality current error:', error);
    res.status(500).json({ error: 'Failed to fetch quality data' });
  }
});

// Performance KPIs - Normal priority endpoint
app.get('/api/performance/kpis', authenticateToken, async (req, res) => {
  try {
    const kpiQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(quantity) as total_quantity,
        AVG(efficiency_percentage) as avg_efficiency,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        AVG(CASE WHEN complete_time IS NOT NULL AND start_time IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (complete_time - start_time)) / 3600 
             END) as avg_completion_hours
      FROM production_orders
      WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days'
    `;
    
    const kpis = await dbGet(kpiQuery);
    res.json(kpis || { 
      total_orders: 0, 
      total_quantity: 0, 
      avg_efficiency: 0, 
      completed_orders: 0, 
      avg_completion_hours: 0 
    });
  } catch (error) {
    console.error('Performance KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch performance KPIs' });
  }
});

// ================================
// LABOR MANAGEMENT API ENDPOINTS
// ================================

// Get labor assignments for planner
app.get('/api/planner/assignments', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    
    const query = `
      SELECT 
        la.id,
        la.employee_id as user_id,
        la.machine_id,
        la.assignment_date,
        la.shift_type as shift,
        la.start_time,
        la.end_time,
        la.role,
        la.hourly_rate,
        u.username,
        u.email,
        m.name as machine_name,
        m.type as machine_type
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      JOIN machines m ON la.machine_id = m.id
      ${date ? 'WHERE la.assignment_date = $1' : ''}
      ORDER BY la.assignment_date DESC, la.shift_type, m.name
    `;
    
    const params = date ? [date] : [];
    const assignments = await dbAll(query, params);
    res.json(assignments);
  } catch (error) {
    console.error('Planner assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Create labor assignment
app.post('/api/planner/assignments', authenticateToken, async (req, res) => {
  try {
    const { employee_id, machine_id, assignment_date, shift_type, start_time, end_time, role, hourly_rate } = req.body;
    const created_by = req.user.id;
    
    const query = `
      INSERT INTO labor_assignments 
      (employee_id, machine_id, assignment_date, shift_type, start_time, end_time, role, hourly_rate, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, employee_id as user_id, machine_id, assignment_date, shift_type as shift, start_time, end_time, role, hourly_rate
    `;
    
    const result = await dbGet(query, [employee_id, machine_id, assignment_date, shift_type, start_time, end_time, role, hourly_rate, created_by]);
    res.json(result);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Delete labor assignment
app.delete('/api/planner/assignments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await dbRun('DELETE FROM labor_assignments WHERE id = $1', [id]);
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// Get supervisors for specific date/shift
app.get('/api/planner/supervisors', authenticateToken, async (req, res) => {
  try {
    const { date, shift } = req.query;
    
    const query = `
      SELECT 
        ss.id,
        ss.supervisor_id,
        ss.shift_date,
        ss.shift_type as shift,
        ss.environment,
        u.username,
        u.email,
        u.role
      FROM shift_supervisors ss
      JOIN users u ON ss.supervisor_id = u.id
      ${date ? 'WHERE ss.shift_date = $1' : ''}
      ${shift && date ? 'AND ss.shift_type = $2' : shift ? 'WHERE ss.shift_type = $1' : ''}
      ORDER BY ss.shift_date DESC, ss.shift_type
    `;
    
    let params = [];
    if (date && shift) {
      params = [date, shift];
    } else if (date) {
      params = [date];
    } else if (shift) {
      params = [shift];
    }
    
    const supervisors = await dbAll(query, params);
    res.json(supervisors);
  } catch (error) {
    console.error('Supervisor fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch supervisors' });
  }
});

// Add supervisor assignment
app.post('/api/planner/supervisors', authenticateToken, async (req, res) => {
  try {
    const { supervisor_id, shift_date, shift_type, environment } = req.body;
    const created_by = req.user.id;
    
    const query = `
      INSERT INTO shift_supervisors 
      (supervisor_id, shift_date, shift_type, environment, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, supervisor_id, shift_date, shift_type as shift, environment
    `;
    
    const result = await dbGet(query, [supervisor_id, shift_date, shift_type, environment, created_by]);
    res.json(result);
  } catch (error) {
    console.error('Create supervisor assignment error:', error);
    res.status(500).json({ error: 'Failed to create supervisor assignment' });
  }
});

// Delete supervisor assignment
app.delete('/api/planner/supervisors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await dbRun('DELETE FROM shift_supervisors WHERE id = $1', [id]);
    res.json({ success: true, message: 'Supervisor assignment deleted successfully' });
  } catch (error) {
    console.error('Delete supervisor assignment error:', error);
    res.status(500).json({ error: 'Failed to delete supervisor assignment' });
  }
});

// Get machine assignments for specific date
app.get('/api/machines/:id/assignments/:date', authenticateToken, async (req, res) => {
  try {
    const { id, date } = req.params;
    
    const query = `
      SELECT 
        la.id,
        la.employee_id as user_id,
        la.assignment_date,
        la.shift_type as shift,
        la.start_time,
        la.end_time,
        la.role,
        u.username,
        u.email
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      WHERE la.machine_id = $1 AND la.assignment_date = $2
      ORDER BY la.shift_type, la.start_time
    `;
    
    const assignments = await dbAll(query, [id, date]);
    res.json(assignments);
  } catch (error) {
    console.error('Machine assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch machine assignments' });
  }
});

// Update user/worker information
app.put('/api/users/:id', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;
    
    const query = `
      UPDATE users 
      SET username = $1, email = $2, role = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, username, email, role, is_active, created_at, last_login
    `;
    
    const result = await dbGet(query, [username, email, role, id]);
    
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get roster data for labour layout
app.get('/api/labour/roster', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        lr.id,
        lr.user_id,
        lr.roster_date,
        lr.shift,
        lr.status,
        lr.check_in_time,
        lr.check_out_time,
        u.username,
        u.email,
        u.role,
        la.machine_id,
        la.role as assignment_role,
        m.name as machine_name
      FROM labor_roster lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN labor_assignments la ON la.employee_id = lr.user_id AND la.assignment_date = lr.roster_date
      LEFT JOIN machines m ON la.machine_id = m.id
      WHERE lr.roster_date = $1
      ORDER BY lr.shift, u.username
    `;
    
    const roster = await dbAll(query, [targetDate]);
    res.json(roster);
  } catch (error) {
    console.error('Roster fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch roster data' });
  }
});

// Get today's roster data (fallback)
app.get('/api/labour/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        lr.id,
        lr.user_id,
        lr.roster_date,
        lr.shift,
        lr.status,
        lr.check_in_time,
        lr.check_out_time,
        u.username,
        u.email,
        u.role
      FROM labor_roster lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.roster_date = $1
      ORDER BY lr.shift, u.username
    `;
    
    const roster = await dbAll(query, [today]);
    res.json(roster);
  } catch (error) {
    console.error('Today roster fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s roster' });
  }
});

// Verify worker attendance
app.put('/api/labour/verify/:workerId', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const { workerId } = req.params;
    const { status, check_in_time, check_out_time, notes } = req.body;
    const verified_by = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Update or insert roster record
    const upsertQuery = `
      INSERT INTO labor_roster (user_id, roster_date, status, check_in_time, check_out_time, verified_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, roster_date) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        check_in_time = EXCLUDED.check_in_time,
        check_out_time = EXCLUDED.check_out_time,
        verified_by = EXCLUDED.verified_by,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id, user_id, roster_date, status, check_in_time, check_out_time
    `;
    
    const result = await dbGet(upsertQuery, [workerId, today, status, check_in_time, check_out_time, verified_by, notes]);
    res.json(result);
  } catch (error) {
    console.error('Verify worker error:', error);
    res.status(500).json({ error: 'Failed to verify worker attendance' });
  }
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

app.get('/api/settings/profile', authenticateToken, (req, res) => {
  res.json({
    username: req.user.username,
    email: req.user.email || '',
    fullName: '',
    phone: ''
  });
});

app.put('/api/settings/profile', authenticateToken, (req, res) => {
  res.json({ success: true });
});

// Serve React app for all other routes

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
});

// Load enhanced workflow endpoints
const enhancedWorkflowEndpoints = require('./enhanced-workflow-endpoints.js');
const enhancedDowntimeEndpoints = require('./enhanced-downtime-endpoints.js');
enhancedWorkflowEndpoints(app, db, authenticateToken, requireRole, body, broadcast);
enhancedDowntimeEndpoints(app, db, authenticateToken, requireRole, body, broadcast);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 5)}...`);
  console.log(`✨ Enhanced Production Workflow: ENABLED`);
});
