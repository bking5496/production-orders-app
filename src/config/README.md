# config/ - Configuration Management Layer

## 🗄️ **Overview**
The config layer handles application configuration, database connections, and external service integrations. This layer ensures consistent configuration management across all environments.

## 📁 **Configuration Structure**

### 🗄️ **database.js** - PostgreSQL Database Configuration
**Purpose:** Database connection management, connection pooling, and database health monitoring

#### **Core Features:**
- PostgreSQL connection pooling
- Health monitoring and logging
- Error handling and recovery
- Environment-based configuration
- Security integration with secrets manager

#### **Database Configuration:**
```javascript
const { Pool } = require('pg');
const { getSecret } = require('../../security/secrets-manager');

// PostgreSQL connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: getSecret('DB_PASSWORD'), // Secure password management
  database: process.env.DB_NAME || 'production_orders',
  
  // Connection pool settings
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
  maxUses: 7500,             // Close (and replace) a connection after it has been used this many times
  allowExitOnIdle: false      // Don't exit the process when all clients are idle
});

// Connection event handlers
pool.on('connect', (client) => {
  console.log('✅ New PostgreSQL client connected');
  console.log('🔗 Client acquired from pool');
});

pool.on('acquire', (client) => {
  console.log('🔗 Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('🔓 Client removed from pool');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});
```

#### **Health Monitoring:**
```javascript
// Database health check function
async function checkDatabaseHealth() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    
    return {
      status: 'healthy',
      connection: 'active',
      currentTime: result.rows[0].current_time,
      version: result.rows[0].version,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed'
    };
  }
}
```

#### **Query Interface:**
```javascript
// Standard query interface
const query = (text, params) => {
  console.log('🔗 Client acquired from pool');
  return pool.query(text, params).finally(() => {
    console.log('🔓 Client released back to pool');
  });
};

// Connection getter for advanced operations
const getPool = () => pool;

// Graceful shutdown
const closePool = async () => {
  console.log('🔌 Closing database connection pool...');
  await pool.end();
  console.log('✅ Database pool closed');
};

module.exports = {
  query,
  getPool,
  checkDatabaseHealth,
  closePool
};
```

#### **Environment Configuration:**
```javascript
// Environment-specific database configurations
const configurations = {
  development: {
    host: 'localhost',
    port: 5432,
    database: 'production_orders_dev',
    max: 5,  // Smaller pool for development
    ssl: false
  },
  
  test: {
    host: 'localhost',  
    port: 5432,
    database: 'production_orders_test',
    max: 2,  // Minimal pool for testing
    ssl: false
  },
  
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    max: 20, // Full pool for production
    ssl: {
      rejectUnauthorized: false // Configure based on your SSL setup
    }
  }
};

const currentConfig = configurations[process.env.NODE_ENV || 'development'];
```

#### **Security Features:**
- **Secrets Integration:** Uses secrets-manager for secure password handling
- **Connection Security:** SSL configuration for production environments
- **Error Sanitization:** Prevents exposure of sensitive connection details
- **Connection Limits:** Prevents connection exhaustion attacks

#### **Performance Features:**
- **Connection Pooling:** Efficient connection reuse
- **Connection Health Monitoring:** Automatic unhealthy connection removal
- **Query Logging:** Performance monitoring and debugging
- **Graceful Shutdown:** Proper connection cleanup on application exit

#### **Usage Examples:**
```javascript
const db = require('./src/config/database');

// Simple query
const users = await db.query('SELECT * FROM users WHERE active = $1', [true]);

// Health check
const health = await db.checkDatabaseHealth();
console.log('Database Status:', health.status);

// Advanced operations using pool directly
const pool = db.getPool();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const result1 = await client.query('INSERT INTO orders (...) VALUES (...)', []);
  const result2 = await client.query('UPDATE inventory SET quantity = quantity - $1', []);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## 🔧 **Configuration Best Practices**

### **Environment Management**
- Use environment variables for environment-specific settings
- Secure sensitive configuration using secrets manager
- Validate configuration on application startup
- Provide sensible defaults for optional settings

### **Database Connection**
- Configure appropriate pool sizes for each environment
- Monitor connection health and pool statistics
- Implement proper error handling and recovery
- Use SSL for production database connections

### **Performance Optimization**
- Tune connection pool parameters for your workload
- Monitor query performance and connection usage
- Implement connection retry logic for transient failures
- Use read replicas for read-heavy operations (when available)

### **Security Considerations**
- Never hardcode passwords or sensitive configuration
- Use TLS/SSL for database connections in production
- Implement proper connection string sanitization
- Audit database configuration changes

## 📊 **Monitoring and Diagnostics**

### **Connection Pool Monitoring**
```javascript
// Get pool statistics
const getPoolStats = () => ({
  totalConnections: pool.totalCount,
  idleConnections: pool.idleCount,  
  waitingClients: pool.waitingCount,
  maxConnections: pool.options.max
});

// Log pool statistics periodically
setInterval(() => {
  const stats = getPoolStats();
  console.log('📊 Pool Stats:', stats);
  
  if (stats.waitingClients > 0) {
    console.warn('⚠️ Clients waiting for connections:', stats.waitingClients);
  }
  
  if (stats.idleConnections === 0 && stats.totalConnections === stats.maxConnections) {
    console.warn('⚠️ Connection pool exhausted');
  }
}, 60000); // Every minute
```

### **Health Check Integration**
```javascript
// Comprehensive database health check
async function fullHealthCheck() {
  try {
    const health = await checkDatabaseHealth();
    const stats = getPoolStats();
    
    return {
      ...health,
      poolHealth: {
        utilization: (stats.totalConnections - stats.idleConnections) / stats.maxConnections,
        connections: stats,
        status: stats.waitingClients > 0 ? 'degraded' : 'healthy'
      }
    };
  } catch (error) {
    return {
      status: 'critical',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

## 🧪 **Testing Configuration**

### **Test Database Setup**
```javascript
// Test-specific database configuration
const testConfig = {
  ...baseConfig,
  database: 'production_orders_test',
  max: 2, // Minimal connections for testing
  idleTimeoutMillis: 1000 // Faster cleanup in tests
};

// Test utilities
const setupTestDatabase = async () => {
  // Create test tables, seed data, etc.
};

const cleanupTestDatabase = async () => {
  // Clean up test data
};

module.exports = {
  testConfig,
  setupTestDatabase,
  cleanupTestDatabase
};
```

## 🚀 **Future Configuration Extensions**

### **Multi-Database Support**
```javascript
// Example: Read/Write splitting configuration
const configurations = {
  write: {
    host: 'primary-db.example.com',
    // ... other config
  },
  read: {
    host: 'replica-db.example.com',
    // ... other config
  }
};
```

### **Caching Configuration**
```javascript
// Redis configuration example
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: getSecret('REDIS_PASSWORD'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};
```

### **External Service Configuration**
```javascript
// Example: External API configurations
const apiConfigs = {
  erp: {
    baseUrl: process.env.ERP_API_URL,
    apiKey: getSecret('ERP_API_KEY'),
    timeout: 30000
  },
  notification: {
    serviceUrl: process.env.NOTIFICATION_SERVICE_URL,
    apiKey: getSecret('NOTIFICATION_API_KEY')
  }
};
```

---

*The configuration layer provides a centralized, secure, and maintainable approach to managing all application settings and external service connections.*