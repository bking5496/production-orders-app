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

// SAST Timezone Utility Functions
// South African Standard Time is UTC+2 year-round (no daylight saving)
// Use SQLite datetime functions for consistent SAST timestamps
const getServerTimestamp = () => {
    // Use server time directly
    return "datetime('now')";
};

const convertToSAST = (utcDate) => {
    const date = new Date(utcDate);
    return new Date(date.getTime() + (2 * 60 * 60 * 1000));
};

const convertSASTToUTC = (sastDate) => {
    const date = new Date(sastDate);
    return new Date(date.getTime() - (2 * 60 * 60 * 1000));
};

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

// Helper function to categorize stop reasons for reporting
const getCategoryFromReason = (reason) => {
    const categories = {
        machine_breakdown: 'Equipment',
        material_shortage: 'Material',
        quality_issue: 'Quality',
        operator_break: 'Planned',
        shift_change: 'Planned',
        maintenance: 'Maintenance',
        safety_incident: 'Safety',
        power_outage: 'Utilities',
        other: 'Other'
    };
    return categories[reason] || 'Other';
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
        // Update last login with SAST time
        await dbRun("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);
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
        const { name, type, environment, capacity, production_rate } = req.body;
        const result = await dbRun('INSERT INTO machines (name, type, environment, capacity, production_rate) VALUES (?, ?, ?, ?, ?)', 
            [name, type, environment, capacity, production_rate || null]);
        res.status(201).json({id: result.lastID, message: 'Machine created.'});
    }
);
apiRouter.put('/machines/:id', authenticateToken, requireRole(['admin', 'supervisor']),
    body('name').notEmpty(), body('type').notEmpty(), body('environment').notEmpty(), body('capacity').isInt({min: 1}), handleValidationErrors,
    async (req, res) => {
        const { name, type, environment, capacity, production_rate, shift_cycle_enabled, cycle_start_date, 
                operators_per_shift, hopper_loaders_per_shift, packers_per_shift } = req.body;
        
        await dbRun(`
            UPDATE machines 
            SET name = ?, type = ?, environment = ?, capacity = ?, production_rate = ?, 
                shift_cycle_enabled = ?, cycle_start_date = ?, 
                operators_per_shift = ?, hopper_loaders_per_shift = ?, packers_per_shift = ?
            WHERE id = ?
        `, [name, type, environment, capacity, production_rate || null, 
            shift_cycle_enabled ? 1 : 0, cycle_start_date || null,
            operators_per_shift === '' ? null : (operators_per_shift ?? 2), 
            hopper_loaders_per_shift === '' ? null : (hopper_loaders_per_shift ?? 1), 
            packers_per_shift === '' ? null : (packers_per_shift ?? 3), 
            req.params.id]);
        
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

// --- Machine Crew Management ---
// Get crews for a specific machine
apiRouter.get('/machines/:id/crews', authenticateToken, async (req, res) => {
    try {
        const crews = await dbAll(`
            SELECT id, crew_letter, cycle_offset, employees, is_active, created_date
            FROM machine_crews 
            WHERE machine_id = ? AND is_active = 1
            ORDER BY crew_letter
        `, [req.params.id]);
        
        // Parse JSON employees field
        const crewsWithEmployees = crews.map(crew => ({
            ...crew,
            employees: crew.employees ? JSON.parse(crew.employees) : []
        }));
        
        res.json(crewsWithEmployees);
    } catch (error) {
        console.error('Error fetching machine crews:', error);
        res.status(500).json({ error: 'Failed to fetch machine crews' });
    }
});

// Save/update crews for a specific machine
apiRouter.post('/machines/:id/crews', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
        const machineId = req.params.id;
        const crews = req.body; // Array of crew objects
        
        // Validate crews array
        if (!Array.isArray(crews)) {
            return res.status(400).json({ error: 'Crews must be an array' });
        }
        
        // Start transaction
        await dbRun('BEGIN TRANSACTION');
        
        try {
            // Delete existing crews for this machine
            await dbRun('DELETE FROM machine_crews WHERE machine_id = ?', [machineId]);
            
            // Insert new crews
            for (const crew of crews) {
                const { letter, crew_letter, offset, cycle_offset, employees } = crew;
                
                // Handle both frontend formats (letter/crew_letter, offset/cycle_offset)
                const crewLetter = letter || crew_letter;
                const crewOffset = offset !== undefined ? offset : cycle_offset;
                
                if (!['A', 'B', 'C'].includes(crewLetter)) {
                    throw new Error(`Invalid crew letter: ${crewLetter}`);
                }
                
                if (![0, 2, 4].includes(crewOffset)) {
                    throw new Error(`Invalid cycle offset: ${crewOffset}`);
                }
                
                await dbRun(`
                    INSERT INTO machine_crews 
                    (machine_id, crew_letter, cycle_offset, employees, created_by)
                    VALUES (?, ?, ?, ?, ?)
                `, [machineId, crewLetter, crewOffset, JSON.stringify(employees || []), req.user.id]);
            }
            
            // Commit transaction
            await dbRun('COMMIT');
            
            res.json({ message: 'Crews saved successfully' });
        } catch (error) {
            // Rollback on error
            await dbRun('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error saving machine crews:', error);
        res.status(500).json({ error: `Failed to save crews: ${error.message}` });
    }
});

// Get shift assignments for a machine on a specific date
apiRouter.get('/machines/:id/assignments/:date', authenticateToken, async (req, res) => {
    try {
        const { id: machineId, date } = req.params;
        
        // Get machine cycle settings
        const machine = await dbGet(`
            SELECT shift_cycle_enabled, cycle_start_date, crew_size
            FROM machines 
            WHERE id = ?
        `, [machineId]);
        
        if (!machine?.shift_cycle_enabled || !machine.cycle_start_date) {
            return res.json({ enabled: false, assignments: [] });
        }
        
        // Get crews for this machine
        const crews = await dbAll(`
            SELECT crew_letter, cycle_offset, employees
            FROM machine_crews 
            WHERE machine_id = ? AND is_active = 1
            ORDER BY crew_letter
        `, [machineId]);
        
        // Calculate assignments for the given date
        const startDate = new Date(machine.cycle_start_date);
        const targetDate = new Date(date);
        const daysSinceStart = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
        
        const assignments = crews.map(crew => {
            const cycleDay = (daysSinceStart + crew.cycle_offset) % 6;
            let shiftType;
            
            if (cycleDay === 0 || cycleDay === 1) shiftType = 'day';
            else if (cycleDay === 2 || cycleDay === 3) shiftType = 'night';
            else shiftType = 'rest';
            
            return {
                crew_letter: crew.crew_letter,
                shift_type: shiftType,
                employees: JSON.parse(crew.employees || '[]')
            };
        });
        
        res.json({
            enabled: true,
            machine_id: machineId,
            date,
            assignments,
            crew_size: machine.crew_size
        });
    } catch (error) {
        console.error('Error getting machine assignments:', error);
        res.status(500).json({ error: 'Failed to get machine assignments' });
    }
});

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
            // Create environment with SAST timestamp
            const result = await dbRun(`
                INSERT INTO environments (name, code, description, color, machine_types, created_at) 
                VALUES (?, ?, ?, ?, ?, datetime('now'))
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
            // Update environment with SAST timestamp
            const result = await dbRun(`
                UPDATE environments 
                SET name = ?, code = ?, description = ?, color = ?, machine_types = ?, updated_at = datetime('now')
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
            // Create SAST timestamp for production start
            const orderUpdate = await dbRun(`UPDATE production_orders SET status = 'in_progress', machine_id = ?, operator_id = ?, start_time = datetime('now') WHERE id = ? AND status = 'pending'`, [machine_id, operatorId, orderId]);
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
apiRouter.post('/orders/:id/stop', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    body('reason').notEmpty(), handleValidationErrors,
    async (req, res) => {
        const { reason, notes } = req.body;
        // Stop production with SAST timestamp and enhanced tracking
        await dbRun(`UPDATE production_orders SET status = 'stopped', stop_reason = ? WHERE id = ? AND status = 'in_progress'`, [reason, req.params.id]);
        await dbRun("INSERT INTO production_stops (order_id, reason, notes, start_time, category, operator_id) VALUES (?, ?, ?, datetime('now'), ?, ?)", 
            [req.params.id, reason, notes, getCategoryFromReason(reason), req.user.id]);
        res.json({message: 'Production stopped.'});
    }
);
apiRouter.post('/orders/:id/resume', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    async (req, res) => {
        await dbRun(`UPDATE production_orders SET status = 'in_progress' WHERE id = ? AND status = 'stopped'`, [req.params.id]);
        // Resume production with SAST timestamp and calculate downtime
        await dbRun(`UPDATE production_stops SET end_time = datetime('now'), duration = CAST((julianday(datetime('now')) - julianday(start_time)) * 24 * 60 AS INTEGER), resolved_by = ? WHERE order_id = ? AND end_time IS NULL`, [req.user.id, req.params.id]);
        res.json({message: 'Production resumed.'});
    }
);
apiRouter.post('/orders/:id/complete', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    body('actual_quantity').isInt({min: 0}), handleValidationErrors,
    async (req, res) => {
        const order = await dbGet('SELECT quantity, machine_id FROM production_orders WHERE id = ? AND status IN ("in_progress", "stopped")', [req.params.id]);
        if (!order) return res.status(400).json({error: 'Order not in a completable state.'});
        const efficiency = (req.body.actual_quantity / order.quantity) * 100;
        // Complete order with SAST timestamp
        await dbRun(`UPDATE production_orders SET status = 'completed', actual_quantity = ?, complete_time = datetime('now'), efficiency_percentage = ?, archived = 1 WHERE id = ?`, [req.body.actual_quantity, efficiency, req.params.id]);
        await dbRun('UPDATE machines SET status = "available" WHERE id = ?', [order.machine_id]);
        res.json({message: 'Order completed.'});
    }
);
apiRouter.get('/production/active', authenticateToken, async (req, res) => { res.json(await dbAll(`SELECT o.*, m.name as machine_name FROM production_orders o LEFT JOIN machines m ON o.machine_id = m.id WHERE o.status IN ('in_progress', 'stopped') AND o.archived = 0`)); });

// Downtime Reporting Endpoint
apiRouter.get('/reports/downtime', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, machine_id, category, order_id } = req.query;
        
        let query = `
            SELECT 
                ps.*,
                o.order_number,
                m.name as machine_name,
                m.environment,
                u1.username as stopped_by,
                u2.username as resolved_by,
                CASE 
                    WHEN ps.end_time IS NULL THEN 'Active'
                    ELSE 'Resolved'
                END as status
            FROM production_stops ps
            LEFT JOIN production_orders o ON ps.order_id = o.id
            LEFT JOIN machines m ON o.machine_id = m.id
            LEFT JOIN users u1 ON ps.operator_id = u1.id
            LEFT JOIN users u2 ON ps.resolved_by = u2.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date) {
            query += ' AND ps.start_time >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND ps.start_time <= ?';
            params.push(end_date);
        }
        
        if (machine_id) {
            query += ' AND o.machine_id = ?';
            params.push(machine_id);
        }
        
        if (category) {
            query += ' AND ps.category = ?';
            params.push(category);
        }
        
        if (order_id) {
            query += ' AND ps.order_id = ?';
            params.push(order_id);
        }
        
        query += ' ORDER BY ps.start_time DESC';
        
        const downtimeRecords = await dbAll(query, params);
        
        // Calculate summary statistics
        const totalStops = downtimeRecords.length;
        const resolvedStops = downtimeRecords.filter(s => s.end_time).length;
        const activeStops = totalStops - resolvedStops;
        const totalDowntimeMinutes = downtimeRecords
            .filter(s => s.duration)
            .reduce((sum, s) => sum + s.duration, 0);
        
        const summary = {
            total_stops: totalStops,
            resolved_stops: resolvedStops,
            active_stops: activeStops,
            total_downtime_hours: Math.round((totalDowntimeMinutes / 60) * 100) / 100,
            average_downtime_minutes: totalStops > 0 ? Math.round((totalDowntimeMinutes / resolvedStops) * 100) / 100 : 0
        };
        
        // Group by category
        const categoryBreakdown = downtimeRecords.reduce((acc, stop) => {
            const cat = stop.category || 'Other';
            if (!acc[cat]) {
                acc[cat] = { count: 0, total_minutes: 0 };
            }
            acc[cat].count++;
            acc[cat].total_minutes += stop.duration || 0;
            return acc;
        }, {});
        
        res.json({
            summary,
            category_breakdown: categoryBreakdown,
            records: downtimeRecords
        });
        
    } catch (error) {
        console.error('Downtime report error:', error);
        res.status(500).json({ error: 'Failed to generate downtime report' });
    }
});
apiRouter.get('/production/stats', authenticateToken, async (req, res) => {
    const stats = await dbGet(`SELECT COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_orders, COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped_orders, AVG(efficiency_percentage) as avg_efficiency FROM production_orders WHERE archived = 0`);
    const machineStats = await dbGet(`SELECT COUNT(*) as total_machines, COUNT(CASE WHEN status = 'in_use' THEN 1 END) as machines_in_use FROM machines`);
    res.json({ ...stats, ...machineStats, avg_efficiency: stats.avg_efficiency || 0 });
});
// Enhanced quantity update with shift tracking
apiRouter.patch('/orders/:id/quantity', authenticateToken, requireRole(['admin', 'supervisor', 'operator']),
    body('actual_quantity').isInt({min: 0}), handleValidationErrors,
    async (req, res) => {
        try {
            await dbRun('BEGIN TRANSACTION');
            
            // Get current quantity
            const order = await dbGet('SELECT actual_quantity, machine_id FROM production_orders WHERE id = ? AND status = "in_progress"', [req.params.id]);
            if (!order) {
                await dbRun('ROLLBACK');
                return res.status(400).json({error: 'Order not found or not in progress'});
            }
            
            const previousQuantity = order.actual_quantity || 0;
            const quantityChange = req.body.actual_quantity - previousQuantity;
            
            // Determine current shift
            const currentHour = new Date().getHours();
            const shiftType = (currentHour >= 6 && currentHour < 18) ? 'day' : 'night';
            const shiftDate = new Date().toISOString().split('T')[0];
            
            // Update order quantity
            await dbRun('UPDATE production_orders SET actual_quantity = ? WHERE id = ?', [req.body.actual_quantity, req.params.id]);
            
            // Record quantity update for shift tracking
            await dbRun(`
                INSERT INTO quantity_updates (
                    order_id, previous_quantity, new_quantity, quantity_change, 
                    updated_by, shift_date, shift_type, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.params.id, previousQuantity, req.body.actual_quantity, 
                quantityChange, req.user.id, shiftDate, shiftType, req.body.notes || null
            ]);
            
            await dbRun('COMMIT');
            
            res.json({
                message: 'Quantity updated successfully',
                previousQuantity,
                newQuantity: req.body.actual_quantity,
                quantityChange,
                shiftType,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            await dbRun('ROLLBACK');
            console.error('Quantity update error:', error);
            res.status(500).json({error: 'Failed to update quantity'});
        }
    }
);

