// production-config.js - Production configuration helper

const fs = require('fs');
const path = require('path');

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Validate environment variables
function validateEnvironment() {
  const required = [
    'JWT_SECRET',
    'ADMIN_EMAIL',
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    console.error('Please check your .env file');
    
    if (isProduction) {
      process.exit(1);
    }
  }
  
  // Warn about default values in production
  if (isProduction) {
    if (process.env.JWT_SECRET === 'your-very-secure-secret-key') {
      console.error('CRITICAL: Using default JWT_SECRET in production!');
      console.error('Please set a secure JWT_SECRET in your .env file');
      process.exit(1);
    }
    
    if (process.env.ADMIN_PASSWORD === 'changeme123') {
      console.warn('WARNING: Using default admin password. Please change it immediately!');
    }
  }
}

// Create required directories
function createDirectories() {
  const dirs = ['uploads', 'logs', 'backups'];
  
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}/`);
    }
  });
}

// Production optimizations for SQLite
function optimizeDatabase(db) {
  if (isProduction) {
    // Enable WAL mode for better concurrency
    db.run('PRAGMA journal_mode = WAL');
    
    // Optimize query performance
    db.run('PRAGMA cache_size = -20000'); // 20MB cache
    db.run('PRAGMA temp_store = MEMORY');
    db.run('PRAGMA synchronous = NORMAL'); // Balance between safety and speed
    
    // Run optimization periodically
    setInterval(() => {
      db.run('PRAGMA optimize');
    }, 3600000); // Every hour
  }
}

// Security headers for production
function getSecurityHeaders() {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}

// Rate limiting configuration
function getRateLimitConfig() {
  return {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 1000, // Limit requests per window
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  };
}

// Logging configuration
function getLoggerConfig() {
  return {
    level: isProduction ? 'info' : 'debug',
    format: 'combined',
    defaultMeta: { service: 'production-management' },
    transports: [
      {
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      },
      {
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }
    ]
  };
}

module.exports = {
  isProduction,
  validateEnvironment,
  createDirectories,
  optimizeDatabase,
  getSecurityHeaders,
  getRateLimitConfig,
  getLoggerConfig
};
