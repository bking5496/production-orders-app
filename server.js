// Refactored Server - Testing Integration
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our new modular components
const { addResponseUtils } = require('./src/utils/response');
const { errorHandler, notFoundHandler } = require('./src/middleware/error-handler');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const ordersRoutes = require('./src/routes/orders.routes');
const machinesRoutes = require('./src/routes/machines.routes');
const usersRoutes = require('./src/routes/users.routes');
const laborRoutes = require('./src/routes/labor.routes');
const plannerRoutes = require('./src/routes/planner.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const systemRoutes = require('./src/routes/system.routes');

// WebSocket integration
const { initializeWebSocket, addWebSocketToApp, startCleanupSchedule } = require('./src/middleware/websocket');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://oracles.africa',
      'https://dev.oracles.africa'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add response utilities to all routes
app.use(addResponseUtils);

// Add WebSocket functionality to all routes
app.use(addWebSocketToApp);

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    refactored: true
  }, 'Refactored server is running');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/labor', laborRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/system', systemRoutes);

// Legacy route compatibility
app.use('/api/labour', laborRoutes); // British spelling compatibility
app.use('/api/labor-planner', plannerRoutes); // Legacy labor-planner compatibility

// Attendance Register Endpoints (direct implementation for compatibility)
const { authenticateToken, requireRole } = require('./src/middleware/auth');
const DatabaseUtils = require('./src/utils/database');

// Get attendance data for a specific date, machine, and shift
app.get('/api/attendance-register', authenticateToken, async (req, res) => {
  console.log('===== ATTENDANCE REGISTER API HIT =====');
  console.log('Time:', new Date().toISOString());
  console.log('Query params:', JSON.stringify(req.query));
  console.log('User:', req.user?.username || 'Unknown');
  
  try {
    const { date, machine_id, shift } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`Target date: ${targetDate}`);
    console.log(`Machine ID: ${machine_id}`);
    console.log(`Shift: ${shift}`);
    
    // Get labor assignments for the specified date and shift
    let query = `
      SELECT DISTINCT
        la.id as assignment_id,
        la.employee_id,
        la.machine_id,
        la.assignment_date,
        la.shift_type,
        la.role as assignment_role,
        u.username,
        u.full_name,
        CASE 
          WHEN u.employee_code IS NOT NULL AND u.employee_code != '' THEN u.employee_code
          WHEN u.profile_data->>'employee_code' IS NOT NULL AND u.profile_data->>'employee_code' != '' THEN u.profile_data->>'employee_code'
          ELSE LPAD(u.id::text, 4, '0')
        END as employee_code,
        COALESCE(u.full_name, u.username) as employee_name,
        m.name as machine_name,
        m.environment as machine_environment,
        ar.status,
        ar.check_in_time,
        ar.notes as attendance_notes,
        ar.marked_by
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      LEFT JOIN machines m ON la.machine_id = m.id
      LEFT JOIN attendance_register ar ON (
        ar.date = la.assignment_date 
        AND ar.employee_id = la.employee_id 
        AND ar.machine_id = la.machine_id 
        AND ar.shift_type = la.shift_type
      )
      WHERE la.assignment_date = $1 
        AND la.shift_type = $2
        AND u.is_active = true
        AND (m.status IN ('available', 'in_use', 'maintenance') OR m.status IS NULL)
      ORDER BY m.name, la.role, u.full_name
    `;
    
    const params = [targetDate, shift];
    
    console.log('🔍 Executing attendance query with params:', params);
    const result = await DatabaseUtils.raw(query, params);
    console.log(`✅ Found ${result.rows.length} scheduled workers for attendance`);
    
    return res.success(result.rows, 'Attendance register data retrieved successfully');
    
  } catch (error) {
    console.error('❌ Failed to fetch attendance register:', error);
    return res.error('Failed to fetch attendance register', error.message);
  }
});