apiRouter.get('/production/floor-overview', authenticateToken, async (req, res) => {
    const query = `
        SELECT
            m.*,
            o.id as order_id,
            o.order_number,
            o.product_name,
            o.start_time,
            o.status as order_status
        FROM machines m
        LEFT JOIN production_orders o ON m.id = o.machine_id AND o.status IN ('in_progress', 'paused', 'stopped')
        ORDER BY m.environment, m.name
    `;
    const overviewData = await dbAll(query);
    res.json(overviewData);
});

// --- Shift Reporting ---
// Get current shift report
apiRouter.get('/shifts/current', authenticateToken, async (req, res) => {
    try {
        const currentHour = new Date().getHours();
        const shiftType = (currentHour >= 6 && currentHour < 18) ? 'day' : 'night';
        const shiftDate = new Date().toISOString().split('T')[0];
        const environment = req.query.environment || '';
        
        const shiftReport = await dbGet(`
            SELECT * FROM shift_reports 
            WHERE shift_date = ? AND shift_type = ? AND environment = ?
        `, [shiftDate, shiftType, environment]);
        
        if (!shiftReport) {
            // Create new shift report if none exists
            const startHour = shiftType === 'day' ? 6 : 18;
            const endHour = shiftType === 'day' ? 18 : 6;
            
            await dbRun(`
                INSERT INTO shift_reports 
                (shift_date, shift_type, environment, start_time, end_time, created_by)
                VALUES (?, ?, ?, datetime('now', 'start of day', '+${startHour} hours'), 
                        datetime('now', 'start of day', '+${endHour + (shiftType === 'night' ? 24 : 0)} hours'), ?)
            `, [shiftDate, shiftType, environment, req.user.id]);
            
            const newReport = await dbGet(`
                SELECT * FROM shift_reports 
                WHERE shift_date = ? AND shift_type = ? AND environment = ?
            `, [shiftDate, shiftType, environment]);
            
            return res.json(newReport);
        }
        
        res.json(shiftReport);
    } catch (error) {
        console.error('Get current shift error:', error);
        res.status(500).json({error: 'Failed to get current shift'});
    }
});

