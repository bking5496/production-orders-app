// server.js - Complete Express Backend Server (with all fixes)

require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const http = require('http');
const multer = require('multer');
const xlsx = require('xlsx');
const { body, validationResult } = require('express-validator');

// --- Multer setup for file uploads ---
const upload = multer({ storage: multer.memoryStorage() });

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_PATH = process.env.DATABASE_PATH || './production.db';

// --- Initialization ---
const app = express();
const server = http.createServer(app);

// --- Database Connection ---
const db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// --- Promise-based DB methods for async/await ---
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


// --- Middleware ---
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

// --- JWT & Authorization Middleware ---
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};
const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// ===========================================
//               API ROUTES
// ===========================================
const apiRouter = express.Router();

// --- Auth Routes ---
apiRouter.post('/auth/login',
  body('username').notEmpty(), body('password').notEmpty(), handleValidationErrors,
  async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
        await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({error: 'Server error during login.'});
    }
  }
);
apiRouter.post('/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ message: 'Logout successful' }); });
apiRouter.get('/auth/verify-session', authenticateToken, async (req, res) => {
    const user = await dbGet('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});

// --- User Management (Workers) ---
apiRouter.post('/workers', authenticateToken, requireRole(['admin']), 
    body('employee_code').notEmpty(), body('username').notEmpty(), body('role').notEmpty(), handleValidationErrors,
    async (req, res) => {
        const { employee_code, username, role, company, preferred_machine } = req.body;
        // For simplicity, using a default password. In a real app, this should be handled differently.
        const defaultPassword = 'password123'; 
        const password_hash = await bcrypt.hash(defaultPassword, 10);
        const email = `${username.replace(/\s+/g, '.').toLowerCase()}@example.com`;

        try {
            const result = await dbRun(`
                INSERT INTO users (employee_code, username, email, password_hash, role, company, preferred_machine)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [employee_code, username, email, password_hash, role, company, preferred_machine]);
            
            const newUser = await dbGet('SELECT id, employee_code, username as name, role, company, preferred_machine FROM users WHERE id = ?', [result.lastID]);
            res.status(201).json(newUser);
        } catch (error) {
             if (error.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ error: 'Employee Code or Username already exists.' });
            }
            res.status(500).json({ error: 'Failed to add worker' });
        }
    }
);

apiRouter.put('/workers/:id', authenticateToken, requireRole(['admin']),
    body('employee_code').notEmpty(), body('username').notEmpty(), body('role').notEmpty(), handleValidationErrors,
     async (req, res) => {
        const { id } = req.params;
        const { employee_code, username, role, company, preferred_machine } = req.body;
        
        try {
            await dbRun(`
                UPDATE users SET employee_code = ?, username = ?, role = ?, company = ?, preferred_machine = ? 
                WHERE id = ?`, 
                [employee_code, username, role, company, preferred_machine, id]
            );
            const updatedUser = await dbGet('SELECT id, employee_code, username as name, role, company, preferred_machine FROM users WHERE id = ?', [id]);
            res.json(updatedUser);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ error: 'Employee Code or Username already exists.' });
            }
            res.status(500).json({ error: 'Failed to update worker' });
        }
    }
);

apiRouter.delete('/workers/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun('DELETE FROM users WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete worker' });
    }
});

// --- User Management ---
apiRouter.get('/users', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => { res.json(await dbAll('SELECT id, username, email, role, is_active FROM users')); });
apiRouter.post('/users', authenticateToken, requireRole(['admin']),
    body('username').isLength({min: 3}), body('email').isEmail(), body('password').isLength({min: 6}), body('role').isIn(['admin', 'supervisor', 'operator', 'viewer']), handleValidationErrors,
    async (req, res) => {
        const { username, email, password, role } = req.body;
        const hash = await bcrypt.hash(password, 10);
        try {
            const result = await dbRun('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)', [username, email, hash, role]);
            res.status(201).json({id: result.lastID, message: 'User created.'});
        } catch (err) {
            res.status(400).json({error: 'Username or email already exists.'});
        }
    }
);
apiRouter.put('/users/:id', authenticateToken, requireRole(['admin']),
    body('email').isEmail(), body('role').isIn(['admin', 'supervisor', 'operator', 'viewer']), handleValidationErrors,
    async (req, res) => {
        await dbRun('UPDATE users SET email = ?, role = ? WHERE id = ?', [req.body.email, req.body.role, req.params.id]);
        res.json({message: 'User updated.'});
    }
);
apiRouter.delete('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({message: 'User deleted.'});
});

// --- Machine Management ---
apiRouter.get('/machines', authenticateToken, async (req, res) => { res.json(await dbAll('SELECT * FROM machines')); });
apiRouter.post('/machines', authenticateToken, requireRole(['admin', 'supervisor']),
    body('name').notEmpty(), body('type').notEmpty(), body('environment').notEmpty(), body('capacity').isInt({min: 1}), handleValidationErrors,
    async (req, res) => {
        const { name, type, environment, capacity } = req.body;
        const result = await dbRun('INSERT INTO machines (name, type, environment, capacity) VALUES (?, ?, ?, ?)', [name, type, environment, capacity]);
        res.status(201).json({id: result.lastID, message: 'Machine created.'});
    }
);
apiRouter.put('/machines/:id', authenticateToken, requireRole(['admin', 'supervisor']),
    body('name').notEmpty(), body('type').notEmpty(), body('environment').notEmpty(), body('capacity').isInt({min: 1}), handleValidationErrors,
    async (req, res) => {
        await dbRun('UPDATE machines SET name = ?, type = ?, environment = ?, capacity = ? WHERE id = ?', [req.body.name, req.body.type, req.body.environment, req.body.capacity, req.params.id]);
        res.json({message: 'Machine updated.'});
    }
);
apiRouter.delete('/machines/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    await dbRun('DELETE FROM machines WHERE id = ?', [req.params.id]);
    res.json({message: 'Machine deleted.'});
});
apiRouter.patch('/machines/:id/status', authenticateToken, requireRole(['admin', 'supervisor']),
    body('status').isIn(['available', 'maintenance', 'offline']), handleValidationErrors,
    async (req, res) => {
        await dbRun('UPDATE machines SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({message: 'Status updated.'});
    }
);

// --- Order Management ---
apiRouter.get('/orders', authenticateToken, async (req, res) => {
    const orders = await dbAll(`SELECT o.*, m.name as machine_name FROM production_orders o LEFT JOIN machines m ON o.machine_id = m.id WHERE o.archived = 0 ORDER BY created_at DESC`);
    res.json(orders);
});
apiRouter.post('/orders', authenticateToken, requireRole(['admin', 'supervisor']),
    body('order_number').notEmpty(), body('product_name').notEmpty(), body('quantity').isInt({min: 1}), handleValidationErrors,
    async (req, res) => {
        const { order_number, product_name, quantity, environment, priority, due_date, notes } = req.body;
        const result = await dbRun('INSERT INTO production_orders (order_number, product_name, quantity, environment, priority, due_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [order_number, product_name, quantity, environment, priority, due_date, notes, req.user.id]);
        res.status(201).json({id: result.lastID, message: 'Order created.'});
    }
);
apiRouter.delete('/orders/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    await dbRun('DELETE FROM production_orders WHERE id = ?', [req.params.id]);
    res.json({message: 'Order deleted.'});
});

// --- Environment Management ---
apiRouter.get('/environments', authenticateToken, async (req, res) => {
    try {
        const environments = await dbAll(`
            SELECT 
                id,
                name,
                code,
                description,
                color,
                machine_types,
                created_at
            FROM environments 
            ORDER BY name
        `);
        
        // Parse machine_types JSON if it exists
        const parsedEnvironments = environments.map(row => ({
            ...row,
            machine_types: row.machine_types ? JSON.parse(row.machine_types) : []
        }));
        
        res.json(parsedEnvironments);
    } catch (error) {
        console.error('Environment fetch error:', error);
        // Fallback to distinct machines if environments table doesn't exist
        try {
            const fallbackEnvironments = await dbAll('SELECT DISTINCT environment as name FROM machines ORDER BY environment');
            res.json(fallbackEnvironments.map(r => ({ name: r.name })));
        } catch (fallbackError) {
            res.status(500).json({ error: 'Database error' });
        }
    }
});

apiRouter.post('/environments', authenticateToken, requireRole(['admin', 'supervisor']),
    body('name').notEmpty().trim(),
    body('code').optional().trim(),
    body('description').optional().trim(),
    body('color').optional().isIn(['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'indigo']),
    body('machine_types').optional().isArray(),
    handleValidationErrors,
    async (req, res) => {
        const { name, code, description, color, machine_types } = req.body;

        try {
            const result = await dbRun(`
                INSERT INTO environments (name, code, description, color, machine_types, created_at) 
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                name, 
                code || name.toLowerCase().replace(/\s+/g, '_'), 
                description || '', 
                color || 'blue', 
                JSON.stringify(machine_types || [])
            ]);
            
            res.json({ 
                id: result.lastID, 
                message: 'Environment created successfully' 
            });
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Environment name already exists' });
            }
            console.error('Environment creation error:', error);
            res.status(500).json({ error: 'Failed to create environment' });
        }
    }
);

apiRouter.put('/environments/:id', authenticateToken, requireRole(['admin', 'supervisor']),
    body('name').notEmpty().trim(),
    body('code').optional().trim(),
    body('description').optional().trim(),
    body('color').optional().isIn(['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'indigo']),
    body('machine_types').optional().isArray(),
    handleValidationErrors,
    async (req, res) => {
        const { id } = req.params;
        const { name, code, description, color, machine_types } = req.body;

        try {
            const result = await dbRun(`
                UPDATE environments 
                SET name = ?, code = ?, description = ?, color = ?, machine_types = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                name, 
                code || name.toLowerCase().replace(/\s+/g, '_'), 
                description || '', 
                color || 'blue', 
                JSON.stringify(machine_types || []),
                id
            ]);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Environment not found' });
            }
            
            res.json({ message: 'Environment updated successfully' });
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Environment name already exists' });
            }
            console.error('Environment update error:', error);
            res.status(500).json({ error: 'Failed to update environment' });
        }
    }
);

apiRouter.delete('/environments/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    try {
        // Check if environment is being used by machines
        const result = await dbGet(`
            SELECT COUNT(*) as machine_count 
            FROM machines 
            WHERE environment = (SELECT name FROM environments WHERE id = ?)
        `, [id]);
        
        if (result && result.machine_count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete environment that is being used by machines' 
            });
        }
        
        const deleteResult = await dbRun('DELETE FROM environments WHERE id = ?', [id]);
        
        if (deleteResult.changes === 0) {
            return res.status(404).json({ error: 'Environment not found' });
        }
        
        res.json({ message: 'Environment deleted successfully' });
    } catch (error) {
        console.error('Environment deletion error:', error);
        res.status(500).json({ error: 'Failed to delete environment' });
    }
});

// --- Production Actions & Monitoring ---
apiRouter.post('/orders/:id/start',
    authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    body('machine_id').isInt().withMessage('A valid machine ID is required'), handleValidationErrors,
    async (req, res) => {
        const orderId = req.params.id;
        const { machine_id } = req.body;
        const operatorId = req.user.id;
        try {
            await dbRun('BEGIN TRANSACTION');
            const orderUpdate = await dbRun(`UPDATE production_orders SET status = 'in_progress', machine_id = ?, operator_id = ?, start_time = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`, [machine_id, operatorId, orderId]);
            if (orderUpdate.changes === 0) throw new Error('Order not available to start.');
            const machineUpdate = await dbRun('UPDATE machines SET status = "in_use" WHERE id = ? AND status = "available"', [machine_id]);
            if (machineUpdate.changes === 0) throw new Error('Machine not available.');
            await dbRun('COMMIT');
            res.json({ message: 'Production started successfully.' });
        } catch (error) {
            await dbRun('ROLLBACK');
            res.status(400).json({ error: error.message });
        }
    }
);
apiRouter.post('/orders/:id/pause', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    body('reason').notEmpty(), handleValidationErrors,
    async (req, res) => {
        const { reason, notes } = req.body;
        await dbRun(`UPDATE production_orders SET status = 'paused', stop_reason = ? WHERE id = ? AND status = 'in_progress'`, [reason, req.params.id]);
        await dbRun('INSERT INTO production_stops (order_id, reason, notes) VALUES (?, ?, ?)', [req.params.id, reason, notes]);
        res.json({message: 'Production paused.'});
    }
);
apiRouter.post('/orders/:id/resume', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    async (req, res) => {
        await dbRun(`UPDATE production_orders SET status = 'in_progress' WHERE id = ? AND status = 'paused'`, [req.params.id]);
        await dbRun(`UPDATE production_stops SET end_time = CURRENT_TIMESTAMP, duration = CAST((julianday('now') - julianday(start_time)) * 24 * 60 AS INTEGER) WHERE order_id = ? AND end_time IS NULL`, [req.params.id]);
        res.json({message: 'Production resumed.'});
    }
);
apiRouter.post('/orders/:id/complete', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    body('actual_quantity').isInt({min: 0}), handleValidationErrors,
    async (req, res) => {
        const order = await dbGet('SELECT quantity, machine_id FROM production_orders WHERE id = ? AND status IN ("in_progress", "paused")', [req.params.id]);
        if (!order) return res.status(400).json({error: 'Order not in a completable state.'});
        const efficiency = (req.body.actual_quantity / order.quantity) * 100;
        await dbRun(`UPDATE production_orders SET status = 'completed', actual_quantity = ?, complete_time = CURRENT_TIMESTAMP, efficiency_percentage = ?, archived = 1 WHERE id = ?`, [req.body.actual_quantity, efficiency, req.params.id]);
        await dbRun('UPDATE machines SET status = "available" WHERE id = ?', [order.machine_id]);
        res.json({message: 'Order completed.'});
    }
);
apiRouter.get('/production/active', authenticateToken, async (req, res) => { res.json(await dbAll(`SELECT o.*, m.name as machine_name FROM production_orders o LEFT JOIN machines m ON o.machine_id = m.id WHERE o.status IN ('in_progress', 'paused', 'stopped') AND o.archived = 0`)); });
apiRouter.get('/production/stats', authenticateToken, async (req, res) => {
    const stats = await dbGet(`SELECT COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_orders, COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped_orders, AVG(efficiency_percentage) as avg_efficiency FROM production_orders WHERE archived = 0`);
    const machineStats = await dbGet(`SELECT COUNT(*) as total_machines, COUNT(CASE WHEN status = 'in_use' THEN 1 END) as machines_in_use FROM machines`);
    res.json({ ...stats, ...machineStats, avg_efficiency: stats.avg_efficiency || 0 });
});
apiRouter.patch('/orders/:id/quantity', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    body('actual_quantity').isInt({min: 0}), handleValidationErrors,
    async (req, res) => {
        await dbRun('UPDATE production_orders SET actual_quantity = ? WHERE id = ? AND status = "in_progress"', [req.body.actual_quantity, req.params.id]);
        res.json({message: 'Quantity updated.'});
    }
);

apiRouter.get('/production/floor-overview', authenticateToken, async (req, res) => {
    const query = `
        SELECT
            m.*,
            o.id as order_id,
            o.order_number,
            o.product_name,
            o.start_time
        FROM machines m
        LEFT JOIN production_orders o ON m.id = o.machine_id AND o.status IN ('in_progress', 'paused')
        ORDER BY m.environment, m.name
    `;
    const overviewData = await dbAll(query);
    res.json(overviewData);
});


apiRouter.patch('/orders/:id/quantity', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    body('actual_quantity').isInt({min: 0}), handleValidationErrors,
    async (req, res) => {
        await dbRun('UPDATE production_orders SET actual_quantity = ? WHERE id = ? AND status = "in_progress"', [req.body.actual_quantity, req.params.id]);
        res.json({message: 'Quantity updated.'});
    }
);

// --- Analytics ---
apiRouter.get('/analytics/summary', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
    const { start_date, end_date } = req.query;
    const summary = await dbGet(`SELECT COUNT(*) as total_orders, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders FROM production_orders WHERE created_at BETWEEN ? AND ?`, [start_date, end_date]);
    res.json({ summary });
});

apiRouter.get('/analytics/downtime',
    authenticateToken,
    requireRole(['admin', 'supervisor']),
    (req, res) => {
        const { start_date, end_date } = req.query;

        // Default to a wide range if no dates are provided
        const startDate = start_date ? new Date(start_date).toISOString() : new Date(0).toISOString();
        const endDate = end_date ? new Date(end_date).toISOString() : new Date().toISOString();

        const downtimeQuery = `
            SELECT
                reason,
                SUM(duration) as total_duration_minutes
            FROM production_stops
            WHERE start_time BETWEEN ? AND ? AND duration IS NOT NULL
            GROUP BY reason
            ORDER BY total_duration_minutes DESC
        `;

        db.all(downtimeQuery, [startDate, endDate], (err, rows) => {
            if (err) {
                console.error("Downtime analytics error:", err);
                return res.status(500).json({ error: 'Failed to fetch downtime data' });
            }

            // Format the data for the chart
            const downtimeByReason = rows.reduce((acc, row) => {
                acc[row.reason] = row.total_duration_minutes;
                return acc;
            }, {});

            res.json(downtimeByReason);
        });
    }
);

// --- Settings Routes ---
apiRouter.get('/settings/profile', authenticateToken, async (req, res) => {
    const user = await dbGet('SELECT username, email, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User profile not found.' });
    res.json(user);
});

apiRouter.put('/settings/profile',
    authenticateToken,
    body('email').isEmail().withMessage('A valid email is required.'),
    body('fullName').optional({ checkFalsy: true }).trim(),
    body('phone').optional({ checkFalsy: true }).trim(),
    handleValidationErrors,
    async (req, res) => {
        const { email, fullName, phone } = req.body;
        await dbRun('UPDATE users SET email = ?, fullName = ?, phone = ? WHERE id = ?', [email, fullName, phone, req.user.id]);
        res.json({ message: 'Profile updated successfully.' });
    }
);

apiRouter.post('/settings/change-password',
    authenticateToken,
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
    handleValidationErrors,
    async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const user = await dbGet('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password.' });

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHashedPassword, req.user.id]);
        res.json({ message: 'Password changed successfully.' });
    }
);

// ** ADD THESE NEW SYSTEM SETTINGS ROUTES **
apiRouter.get('/settings/system', authenticateToken, requireRole(['admin']), async (req, res) => {
    const settingsRows = await dbAll('SELECT key, value FROM system_settings');
    const settings = settingsRows.reduce((acc, row) => {
        try {
            acc[row.key] = JSON.parse(row.value);
        } catch {
            acc[row.key] = row.value;
        }
        return acc;
    }, {});
    res.json(settings);
});

apiRouter.put('/settings/system', authenticateToken, requireRole(['admin']), async (req, res) => {
    const settings = req.body;
    try {
        await dbRun('BEGIN TRANSACTION');
        for (const [key, value] of Object.entries(settings)) {
            await dbRun(
                'INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
                [key, JSON.stringify(value)]
            );
        }
        await dbRun('COMMIT');
        res.json({ message: 'System settings updated successfully.' });
    } catch (error) {
        await dbRun('ROLLBACK');
        res.status(500).json({ error: 'Failed to update system settings.' });
    }
});

// --- Labour Layout Routes ---

apiRouter.get('/labour/today', authenticateToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const workers = await dbAll('SELECT * FROM daily_attendance WHERE attendance_date = ? ORDER BY name', [today]);
        res.json(workers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch daily roster.' });
    }
});

apiRouter.post('/labour/upload', authenticateToken, upload.single('rosterFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const currentHour = new Date().getHours();
        const shift = (currentHour >= 6 && currentHour < 18) ? 'Dayshift' : 'Nightshift';

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const roster = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        await dbRun('DELETE FROM daily_attendance WHERE attendance_date = ?', [today]);

        const stmt = db.prepare('INSERT INTO daily_attendance (attendance_date, employee_code, name, production_area, position, company, shift, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const worker of roster) {
            stmt.run(
                today,
                worker['Employee Code'],
                worker['Name'],
                worker['Production Area'],
                worker['Position'],
                worker['Company'],
                shift, // Auto-populated shift
                'pending'
            );
        }
        await new Promise((resolve, reject) => stmt.finalize(err => err ? reject(err) : resolve()));
        
        res.json({ message: `${roster.length} workers uploaded for today's ${shift} roster.` });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: 'Failed to process roster file. Ensure columns are correct.' });
    }
});

apiRouter.put('/labour/verify/:id', authenticateToken, async (req, res) => {
    try {
        const result = await dbRun('UPDATE daily_attendance SET status = "present" WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Worker not found.' });
        res.json({ message: 'Worker verified.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify worker.' });
    }
});

apiRouter.get('/labour/export', authenticateToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const workers = await dbAll(`
        SELECT 
            employee_code as "Employee Code", 
            name as "Name", 
            production_area as "Production Area",
            position as "Position",
            company as "Company",
            shift as "Shift",
            status as "Attended" 
        FROM daily_attendance WHERE attendance_date = ?`, [today]);
    
    const worksheet = xlsx.utils.json_to_sheet(workers);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader("Content-Disposition", `attachment; filename="attendance-report-${today}.xlsx"`);
    res.end(xlsx.write(workbook, { type: "buffer", bookType: "xlsx" }));
});

// --- Labor Planner Routes ---
apiRouter.get('/planner/assignments', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date is required' });
        
        // Corrected SQL Query
        const assignments = await dbAll(`
            SELECT 
                la.id, 
                la.user_id as employee_id, 
                la.machine_id, 
                la.assignment_date, 
                la.shift, 
                la.status,
                u.username, 
                u.fullName,
                m.name as machine_name, 
                u.employee_code, 
                u.role
            FROM labor_assignments la
            JOIN users u ON la.user_id = u.id
            JOIN machines m ON la.machine_id = m.id
            WHERE la.assignment_date = ?
        `, [date]);

        res.json(assignments);
    } catch (error) {
        console.error("Error fetching assignments:", error);
        res.status(500).json({ error: 'Database error fetching assignments' });
    }
});

apiRouter.post('/planner/assignments', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
        const { employee_id, machine_id, shift, assignment_date } = req.body;
        console.log('Assignment request data:', { employee_id, machine_id, shift, assignment_date });
        console.log('User role:', req.user?.role);
        
        // Validate required fields
        if (!employee_id || !machine_id || !shift || !assignment_date) {
            return res.status(400).json({ error: 'Missing required fields: employee_id, machine_id, shift, assignment_date' });
        }
        
        const params = [employee_id, employee_id, machine_id, shift, assignment_date, 'planned'];
        console.log('SQL parameters:', params);
        const result = await dbRun(
            'INSERT INTO labor_assignments (user_id, employee_id, machine_id, shift, assignment_date, status) VALUES (?, ?, ?, ?, ?, ?)',
            params
        );
        console.log('Assignment created with ID:', result.lastID);
        
        const newAssignment = await dbGet('SELECT * FROM labor_assignments WHERE id = ?', [result.lastID]);
        res.status(201).json(newAssignment);
    } catch (error) {
        console.error("Error creating assignment - Full error:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        res.status(500).json({ error: `Failed to create assignment: ${error.message}` });
    }
});

apiRouter.patch('/planner/assignments/:id', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
        const { status } = req.body;
        const result = await dbRun('UPDATE labor_assignments SET status = ? WHERE id = ?', [status, req.params.id]);
        if (result.changes === 0) return res.status(404).json({error: "Assignment not found"});
        res.json({ message: 'Attendance updated' });
    } catch (error) {
        console.error("Error updating attendance:", error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
});

apiRouter.delete('/planner/assignments/:id', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM labor_assignments WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({error: "Assignment not found"});
        res.json({ message: 'Assignment removed' });
    } catch (error) {
        console.error("Error removing assignment:", error);
        res.status(500).json({ error: 'Failed to remove assignment' });
    }
});







app.use('/api', apiRouter);

// --- Serve Frontend ---
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, 'dist');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// --- Start Server ---
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
