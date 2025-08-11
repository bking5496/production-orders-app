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