// Generate automated shift report
apiRouter.post('/shifts/:id/generate', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
        const shiftId = req.params.id;
        const shift = await dbGet('SELECT * FROM shift_reports WHERE id = ?', [shiftId]);
        
        if (!shift) {
            return res.status(404).json({error: 'Shift report not found'});
        }
        
        // Calculate shift statistics
        const stats = await dbAll(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_orders,
                COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped_orders,
                SUM(COALESCE(actual_quantity, 0)) as total_quantity_produced,
                AVG(COALESCE(efficiency_percentage, 0)) as avg_efficiency
            FROM production_orders o
            LEFT JOIN machines m ON o.machine_id = m.id
            WHERE m.environment = ? 
            AND DATE(o.start_time) = ?
        `, [shift.environment, shift.shift_date]);
        
        // Get downtime statistics
        const downtimeStats = await dbGet(`
            SELECT 
                COUNT(*) as total_stops,
                COALESCE(SUM(duration), 0) as total_downtime_minutes
            FROM production_stops ps
            LEFT JOIN production_orders o ON ps.order_id = o.id
            LEFT JOIN machines m ON o.machine_id = m.id
            WHERE m.environment = ?
            AND DATE(ps.start_time) = ?
        `, [shift.environment, shift.shift_date]);
        
        // Get machine statistics
        const machineStats = await dbGet(`
            SELECT 
                COUNT(*) as total_machines_available,
                COUNT(CASE WHEN status = 'in_use' THEN 1 END) as total_machines_active
            FROM machines 
            WHERE environment = ?
        `, [shift.environment]);
        
        // Calculate OEE (simplified calculation)
        const availability = downtimeStats.total_downtime_minutes > 0 ? 
            Math.max(0, 100 - (downtimeStats.total_downtime_minutes / (shift.shift_type === 'day' ? 720 : 720) * 100)) : 100;
        const performance = stats[0].avg_efficiency || 0;
        const quality = 100; // Simplified - would need quality data
        const oee = (availability * performance * quality) / 10000;
        
        // Update shift report with calculated statistics
        await dbRun(`
            UPDATE shift_reports SET
                total_orders = ?, completed_orders = ?, in_progress_orders = ?, stopped_orders = ?,
                total_quantity_produced = ?, total_stops = ?, total_downtime_minutes = ?,
                total_machines_active = ?, total_machines_available = ?,
                oee_percentage = ?, efficiency_percentage = ?, quality_percentage = ?
            WHERE id = ?
        `, [
            stats[0].total_orders, stats[0].completed_orders, stats[0].in_progress_orders, stats[0].stopped_orders,
            stats[0].total_quantity_produced, downtimeStats.total_stops, downtimeStats.total_downtime_minutes,
            machineStats.total_machines_active, machineStats.total_machines_available,
            oee, performance, quality, shiftId
        ]);
        
        // Get updated report
        const updatedReport = await dbGet('SELECT * FROM shift_reports WHERE id = ?', [shiftId]);
        
        res.json({
            message: 'Shift report generated successfully',
            report: updatedReport,
            statistics: {
                ...stats[0],
                ...downtimeStats,
                ...machineStats,
                oee_percentage: oee,
                availability_percentage: availability
            }
        });
        
    } catch (error) {
        console.error('Generate shift report error:', error);
        res.status(500).json({error: 'Failed to generate shift report'});
    }
});

// Get shift reports history
apiRouter.get('/shifts/reports', authenticateToken, async (req, res) => {
    try {
        const { environment, start_date, end_date, shift_type } = req.query;
        
        let query = `
            SELECT sr.*, u.username as supervisor_name 
            FROM shift_reports sr
            LEFT JOIN users u ON sr.supervisor_id = u.id
            WHERE 1=1
        `;
        const params = [];
        
        if (environment) {
            query += ' AND sr.environment = ?';
            params.push(environment);
        }
        
        if (start_date) {
            query += ' AND sr.shift_date >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND sr.shift_date <= ?';
            params.push(end_date);
        }
        
        if (shift_type) {
            query += ' AND sr.shift_type = ?';
            params.push(shift_type);
        }
        
        query += ' ORDER BY sr.shift_date DESC, sr.shift_type DESC';
        
        const reports = await dbAll(query, params);
        res.json(reports);
        
    } catch (error) {
        console.error('Get shift reports error:', error);
        res.status(500).json({error: 'Failed to get shift reports'});
    }
});

// Get quantity updates for current shift
apiRouter.get('/shifts/quantity-updates', authenticateToken, async (req, res) => {
    try {
        const { shift_date, shift_type, environment } = req.query;
        
        const updates = await dbAll(`
            SELECT qu.*, o.order_number, o.product_name, u.username as updated_by_name, m.name as machine_name
            FROM quantity_updates qu
            LEFT JOIN production_orders o ON qu.order_id = o.id
            LEFT JOIN users u ON qu.updated_by = u.id
            LEFT JOIN machines m ON o.machine_id = m.id
            WHERE qu.shift_date = ? AND qu.shift_type = ?
            ${environment ? 'AND m.environment = ?' : ''}
            ORDER BY qu.update_time DESC
        `, environment ? [shift_date, shift_type, environment] : [shift_date, shift_type]);
        
        res.json(updates);
        
    } catch (error) {
        console.error('Get quantity updates error:', error);
        res.status(500).json({error: 'Failed to get quantity updates'});
    }
});

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

// Get comprehensive roster for specific date (supervisors + assigned employees)
apiRouter.get('/labour/roster', authenticateToken, async (req, res) => {
    const { date } = req.query;
    
    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
        // Get supervisors on duty for both shifts
        const supervisors = await dbAll(`
            SELECT 
                ss.id,
                ss.shift,
                u.username as name,
                u.fullName,
                u.employee_code,
                'Supervisor' as position,
                'supervisor' as type,
                'planned' as status
            FROM shift_supervisors ss
            JOIN users u ON ss.supervisor_id = u.id
            WHERE ss.assignment_date = ?
            ORDER BY ss.shift, u.username
        `, [date]);

        // Get assigned employees with their machine assignments
        const assignments = await dbAll(`
            SELECT 
                la.id,
                la.shift,
                la.status,
                u.username as name,
                u.fullName,
                u.employee_code,
                u.role as position,
                m.name as machine,
                m.environment as production_area,
                'employee' as type
            FROM labor_assignments la
            JOIN users u ON la.user_id = u.id
            JOIN machines m ON la.machine_id = m.id
            WHERE la.assignment_date = ?
            ORDER BY la.shift, m.name, u.username
        `, [date]);

        // Get attendance records from daily_attendance table (if any)
        const attendance = await dbAll('SELECT * FROM daily_attendance WHERE attendance_date = ? ORDER BY name', [date]);

        // Get machines in use for the day
        const machinesInUse = await dbAll(`
            SELECT 
                m.id,
                m.name,
                m.type,
                m.status,
                m.environment,
                m.capacity,
                m.production_rate,
                COUNT(DISTINCT la.id) as assigned_workers,
                COUNT(DISTINCT CASE WHEN la.shift = 'day' THEN la.id END) as day_workers,
                COUNT(DISTINCT CASE WHEN la.shift = 'night' THEN la.id END) as night_workers,
                GROUP_CONCAT(DISTINCT la.shift) as shifts_in_use
            FROM machines m
            INNER JOIN labor_assignments la ON m.id = la.machine_id
            WHERE la.assignment_date = ?
            GROUP BY m.id, m.name, m.type, m.status, m.environment, m.capacity, m.production_rate
            ORDER BY assigned_workers DESC, m.name
        `, [date]);

        // Combine all data
        const roster = {
            supervisors,
            assignments,
            attendance,
            machinesInUse,
            summary: {
                total_supervisors: supervisors.length,
                total_assignments: assignments.length,
                total_attendance: attendance.length,
                total_machines_in_use: machinesInUse.length,
                day_supervisors: supervisors.filter(s => s.shift === 'day').length,
                night_supervisors: supervisors.filter(s => s.shift === 'night').length,
                day_assignments: assignments.filter(a => a.shift === 'day').length,
                night_assignments: assignments.filter(a => a.shift === 'night').length
            }
        };

        res.json(roster);
    } catch (error) {
        console.error('Error fetching comprehensive roster for date:', date, error);
        res.status(500).json({ error: 'Failed to fetch roster for the specified date.' });
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

// --- Daily Role Override Routes ---

// Get role overrides for a specific date
apiRouter.get('/labour/role-overrides', authenticateToken, async (req, res) => {
    const { date } = req.query;
    
    try {
        const overrides = await dbAll(`
            SELECT 
                dro.*,
                u.username,
                u.fullName,
                u.employee_code,
                assigned_by_user.username as assigned_by_name
            FROM daily_role_overrides dro
            JOIN users u ON dro.employee_id = u.id
            LEFT JOIN users assigned_by_user ON dro.assigned_by = assigned_by_user.id
            WHERE dro.override_date = ?
            ORDER BY u.fullName
        `, [date || new Date().toISOString().split('T')[0]]);
        
        res.json(overrides);
    } catch (error) {
        console.error('Get role overrides error:', error);
        res.status(500).json({error: 'Failed to get role overrides'});
    }
});

// Create role override for specific date
apiRouter.post('/labour/role-overrides', 
    authenticateToken,
    requireRole(['admin', 'supervisor']),
    [
        body('employee_id').isInt({min: 1}).withMessage('Valid employee ID required'),
        body('override_role').isIn(['operator', 'packer', 'supervisor', 'quality_control']).withMessage('Valid role required'),
        body('override_date').isISO8601().withMessage('Valid date required'),
        body('shift_type').optional().isIn(['day', 'night', 'both']).withMessage('Valid shift type required'),
        body('notes').optional().isLength({max: 500}).withMessage('Notes too long')
    ],
    handleValidationErrors,
    async (req, res) => {
        const { employee_id, override_role, override_date, shift_type = 'both', notes } = req.body;
        
        try {
            // Get employee's original role
            const employee = await dbGet('SELECT role FROM users WHERE id = ?', [employee_id]);
            if (!employee) {
                return res.status(404).json({error: 'Employee not found'});
            }
            
            // Create role override
            const result = await dbRun(`
                INSERT INTO daily_role_overrides (
                    employee_id, original_role, override_role, override_date, 
                    shift_type, assigned_by, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [employee_id, employee.role, override_role, override_date, shift_type, req.user.id, notes]);
            
            res.json({
                message: 'Role override created successfully',
                override_id: result.lastID,
                employee_id,
                original_role: employee.role,
                override_role,
                override_date,
                shift_type
            });
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({error: 'Role override already exists for this employee, date, and shift'});
            }
            console.error('Create role override error:', error);
            res.status(500).json({error: 'Failed to create role override'});
        }
    }
);

