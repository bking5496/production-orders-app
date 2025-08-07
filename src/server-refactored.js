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

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://oracles.africa'
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
  const PORT = process.env.PORT || 3001; // Use different port for testing
  
  testComponents().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Refactored server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth test: http://localhost:${PORT}/api/auth/login`);
    });
  }).catch(error => {
    console.error('❌ Failed to start refactored server:', error);
    process.exit(1);
  });
}

module.exports = { app, testComponents };