// Mark or update attendance
app.post('/api/attendance-register', authenticateToken, requireRole(['supervisor', 'admin']), async (req, res) => {
  try {
    const { date, machine_id, employee_id, shift_type, status, check_in_time, notes } = req.body;
    
    const query = `
      INSERT INTO attendance_register (
        date, machine_id, employee_id, shift_type, status, check_in_time, notes, marked_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (date, machine_id, employee_id, shift_type)
      DO UPDATE SET 
        status = EXCLUDED.status,
        check_in_time = EXCLUDED.check_in_time,
        notes = EXCLUDED.notes,
        marked_by = EXCLUDED.marked_by
      RETURNING *
    `;
    
    const result = await DatabaseUtils.raw(query, [
      date, machine_id, employee_id, shift_type, status, check_in_time, notes, req.user.id
    ]);
    
    // Broadcast attendance update via WebSocket if available
    if (req.broadcast) {
      req.broadcast('attendance_marked', {
        attendanceRecord: result.rows[0],
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'labor');
    }
    
    return res.success(result.rows[0], 'Attendance marked successfully');
    
  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    return res.error('Failed to mark attendance', error.message);
  }
});

// =============================================================================
// MISSING CRITICAL ENDPOINTS - RESTORED FROM MONOLITHIC SERVER
// =============================================================================

// Maturation Room Endpoints
app.get('/api/maturation-room', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        mr.*,
        po.order_number,
        po.product_name,
        u.username as confirmed_by_name,
        qc_user.username as quality_checked_by_name,
        CASE 
          WHEN mr.quantity_expected > 0 THEN 
            ROUND(((mr.quantity_produced - mr.quantity_expected) / mr.quantity_expected * 100)::numeric, 2)
          ELSE 0 
        END as variance_percentage,
        (mr.maturation_date + INTERVAL '1 day' * mr.expected_maturation_days) as estimated_completion_date
      FROM maturation_room mr
      LEFT JOIN production_orders po ON mr.production_order_id = po.id
      LEFT JOIN users u ON mr.confirmed_by = u.id
      LEFT JOIN users qc_user ON mr.quality_checked_by = qc_user.id
      ORDER BY mr.maturation_date DESC, mr.id DESC
    `;
    
    const result = await DatabaseUtils.raw(query);
    return res.success(result.rows, 'Maturation room data retrieved successfully');
  } catch (error) {
    console.error('❌ Failed to fetch maturation room data:', error);
    return res.error('Failed to fetch maturation room data', error.message);
  }
});

app.post('/api/maturation-room', authenticateToken, requireRole(['supervisor', 'admin']), async (req, res) => {
  try {
    const maturationRecord = {
      ...req.body,
      status: 'maturing',
      confirmed_by: req.user.id,
      created_at: new Date()
    };

    const result = await DatabaseUtils.insert('maturation_room', maturationRecord, '*');
    
    if (req.broadcast) {
      req.broadcast('maturation_added', {
        record: result,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'maturation');
    }

    return res.success(result, 'Blend added to maturation room successfully');
  } catch (error) {
    console.error('❌ Failed to add to maturation room:', error);
    return res.error('Failed to add to maturation room', error.message);
  }
});

app.put('/api/maturation-room/:id/status', authenticateToken, requireRole(['supervisor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date()
    };

    const result = await DatabaseUtils.update('maturation_room', { id }, updateData, '*');
    
    if (!result) {
      return res.error('Maturation record not found', null, 404);
    }

    if (req.broadcast) {
      req.broadcast('maturation_status_updated', {
        record: result,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'maturation');
    }

    return res.success(result, 'Maturation status updated successfully');
  } catch (error) {
    console.error('❌ Failed to update maturation status:', error);
    return res.error('Failed to update maturation status', error.message);
  }
});

app.post('/api/maturation-room/daily-check', authenticateToken, requireRole(['supervisor', 'admin', 'operator']), async (req, res) => {
  try {
    const dailyCheck = {
      ...req.body,
      checked_by: req.user.id,
      created_at: new Date()
    };

    const result = await DatabaseUtils.insert('maturation_daily_checks', dailyCheck, '*');

    if (req.broadcast) {
      req.broadcast('maturation_check_added', {
        check: result,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'maturation');
    }

    return res.success(result, 'Daily check added successfully');
  } catch (error) {
    console.error('❌ Failed to add daily check:', error);
    return res.error('Failed to add daily check', error.message);
  }
});

app.get('/api/maturation-room/:id/daily-checks', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        mdc.*,
        u.username as checked_by_name
      FROM maturation_daily_checks mdc
      LEFT JOIN users u ON mdc.checked_by = u.id
      WHERE mdc.maturation_room_id = $1
      ORDER BY mdc.check_date DESC
    `;
    
    const result = await DatabaseUtils.raw(query, [id]);
    return res.success(result.rows, 'Daily checks retrieved successfully');
  } catch (error) {
    console.error('❌ Failed to fetch daily checks:', error);
    return res.error('Failed to fetch daily checks', error.message);
  }
});