// Update role override
apiRouter.put('/labour/role-overrides/:id',
    authenticateToken,
    requireRole(['admin', 'supervisor']),
    [
        body('override_role').optional().isIn(['operator', 'packer', 'supervisor', 'quality_control']).withMessage('Valid role required'),
        body('shift_type').optional().isIn(['day', 'night', 'both']).withMessage('Valid shift type required'),
        body('notes').optional().isLength({max: 500}).withMessage('Notes too long')
    ],
    handleValidationErrors,
    async (req, res) => {
        const { override_role, shift_type, notes } = req.body;
        
        try {
            const result = await dbRun(`
                UPDATE daily_role_overrides 
                SET override_role = COALESCE(?, override_role),
                    shift_type = COALESCE(?, shift_type),
                    notes = COALESCE(?, notes)
                WHERE id = ?
            `, [override_role, shift_type, notes, req.params.id]);
            
            if (result.changes === 0) {
                return res.status(404).json({error: 'Role override not found'});
            }
            
            res.json({message: 'Role override updated successfully'});
        } catch (error) {
            console.error('Update role override error:', error);
            res.status(500).json({error: 'Failed to update role override'});
        }
    }
);

// Delete role override
apiRouter.delete('/labour/role-overrides/:id',
    authenticateToken,
    requireRole(['admin', 'supervisor']),
    async (req, res) => {
        try {
            const result = await dbRun('DELETE FROM daily_role_overrides WHERE id = ?', [req.params.id]);
            
            if (result.changes === 0) {
                return res.status(404).json({error: 'Role override not found'});
            }
            
            res.json({message: 'Role override deleted successfully'});
        } catch (error) {
            console.error('Delete role override error:', error);
            res.status(500).json({error: 'Failed to delete role override'});
        }
    }
);

