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
const maturationRoutes = require('./routes/maturation.routes');

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

// DEBUG: Test environments endpoint without auth
app.get('/api/debug/environments', async (req, res) => {
  try {
    console.log('🌍 DEBUG: Testing environments service...');
    const systemService = require('./services/system.service');
    const environments = await systemService.getEnvironments();
    
    console.log('🌍 DEBUG: Environments service returned:', environments?.length || 0, 'environments');
    console.log('🌍 DEBUG: Sample environment:', environments?.[0] || 'No environments');
    
    res.json({
      success: true,
      debug: 'environments service test',
      count: environments?.length || 0,
      data: environments || [],
      message: `Found ${environments?.length || 0} environments`
    });
  } catch (error) {
    console.error('🌍 DEBUG: Environments service error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// DEBUG: Test machines endpoint without auth  
app.get('/api/debug/machines', async (req, res) => {
  try {
    console.log('🔧 DEBUG: Testing machines service...');
    const machinesService = require('./services/machines.service');
    const machines = await machinesService.getAllMachines();
    
    console.log('🔧 DEBUG: Machines service returned:', machines?.length || 0, 'machines');
    console.log('🔧 DEBUG: Sample machine:', machines?.[0] || 'No machines');
    
    res.json({
      success: true,
      debug: 'machines service test',
      count: machines?.length || 0,
      data: machines || [],
      message: `Found ${machines?.length || 0} machines`
    });
  } catch (error) {
    console.error('🔧 DEBUG: Machines service error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// DEBUG: Test the routing issue for environments
app.get('/api/debug/environments-route', async (req, res) => {
  try {
    console.log('🌍 DEBUG: Testing environments routing...');
    
    // Test direct system service call
    const systemService = require('./services/system.service');
    const environments = await systemService.getEnvironments();
    console.log('🌍 DEBUG: Direct service call returned:', environments?.length || 0);
    
    // Test with modified request (like the actual routing does)
    const mockReq = {
      originalUrl: '/api/environments',
      url: '/environments',
      baseUrl: '/api/system'
    };
    
    res.json({
      success: true,
      debug: 'environments routing test',
      directService: {
        count: environments?.length || 0,
        data: environments || []
      },
      routingTest: mockReq,
      message: `Direct service: ${environments?.length || 0} environments`
    });
  } catch (error) {
    console.error('🌍 DEBUG: Environments routing error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// DEBUG: Test authenticated route directly
app.get('/api/debug/system-environments', async (req, res) => {
  try {
    console.log('🌍 DEBUG: Testing /api/system/environments directly...');
    
    // Import required modules
    const { authenticateToken } = require('./middleware/auth');
    const systemService = require('./services/system.service');
    
    // Test with a mock authenticated user
    const mockUser = { id: 4, username: 'admin', role: 'admin' };
    
    const environments = await systemService.getEnvironments();
    
    res.json({
      success: true,
      debug: 'system/environments test',
      mockUser: mockUser,
      count: environments?.length || 0,
      data: environments || [],
      message: `Found ${environments?.length || 0} environments via system route`
    });
  } catch (error) {
    console.error('🌍 DEBUG: System environments error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
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
app.use('/api/maturation', maturationRoutes);

// Legacy route compatibility
app.use('/api/labour', laborRoutes); // British spelling compatibility
app.use('/api/planner', plannerRoutes); // Legacy planner endpoint compatibility
app.use('/api/labor-planner', plannerRoutes); // Labor planner with dash compatibility
app.use('/api/maturation-room', maturationRoutes); // Legacy maturation-room endpoint compatibility

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
// Environments endpoints - direct forwarding to system service
const systemService = require('./services/system.service');
const { authenticateToken, requireRole } = require('./middleware/auth');

app.get('/api/environments', authenticateToken, async (req, res) => {
  try {
    const environments = await systemService.getEnvironments();
    return res.success(environments, 'Environments retrieved successfully');
  } catch (error) {
    console.error('🌍 Error retrieving environments:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve environments'
    });
  }
});

app.post('/api/environments', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const newEnvironment = await systemService.createEnvironment(req.body, req.user.id);
    return res.success(newEnvironment, 'Environment created successfully', 201);
  } catch (error) {
    console.error('🌍 Error creating environment:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create environment'
    });
  }
});

app.put('/api/environments/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const updatedEnvironment = await systemService.updateEnvironment(
      parseInt(req.params.id), 
      req.body, 
      req.user.id
    );
    return res.success(updatedEnvironment, 'Environment updated successfully');
  } catch (error) {
    console.error('🌍 Error updating environment:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to update environment'
    });
  }
});

app.delete('/api/environments/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await systemService.deleteEnvironment(parseInt(req.params.id), req.user.id);
    return res.success(null, 'Environment deleted successfully');
  } catch (error) {
    console.error('🌍 Error deleting environment:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to delete environment'
    });
  }
});

// Machine Types endpoints - direct forwarding to system service
app.get('/api/machine-types', authenticateToken, async (req, res) => {
  try {
    const machineTypes = await systemService.getMachineTypes();
    return res.success(machineTypes, 'Machine types retrieved successfully');
  } catch (error) {
    console.error('⚙️ Error retrieving machine types:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve machine types'
    });
  }
});

app.post('/api/machine-types', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const newMachineType = await systemService.createMachineType(req.body, req.user.id);
    return res.success(newMachineType, 'Machine type created successfully', 201);
  } catch (error) {
    console.error('⚙️ Error creating machine type:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create machine type'
    });
  }
});

app.put('/api/machine-types/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const updatedMachineType = await systemService.updateMachineType(
      parseInt(req.params.id), 
      req.body, 
      req.user.id
    );
    return res.success(updatedMachineType, 'Machine type updated successfully');
  } catch (error) {
    console.error('⚙️ Error updating machine type:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to update machine type'
    });
  }
});

app.delete('/api/machine-types/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await systemService.deleteMachineType(parseInt(req.params.id), req.user.id);
    return res.success(null, 'Machine type deleted successfully');
  } catch (error) {
    console.error('⚙️ Error deleting machine type:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to delete machine type'
    });
  }
});
app.use('/api/settings', systemRoutes); // Settings endpoints compatibility
app.use('/api/system', systemRoutes); // System routes


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