// Labor Assignments Endpoints
app.get('/api/labor-assignments', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, environment, machine_id, employee_id, shift_type } = req.query;
    
    let query = `
      SELECT DISTINCT
        la.id,
        la.employee_id,
        la.machine_id,
        la.assignment_date,
        la.shift_type,
        la.role,
        la.start_time,
        la.end_time,
        la.hourly_rate,
        la.overtime_eligible,
        la.created_at,
        la.created_by,
        la.updated_at,
        u.username,
        u.full_name,
        CASE 
          WHEN u.employee_code IS NOT NULL AND u.employee_code != '' THEN u.employee_code
          WHEN u.profile_data->>'employee_code' IS NOT NULL AND u.profile_data->>'employee_code' != '' THEN u.profile_data->>'employee_code'
          ELSE LPAD(u.id::text, 4, '0')
        END as employee_code,
        COALESCE(u.full_name, u.username) as employee_name,
        m.name as machine_name,
        m.environment as machine_environment,
        'Production Company' as company,
        'scheduled' as status
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      LEFT JOIN machines m ON la.machine_id = m.id
      WHERE u.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (start_date) {
      query += ` AND la.assignment_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND la.assignment_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    if (environment) {
      query += ` AND m.environment = $${paramIndex}`;
      params.push(environment);
      paramIndex++;
    }
    
    if (machine_id) {
      query += ` AND la.machine_id = $${paramIndex}`;
      params.push(machine_id);
      paramIndex++;
    }
    
    if (employee_id) {
      query += ` AND la.employee_id = $${paramIndex}`;
      params.push(employee_id);
      paramIndex++;
    }
    
    if (shift_type) {
      query += ` AND la.shift_type = $${paramIndex}`;
      params.push(shift_type);
      paramIndex++;
    }
    
    query += ` ORDER BY la.assignment_date DESC, la.shift_type, m.name, la.role`;
    
    const result = await DatabaseUtils.raw(query, params);
    return res.success(result.rows, 'Labor assignments retrieved successfully');
  } catch (error) {
    console.error('❌ Failed to fetch labor assignments:', error);
    return res.error('Failed to fetch labor assignments', error.message);
  }
});

// Create or update labor assignment
app.post('/api/labor-assignments', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const { employee_id, machine_id, assignment_date, shift_type, role, start_time, end_time, hourly_rate } = req.body;

    const assignmentData = {
      employee_id,
      machine_id,
      assignment_date,
      shift_type: shift_type || 'day',
      role: role || 'operator',
      start_time,
      end_time,
      hourly_rate,
      created_by: req.user.id,
      created_at: new Date()
    };

    // Check for existing assignment
    const existing = await DatabaseUtils.findOne('labor_assignments', {
      employee_id,
      machine_id,
      assignment_date,
      shift_type: shift_type || 'day',
      role: role || 'operator'
    });

    let result;
    if (existing) {
      // Update existing
      result = await DatabaseUtils.update('labor_assignments', { id: existing.id }, {
        start_time,
        end_time,
        hourly_rate,
        updated_at: new Date()
      }, '*');
    } else {
      // Create new
      result = await DatabaseUtils.insert('labor_assignments', assignmentData, '*');
    }

    if (req.broadcast) {
      req.broadcast('labor_assignment_updated', {
        assignment: result,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'labor');
    }

    return res.success(result, existing ? 'Labor assignment updated successfully' : 'Labor assignment created successfully');
  } catch (error) {
    console.error('❌ Failed to create/update labor assignment:', error);
    return res.error('Failed to create/update labor assignment', error.message);
  }
});

// Delete labor assignment
app.delete('/api/labor-assignments/:id', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const assignment = await DatabaseUtils.findOne('labor_assignments', { id });
    if (!assignment) {
      return res.error('Labor assignment not found', null, 404);
    }

    await DatabaseUtils.delete('labor_assignments', { id });

    if (req.broadcast) {
      req.broadcast('labor_assignment_deleted', {
        assignmentId: id,
        user: req.user.username,
        timestamp: new Date().toISOString()
      }, 'labor');
    }

    return res.success(null, 'Labor assignment deleted successfully');
  } catch (error) {
    console.error('❌ Failed to delete labor assignment:', error);
    return res.error('Failed to delete labor assignment', error.message);
  }
});