// Get effective roles for employees on a specific date (includes overrides)
apiRouter.get('/labour/effective-roles', authenticateToken, async (req, res) => {
    const { date, shift } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
        const employees = await dbAll(`
            SELECT 
                u.id,
                u.username,
                u.fullName,
                u.employee_code,
                u.role as original_role,
                u.company,
                COALESCE(dro.override_role, u.role) as effective_role,
                dro.shift_type as override_shift,
                dro.notes as override_notes,
                CASE 
                    WHEN dro.id IS NOT NULL THEN 1 
                    ELSE 0 
                END as has_override
            FROM users u
            LEFT JOIN daily_role_overrides dro ON (
                u.id = dro.employee_id 
                AND dro.override_date = ?
                AND (dro.shift_type = 'both' OR dro.shift_type = ? OR ? IS NULL)
            )
            WHERE u.is_active = 1 AND u.role != 'admin'
            ORDER BY u.fullName
        `, [targetDate, shift, shift]);
        
        res.json({
            date: targetDate,
            shift: shift || 'all',
            employees,
            summary: {
                total_employees: employees.length,
                with_overrides: employees.filter(e => e.has_override).length,
                roles: employees.reduce((acc, emp) => {
                    acc[emp.effective_role] = (acc[emp.effective_role] || 0) + 1;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Get effective roles error:', error);
        res.status(500).json({error: 'Failed to get effective roles'});
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
        const { employee_id, machine_id, shift, assignment_date, job_role = 'Packer' } = req.body;
        console.log('Assignment request data:', { employee_id, machine_id, shift, assignment_date });
        console.log('User role:', req.user?.role);
        
        // Validate required fields
        if (!employee_id || !machine_id || !shift || !assignment_date) {
            return res.status(400).json({ error: 'Missing required fields: employee_id, machine_id, shift, assignment_date' });
        }
        
        // Check if employee is already assigned to opposite shift on same date
        const oppositeShift = shift === 'day' ? 'night' : 'day';
        const existingOppositeShift = await dbGet(`
            SELECT id FROM labor_assignments 
            WHERE employee_id = ? AND assignment_date = ? AND shift = ?
        `, [employee_id, assignment_date, oppositeShift]);
        
        if (existingOppositeShift) {
            return res.status(400).json({ 
                error: `This employee is already assigned to the ${oppositeShift} shift on ${assignment_date}. An employee cannot work both shifts on the same day.`,
                errorType: 'DOUBLE_SHIFT_CONFLICT'
            });
        }
        
        const params = [employee_id, employee_id, machine_id, shift, assignment_date, 'planned', job_role];
        console.log('SQL parameters:', params);
        const result = await dbRun(
            'INSERT INTO labor_assignments (user_id, employee_id, machine_id, shift, assignment_date, status, job_role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            params
        );
        console.log('Assignment created with ID:', result.lastID);
        
        const newAssignment = await dbGet('SELECT * FROM labor_assignments WHERE id = ?', [result.lastID]);
        res.status(201).json(newAssignment);
    } catch (error) {
        console.error("Error creating assignment - Full error:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        
        // Handle specific SQLite constraint errors with user-friendly messages
        if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed: labor_assignments.user_id')) {
            return res.status(400).json({ 
                error: 'This employee is already assigned to a machine for this date and shift. Please choose a different employee or remove their existing assignment first.',
                errorType: 'DUPLICATE_ASSIGNMENT'
            });
        }
        
        // Handle other constraint errors
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ 
                error: 'Assignment conflict detected. Please check for existing assignments.',
                errorType: 'CONSTRAINT_ERROR'
            });
        }
        
        // Generic error for other issues
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

// --- Shift Supervisor Management ---
apiRouter.get('/planner/supervisors', authenticateToken, async (req, res) => {
    try {
        const { date, shift } = req.query;
        if (!date || !shift) return res.status(400).json({ error: 'Date and shift are required' });
        
        const supervisors = await dbAll(`
            SELECT 
                ss.id,
                ss.supervisor_id,
                ss.assignment_date,
                ss.shift,
                ss.created_at,
                u.username,
                u.fullName,
                u.employee_code
            FROM shift_supervisors ss
            JOIN users u ON ss.supervisor_id = u.id
            WHERE ss.assignment_date = ? AND ss.shift = ?
            ORDER BY ss.created_at
        `, [date, shift]);
        
        res.json(supervisors);
    } catch (error) {
        console.error("Error fetching shift supervisors:", error);
        res.status(500).json({ error: 'Database error fetching shift supervisors' });
    }
});

apiRouter.post('/planner/supervisors', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
        const { supervisor_id, assignment_date, shift } = req.body;
        console.log('Supervisor assignment request:', { supervisor_id, assignment_date, shift, user: req.user });
        
        if (!supervisor_id || !assignment_date || !shift) {
            console.log('Missing required fields');
            return res.status(400).json({ error: 'supervisor_id, assignment_date, and shift are required' });
        }
        
        // No limit on number of supervisors - removed the 5-supervisor restriction
        
        // Check if supervisor is already assigned to this shift
        console.log('Checking for existing assignment...');
        const existing = await dbGet(`
            SELECT id FROM shift_supervisors 
            WHERE supervisor_id = ? AND assignment_date = ? AND shift = ?
        `, [supervisor_id, assignment_date, shift]);
        
        if (existing) {
            console.log('Supervisor already assigned');
            return res.status(400).json({ error: 'Supervisor already assigned to this shift' });
        }
        
        // Check if supervisor is already assigned to opposite shift on same date
        const oppositeShift = shift === 'day' ? 'night' : 'day';
        const existingOppositeShift = await dbGet(`
            SELECT id FROM shift_supervisors 
            WHERE supervisor_id = ? AND assignment_date = ? AND shift = ?
        `, [supervisor_id, assignment_date, oppositeShift]);
        
        if (existingOppositeShift) {
            return res.status(400).json({ 
                error: `This supervisor is already assigned to the ${oppositeShift} shift on ${assignment_date}. A supervisor cannot work both shifts on the same day.`,
                errorType: 'DOUBLE_SHIFT_CONFLICT'
            });
        }
        
        console.log('Creating new supervisor assignment...');
        const result = await dbRun(`
            INSERT INTO shift_supervisors (supervisor_id, assignment_date, shift, created_by) 
            VALUES (?, ?, ?, ?)
        `, [supervisor_id, assignment_date, shift, req.user.id]);
        
        console.log('Supervisor assignment created successfully:', result.lastID);
        res.status(201).json({ 
            id: result.lastID, 
            message: 'Supervisor assigned to shift successfully' 
        });
    } catch (error) {
        console.error("Error assigning supervisor to shift - Full error:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        res.status(500).json({ error: `Failed to assign supervisor to shift: ${error.message}` });
    }
});

apiRouter.delete('/planner/supervisors/:id', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM shift_supervisors WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({error: "Supervisor assignment not found"});
        res.json({ message: 'Supervisor removed from shift' });
    } catch (error) {
        console.error("Error removing supervisor from shift:", error);
        res.status(500).json({ error: 'Failed to remove supervisor from shift' });
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
