// Refactored Server - Testing Integration
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our new modular components
const { addResponseUtils } = require('./utils/response');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const ordersRoutes = require('./routes/orders.routes');
const machinesRoutes = require('./routes/machines.routes');
const usersRoutes = require('./routes/users.routes');
const laborRoutes = require('./routes/labor.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const reportsRoutes = require('./routes/reports.routes');
const systemRoutes = require('./routes/system.routes');
const plannerRoutes = require('./routes/planner.routes');
const configurationRoutes = require('./routes/configuration.routes');

// WebSocket integration
const { initializeWebSocket, addWebSocketToApp, startCleanupSchedule } = require('./middleware/websocket');

// Global broadcast function (like original server.js)
let globalWebSocketService = null;

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://oracles.africa',
      'https://www.oracles.africa',
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
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/config', configurationRoutes);

// Legacy route compatibility
app.use('/api/labour', laborRoutes); // British spelling compatibility
app.use('/api/planner', plannerRoutes); // Legacy planner endpoint compatibility
app.use('/api/labor-planner', plannerRoutes); // Labor planner with dash compatibility

// Labor assignments compatibility mappings
app.get('/api/labor-assignments', (req, res, next) => {
  req.url = '/assignments';
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments', (req, res, next) => {
  req.url = '/assignments';
  laborRoutes(req, res, next);
});
app.delete('/api/labor-assignments/:id', (req, res, next) => {
  req.url = '/assignments/' + req.params.id;
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments/copy-week', (req, res, next) => {
  req.url = '/assignments/copy-week';
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments/finalize-week', (req, res, next) => {
  req.url = '/assignments/finalize-week';
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments/auto-populate-daily', (req, res, next) => {
  req.url = '/assignments/auto-populate-daily';
  laborRoutes(req, res, next);
});

// Attendance register compatibility mappings
app.get('/api/attendance-register', (req, res, next) => {
  req.url = '/attendance-register';
  laborRoutes(req, res, next);
});
app.post('/api/attendance-register', (req, res, next) => {
  req.url = '/attendance-register';
  laborRoutes(req, res, next);
});

// Labor planner compatibility mappings
app.get('/api/labor-planner/machines', (req, res, next) => {
  req.url = '/planner/machines';
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments/lock-daily', (req, res, next) => {
  req.url = '/assignments/lock-daily';
  laborRoutes(req, res, next);
});

// Dashboard route compatibility - Production endpoints mapped to analytics
app.get('/api/production/floor-overview', (req, res, next) => {
  req.url = '/floor-overview';
  analyticsRoutes(req, res, next);
});
app.get('/api/production/status', (req, res, next) => {
  req.url = '/production-status';
  analyticsRoutes(req, res, next);
});
app.use('/api/production', analyticsRoutes); // Production endpoints under analytics

// System route compatibility - Direct route mappings  
app.get('/api/settings/general', (req, res, next) => {
  req.url = '/settings/general';
  systemRoutes(req, res, next);
});
app.put('/api/settings/general', (req, res, next) => {
  req.url = '/settings/general';
  systemRoutes(req, res, next);
});
// Environments endpoints - redirect to system routes
app.get('/api/environments', (req, res, next) => {
  req.originalUrl = req.url;
  req.url = '/environments';
  req.baseUrl = '/api/system';
  systemRoutes(req, res, next);
});

app.post('/api/environments', (req, res, next) => {
  req.originalUrl = req.url;
  req.url = '/environments';
  req.baseUrl = '/api/system';
  systemRoutes(req, res, next);
});

app.put('/api/environments/:id', (req, res, next) => {
  req.originalUrl = req.url;
  req.url = '/environments/' + req.params.id;
  req.baseUrl = '/api/system';
  systemRoutes(req, res, next);
});

app.delete('/api/environments/:id', (req, res, next) => {
  req.originalUrl = req.url;
  req.url = '/environments/' + req.params.id;
  req.baseUrl = '/api/system';
  systemRoutes(req, res, next);
});

// Machine Types endpoints - redirect to system routes
app.get('/api/machine-types', (req, res, next) => {
  req.originalUrl = req.url;
  req.url = '/machine-types';
  req.baseUrl = '/api/system';
  systemRoutes(req, res, next);
});

app.post('/api/machine-types', (req, res, next) => {
  req.originalUrl = req.url;
  req.url = '/machine-types';
  req.baseUrl = '/api/system';
  systemRoutes(req, res, next);
});

app.put('/api/machine-types/:id', (req, res, next) => {
  req.originalUrl = req.url;
  req.url = '/machine-types/' + req.params.id;
  req.baseUrl = '/api/system';
  systemRoutes(req, res, next);
});

app.delete('/api/machine-types/:id', (req, res, next) => {
  req.originalUrl = req.url;
  req.url = '/machine-types/' + req.params.id;
  req.baseUrl = '/api/system';
  systemRoutes(req, res, next);
});
app.use('/api/settings', systemRoutes); // Settings endpoints compatibility
app.use('/api/system', systemRoutes); // System routes

// =============================================================================
// MISSING ENDPOINTS - Added directly for compatibility
// =============================================================================

// Import required modules for direct endpoints
const DatabaseUtils = require('./utils/database');
const { authenticateToken, requireRole } = require('./middleware/auth');

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
    
    // Broadcast update via WebSocket if available
    if (req.broadcast) {
      req.broadcast('maturation_room_added', result, 'production');
    }
    
    return res.success(result, 'Order added to maturation room successfully');
  } catch (error) {
    console.error('❌ Failed to add to maturation room:', error);
    return res.error('Failed to add to maturation room', error.message);
  }
});