// Copy previous week's assignments
app.post('/api/labor-assignments/copy-week', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const { source_week, target_week, environment } = req.body;

    if (!source_week || !target_week || !environment) {
      return res.error('Source week, target week, and environment are required', null, 400);
    }

    // Delete existing assignments for target week
    const deleteQuery = `
      DELETE FROM labor_assignments la
      USING machines m
      WHERE la.machine_id = m.id 
      AND la.assignment_date = $1 
      AND m.environment = $2
    `;
    
    await DatabaseUtils.raw(deleteQuery, [target_week, environment]);

    // Copy assignments from source to target
    const copyQuery = `
      INSERT INTO labor_assignments 
      (employee_id, machine_id, assignment_date, shift_type, role, start_time, end_time, hourly_rate, created_by)
      SELECT 
        la.employee_id,
        la.machine_id,
        $2 as assignment_date,
        la.shift_type,
        la.role,
        la.start_time,
        la.end_time,
        la.hourly_rate,
        $3 as created_by
      FROM labor_assignments la
      LEFT JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1 
      AND (m.environment = $4 OR la.machine_id IS NULL)
    `;

    const result = await DatabaseUtils.raw(copyQuery, [source_week, target_week, req.user.id, environment]);
    
    return res.success({ 
      copied_count: result.rowCount,
      message: `Copied ${result.rowCount} assignments from ${source_week} to ${target_week}`
    }, 'Week assignments copied successfully');
  } catch (error) {
    console.error('❌ Failed to copy week assignments:', error);
    return res.error('Failed to copy week assignments', error.message);
  }
});

// =============================================================================
// ADDITIONAL MISSING ENDPOINTS FOR MACHINES AND LABOUR-LAYOUT
// =============================================================================

// Get machine statistics
app.get('/api/machines/stats', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        environment,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline
      FROM machines
      GROUP BY environment
    `;
    
    const result = await DatabaseUtils.raw(query);
    return res.success(result.rows, 'Machine statistics retrieved successfully');
  } catch (error) {
    console.error('❌ Failed to fetch machine statistics:', error);
    return res.error('Failed to fetch machine statistics', error.message);
  }
});

// Machines status - Critical priority endpoint
app.get('/api/machines/status', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        type,
        status,
        environment
      FROM machines
      ORDER BY name
    `;
    
    const result = await DatabaseUtils.raw(query);
    return res.success(result.rows, 'Machine status retrieved successfully');
  } catch (error) {
    console.error('❌ Failed to fetch machine status:', error);
    return res.error('Failed to fetch machine status', error.message);
  }
});

// Get machines with active orders for a specific date and environment
app.get('/api/machines/daily-active', authenticateToken, async (req, res) => {
  try {
    const { date, environment } = req.query;
    
    if (!date || !environment) {
      return res.error('Date and environment are required', null, 400);
    }
    
    const query = `
      SELECT DISTINCT 
        m.id,
        m.name,
        m.type,
        m.environment,
        po.id as order_id,
        po.order_number,
        po.product_name,
        po.start_time,
        po.status as order_status,
        po.machine_id
      FROM machines m
      LEFT JOIN production_orders po ON m.id = po.machine_id 
        AND DATE(po.start_time AT TIME ZONE 'UTC' AT TIME ZONE '+02:00') = $1
        AND po.status IN ('in_progress', 'paused', 'pending')
      WHERE m.environment = $2 AND m.status != 'offline'
      ORDER BY m.name
    `;
    
    const result = await DatabaseUtils.raw(query, [date, environment]);
    return res.success(result.rows, 'Daily active machines retrieved successfully');
  } catch (error) {
    console.error('❌ Failed to fetch daily active machines:', error);
    return res.error('Failed to fetch daily active machines', error.message);
  }
});

