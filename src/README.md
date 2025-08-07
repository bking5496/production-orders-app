# src/ - Modular Backend Architecture

## 🏗️ **Overview**
The `src/` directory contains the completely refactored backend architecture, transforming the monolithic 3,889-line server.js into a maintainable, scalable service-oriented system.

## 📁 **Directory Structure**

### **Architecture Layers**
```
src/
├── 📊 services/          # Business Logic Layer
├── 🛣️ routes/           # HTTP Endpoint Layer  
├── 🔧 middleware/       # Express Middleware Layer
├── 🗄️ config/          # Configuration Layer
├── 🛠️ utils/           # Utility Functions Layer
└── 🧪 server-refactored.js  # Test Server
```

## 📊 **Services Layer** (`/services/`)
**Purpose:** Pure business logic, data processing, and core application functionality

### **Service Classes:**
- **`orders.service.js`** - Production order lifecycle management
- **`machines.service.js`** - Machine status, performance, and scheduling
- **`users.service.js`** - User management and authentication logic
- **`labor.service.js`** - Labor planning and workforce management
- **`analytics.service.js`** - Dashboard metrics and business intelligence
- **`reports.service.js`** - Report generation and CSV exports
- **`websocket.service.js`** - Real-time communication management
- **`system.service.js`** - System health, settings, and configuration

### **Service Pattern:**
```javascript
class ServiceName {
  async businessMethod(data, userId) {
    // 1. Validation
    // 2. Business rules
    // 3. Database operations
    // 4. Return processed data
  }
}
```

## 🛣️ **Routes Layer** (`/routes/`)
**Purpose:** HTTP endpoint definitions, request/response handling, and middleware orchestration

### **Route Modules:**
- **`auth.routes.js`** - Authentication endpoints (login, register, verify)
- **`orders.routes.js`** - Production orders API (CRUD + lifecycle)
- **`machines.routes.js`** - Machine management API
- **`users.routes.js`** - User management API
- **`labor.routes.js`** - Labor planning API
- **`analytics.routes.js`** - Dashboard and analytics API
- **`reports.routes.js`** - Reporting and export API
- **`system.routes.js`** - System management API

### **Route Pattern:**
```javascript
router.method('/endpoint', 
  authenticateToken,                    // Authentication
  requireRole(['admin']),              // Authorization
  [body('field').notEmpty()],          // Validation
  asyncHandler(async (req, res) => {   // Handler
    const result = await service.method(req.body, req.user.id);
    req.broadcast('event', result, 'channel'); // Real-time
    return res.success(result, 'Success message', 201);
  })
);
```

## 🔧 **Middleware Layer** (`/middleware/`)
**Purpose:** Request processing pipeline, authentication, error handling, and WebSocket integration

### **Middleware Components:**
- **`auth.js`** - JWT authentication and role-based access control
- **`error-handler.js`** - Global error handling and custom error classes
- **`websocket.js`** - WebSocket integration for Express routes

### **Middleware Features:**
- **Authentication Pipeline:** JWT validation → User context → Role verification
- **Error Handling:** Consistent error responses with proper status codes
- **WebSocket Integration:** Real-time communication available in all routes

## 🗄️ **Config Layer** (`/config/`)
**Purpose:** Application configuration and external service connections

### **Configuration Modules:**
- **`database.js`** - PostgreSQL connection management with pooling

### **Database Configuration:**
- **Connection Pooling:** Efficient connection reuse
- **Health Monitoring:** Connection status verification
- **Transaction Support:** ACID compliance for complex operations

## 🛠️ **Utils Layer** (`/utils/`)
**Purpose:** Reusable utility functions and common operations

### **Utility Modules:**
- **`database.js`** - Standardized CRUD operations and query utilities
- **`response.js`** - Consistent API response formatting

### **Database Utils Features:**
```javascript
// Standardized operations
await DatabaseUtils.select('table', { conditions });
await DatabaseUtils.insert('table', data, 'returning');
await DatabaseUtils.update('table', data, conditions, 'returning');
await DatabaseUtils.delete('table', conditions);
await DatabaseUtils.transaction([operations]);
```

### **Response Utils Features:**
```javascript
// Consistent API responses
res.success(data, message, statusCode);
res.error(message, statusCode, details);
res.validationError(errors, message);
```

## 🧪 **Test Server** (`server-refactored.js`)
**Purpose:** Modular server implementation for testing and validation

### **Features:**
- **Port 3001:** Runs alongside production server for testing
- **Component Testing:** Individual service and route validation
- **Health Checks:** Automated component health verification
- **WebSocket Integration:** Full real-time communication testing

### **Usage:**
```bash
# Start test server
node src/server-refactored.js

# Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/system/health
```

## 🔄 **Data Flow Architecture**

### **Request Flow:**
```
1. HTTP Request → Router
2. Router → Middleware (Auth, Validation)
3. Middleware → Route Handler
4. Route Handler → Service Method
5. Service → Database Utils
6. Database Utils → PostgreSQL
7. Response ← Service ← Database
8. WebSocket Broadcast (if applicable)
9. HTTP Response ← Route Handler
```

### **Real-Time Flow:**
```
1. Business Event → Service
2. Service → req.broadcast()
3. WebSocket Service → Channel Filtering
4. Channel Filtering → Role-Based Distribution
5. Connected Clients ← Real-Time Update
```

## 🔒 **Security Architecture**

### **Multi-Layer Security:**
1. **JWT Authentication:** Stateless token-based authentication
2. **Role-Based Access:** Granular permission controls
3. **Request Validation:** Input sanitization and validation
4. **WebSocket Security:** Token-based WebSocket authentication
5. **Database Security:** Parameterized queries and connection pooling

## 📈 **Performance Optimizations**

### **Database Performance:**
- **Connection Pooling:** Efficient connection reuse
- **Prepared Statements:** Query optimization
- **Transaction Management:** Atomic operations

### **WebSocket Performance:**
- **Connection Cleanup:** Automatic removal of inactive connections
- **Channel Filtering:** Efficient message distribution
- **Heartbeat Monitoring:** Connection health verification

### **Memory Management:**
- **Service Instances:** Singleton pattern for service classes
- **Connection Pools:** Limited database connections
- **Cleanup Schedules:** Regular cleanup of inactive resources

## 🧪 **Testing Strategy**

### **Component Testing:**
- **Service Testing:** Unit tests for business logic
- **Route Testing:** Integration tests for API endpoints
- **Database Testing:** Connection and query validation
- **WebSocket Testing:** Real-time communication verification

### **Health Monitoring:**
- **System Health:** Comprehensive health check endpoints
- **Component Status:** Individual component health verification
- **Performance Metrics:** System performance monitoring

## 🚀 **Deployment Considerations**

### **Production Readiness:**
- **Backward Compatibility:** 100% API compatibility maintained
- **Zero Downtime:** Side-by-side deployment capability
- **Health Checks:** Production health monitoring
- **Error Recovery:** Robust error handling and recovery

### **Migration Strategy:**
1. **Current:** Original server.js runs production
2. **Testing:** Refactored components tested on port 3001
3. **Validation:** Complete functionality verification
4. **Migration:** Gradual migration to refactored architecture

---

*This modular architecture provides a solid foundation for scalable, maintainable, and testable backend development while preserving all existing functionality.*