// =============================================================================

// Catch-all for frontend routes (SPA) - exclude API routes
app.get('*', (req, res, next) => {
  // Let API routes go to 404 handler
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve frontend for non-API routes
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);

// Test function to verify components work
const testComponents = async () => {
  console.log('🧪 Testing refactored components...');
  
  try {
    // Test database connection
    const db = require('./config/database');
    await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection: OK');
    
    // Test authentication middleware
    const auth = require('./middleware/auth');
    const testToken = auth.generateToken({ id: 1, username: 'test', role: 'admin' });
    const decoded = auth.verifyToken(testToken);
    console.log('✅ Authentication middleware: OK');
    
    // Test response utilities
    const { ResponseUtils } = require('./utils/response');
    console.log('✅ Response utilities: OK');
    
    // Test database utils
    const DatabaseUtils = require('./utils/database');
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
  
  // Create HTTP server for WebSocket integration FIRST  
  const server = http.createServer(app);
  
  // Initialize WebSocket server IMMEDIATELY (like original server.js)
  const websocketService = initializeWebSocket(server);
  globalWebSocketService = websocketService;
  
  // Start WebSocket cleanup scheduler
  startCleanupSchedule();
  
  // Add global broadcast function (compatibility with original server.js)
  global.broadcast = (type, data, channel = 'all') => {
    if (globalWebSocketService) {
      return globalWebSocketService.broadcast(type, data, channel);
    } else {
      console.warn('⚠️ WebSocket service not initialized, cannot broadcast:', type);
      return 0;
    }
  };
  
  // Test components (but don't block server startup)
  testComponents().then(() => {
    console.log('✅ All components tested successfully');
  }).catch(error => {
    console.warn('⚠️ Component tests failed, but server will continue:', error.message);
  });
  
  // Start server immediately (like original server.js)
  server.listen(PORT, () => {
    console.log(`🚀 Production refactored server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth test: http://localhost:${PORT}/api/auth/login`);  
    console.log(`⚙️ System routes: http://localhost:${PORT}/api/system/health`);
    console.log(`🌐 WebSocket server initialized and ready`);
  });
}

module.exports = { app, testComponents };