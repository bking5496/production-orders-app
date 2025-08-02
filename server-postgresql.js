// server-postgresql.js - PostgreSQL-enabled Express Backend Server
// Supports both SQLite (legacy) and PostgreSQL with environment toggle

require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const xlsx = require('xlsx');
const { body, validationResult } = require('express-validator');

// Database Configuration - Support both SQLite and PostgreSQL
const DB_TYPE = process.env.DB_TYPE || 'sqlite';
console.log(`🔧 Database type: ${DB_TYPE}`);

let dbModule;
if (DB_TYPE === 'postgresql') {
    console.log('🐘 Loading PostgreSQL database module...');
    dbModule = require('./postgresql/db-postgresql');
} else {
    console.log('📁 Loading SQLite database module...');
    const sqlite3 = require('sqlite3').verbose();
    const DATABASE_PATH = process.env.DATABASE_PATH || './production.db';
    
    // SQLite connection setup (legacy)
    const db = new sqlite3.Database(DATABASE_PATH, (err) => {
        if (err) {
            console.error('Database connection error:', err);
            process.exit(1);
        }
        console.log('✅ Connected to SQLite database');
        
        // Enable foreign key constraints for data integrity
        db.run('PRAGMA foreign_keys = ON;', (err) => {
            if (err) {
                console.error('Failed to enable foreign keys:', err);
            } else {
                console.log('✅ Foreign key constraints enabled');
            }
        });
    });

    // SQLite promise wrappers
    const dbRun = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    };
    
    const dbGet = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    };
    
    const dbAll = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    };

    // SQLite timezone utilities (legacy)
    const getServerTimestamp = () => "datetime('now')";
    const convertToSAST = (utcDate) => {
        const date = new Date(utcDate);
        return new Date(date.getTime() + (2 * 60 * 60 * 1000));
    };
    const convertSASTToUTC = (sastDate) => {
        const date = new Date(sastDate);
        return new Date(date.getTime() - (2 * 60 * 60 * 1000));
    };

    dbModule = { dbRun, dbGet, dbAll, getServerTimestamp, convertToSAST, convertSASTToUTC };
}

// Extract database functions
const { dbRun, dbGet, dbAll, getServerTimestamp, convertToSAST, convertSASTToUTC, dbClose } = dbModule;

// Load timezone utilities based on database type
let timeUtils;
if (DB_TYPE === 'postgresql') {
    timeUtils = require('./postgresql/time-postgresql');
} else {
    timeUtils = require('./src/js/utils/timezone');
}

// --- Multer setup for file uploads ---
const upload = multer({ storage: multer.memoryStorage() });

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// --- Initialization ---
const app = express();
const server = http.createServer(app);

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ server });

// --- Middleware Configuration ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
        }
    }
}));

app.use(compression());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://oracles.africa', 'https://www.oracles.africa'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Database Health Check Endpoint ---
app.get('/api/health', async (req, res) => {
    try {
        if (DB_TYPE === 'postgresql') {
            await dbGet('SELECT NOW() as timestamp, version() as db_version');
        } else {
            await dbGet('SELECT datetime("now") as timestamp, sqlite_version() as db_version');
        }
        
        res.json({
            status: 'healthy',
            database: DB_TYPE,
            timestamp: new Date().toISOString(),
            timezone: process.env.TZ || 'Africa/Johannesburg'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({ 
            status: 'unhealthy', 
            error: error.message,
            database: DB_TYPE 
        });
    }
});

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Token verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// --- WebSocket Authentication ---
const authenticateWebSocket = (ws, token) => {
    return new Promise((resolve, reject) => {
        if (!token) {
            return reject(new Error('No token provided'));
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return reject(new Error('Invalid token'));
            }
            resolve(decoded);
        });
    });
};

// WebSocket connection handling
const connectedClients = new Map();

wss.on('connection', async (ws, req) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        const user = await authenticateWebSocket(ws, token);
        ws.userId = user.userId;
        ws.role = user.role;
        ws.isAlive = true;
        
        connectedClients.set(ws.userId, ws);
        
        console.log(`👤 User ${user.userId} (${user.role}) connected via WebSocket`);
        
        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connected to Production System',
            user: { id: user.userId, role: user.role },
            database: DB_TYPE
        }));

        // Handle WebSocket messages
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                console.log('📨 WebSocket message:', data);
                
                // Handle different message types
                switch (data.type) {
                    case 'ping':
                        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                        break;
                    case 'subscribe':
                        // Handle room subscriptions
                        ws.room = data.room;
                        console.log(`🔔 User ${ws.userId} subscribed to room: ${data.room}`);
                        break;
                    default:
                        console.log('Unknown WebSocket message type:', data.type);
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            connectedClients.delete(ws.userId);
            console.log(`👋 User ${ws.userId} disconnected from WebSocket`);
        });

        // Heartbeat
        ws.on('pong', () => {
            ws.isAlive = true;
        });

    } catch (error) {
        console.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Authentication failed');
    }
});

// Heartbeat interval
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Broadcast function for real-time updates
const broadcastToClients = (data, room = null) => {
    const message = JSON.stringify(data);
    let sentCount = 0;
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            // Send to specific room or all clients
            if (!room || client.room === room) {
                client.send(message);
                sentCount++;
            }
        }
    });
    
    console.log(`📡 Broadcast sent to ${sentCount} clients${room ? ` in room: ${room}` : ''}`);
};

// --- API Routes ---

// Authentication routes
app.post('/api/auth/login', [
    body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        const user = await dbGet('SELECT * FROM users WHERE username = ? AND is_active = ?', [username, true]);
        
        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        if (DB_TYPE === 'postgresql') {
            await dbRun('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        } else {
            await dbRun('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            },
            token,
            database: DB_TYPE
        });

        // Broadcast user login
        broadcastToClients({
            type: 'user_joined',
            data: { username: user.username, role: user.role }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Continue with rest of API routes...
// [The rest of the server.js implementation would continue with all existing routes]

// --- Start Server ---
const startServer = async () => {
    try {
        // Test database connection
        if (DB_TYPE === 'postgresql') {
            await dbGet('SELECT NOW()');
            console.log('✅ PostgreSQL connection verified');
        } else {
            await dbGet('SELECT datetime("now")');
            console.log('✅ SQLite connection verified');
        }

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🔧 Database: ${DB_TYPE}`);
            console.log(`🌍 Timezone: ${process.env.TZ || 'Africa/Johannesburg'}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('⏹️ Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        if (dbClose) dbClose();
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('⏹️ Received SIGINT, shutting down gracefully...');
    server.close(() => {
        if (dbClose) dbClose();
        process.exit(0);
    });
});

startServer();