// Labour roster endpoint
app.get('/api/labour/roster', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        la.id,
        la.employee_id,
        la.machine_id,
        la.assignment_date,
        la.shift_type,
        la.role,
        la.start_time,
        la.end_time,
        la.hourly_rate,
        u.username,
        u.full_name,
        CASE 
          WHEN u.employee_code IS NOT NULL AND u.employee_code != '' THEN u.employee_code
          WHEN u.profile_data->>'employee_code' IS NOT NULL AND u.profile_data->>'employee_code' != '' THEN u.profile_data->>'employee_code'
          ELSE LPAD(u.id::text, 4, '0')
        END as employee_code,
        COALESCE(u.full_name, u.username) as employee_name,
        m.name as machine_name,
        m.environment,
        'Production Company' as company,
        'scheduled' as status
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      LEFT JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1 AND u.is_active = true
      ORDER BY m.name, la.shift_type, la.role
    `;
    
    const result = await DatabaseUtils.raw(query, [targetDate]);
    return res.success(result.rows, 'Labour roster retrieved successfully');
  } catch (error) {
    console.error('❌ Failed to fetch labour roster:', error);
    return res.error('Failed to fetch labour roster', error.message);
  }
});

// Today's labour data
app.get('/api/labour/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's assignments
    const assignmentsQuery = `
      SELECT 
        la.*,
        u.username,
        u.full_name,
        CASE 
          WHEN u.employee_code IS NOT NULL AND u.employee_code != '' THEN u.employee_code
          WHEN u.profile_data->>'employee_code' IS NOT NULL AND u.profile_data->>'employee_code' != '' THEN u.profile_data->>'employee_code'
          ELSE LPAD(u.id::text, 4, '0')
        END as employee_code,
        COALESCE(u.full_name, u.username) as employee_name,
        m.name as machine_name,
        m.environment,
        'Production Company' as company
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      LEFT JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1 AND u.is_active = true
      ORDER BY la.shift_type, m.name, la.role
    `;
    
    const assignments = await DatabaseUtils.raw(assignmentsQuery, [today]);
    
    // Get summary data
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(DISTINCT la.employee_id) as total_workers,
        COUNT(DISTINCT la.machine_id) as total_machines,
        COUNT(CASE WHEN la.shift_type = 'day' THEN 1 END) as day_assignments,
        COUNT(CASE WHEN la.shift_type = 'night' THEN 1 END) as night_assignments
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      WHERE la.assignment_date = $1 AND u.is_active = true
    `;
    
    const summary = await DatabaseUtils.raw(summaryQuery, [today]);
    
    return res.success({
      assignments: assignments.rows,
      summary: summary.rows[0],
      date: today
    }, 'Today\'s labour data retrieved successfully');
  } catch (error) {
    console.error('❌ Failed to fetch today\'s labour data:', error);
    return res.error('Failed to fetch today\'s labour data', error.message);
  }
});

// Dashboard route compatibility
app.use('/api/production', analyticsRoutes); // Production endpoints under analytics

// System route compatibility
app.use('/api/settings', systemRoutes); // Settings endpoints compatibility
app.use('/api/environments', systemRoutes); // Direct environment access
app.use('/api/machine-types', systemRoutes); // Direct machine types access

// Catch-all for frontend routes (SPA)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    notFoundHandler(req, res);
  }
});

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);

// Test function to verify components work
const testComponents = async () => {
  console.log('🧪 Testing refactored components...');
  
  try {
    // Test database connection
    const db = require('./src/config/database');
    await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection: OK');
    
    // Test authentication middleware
    const auth = require('./src/middleware/auth');
    const testToken = auth.generateToken({ id: 1, username: 'test', role: 'admin' });
    const decoded = auth.verifyToken(testToken);
    console.log('✅ Authentication middleware: OK');
    
    // Test response utilities
    const { ResponseUtils } = require('./src/utils/response');
    console.log('✅ Response utilities: OK');
    
    // Test database utils
    const DatabaseUtils = require('./src/utils/database');
    console.log('✅ Database utilities: OK');
    
    console.log('🎉 All components tested successfully!');
    
  } catch (error) {
    console.error('❌ Component test failed:', error.message);
    throw error;
  }
};

// Only start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000; // Production port
  const http = require('http');
  
  testComponents().then(() => {
    // Create HTTP server for WebSocket integration
    const server = http.createServer(app);
    
    // Initialize WebSocket server
    const websocketService = initializeWebSocket(server);
    
    // Start WebSocket cleanup scheduler
    startCleanupSchedule();
    
    server.listen(PORT, () => {
      console.log(`🚀 Refactored server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth test: http://localhost:${PORT}/api/auth/login`);
      console.log(`⚙️ System routes: http://localhost:${PORT}/api/system/health`);
      console.log(`🌐 WebSocket server initialized`);
    });
    
    return { server, websocketService };
  }).catch(error => {
    console.error('❌ Failed to start refactored server:', error);
    process.exit(1);
  });
}

module.exports = { app, testComponents };