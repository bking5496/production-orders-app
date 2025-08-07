# middleware/ - Express Middleware Layer

## 🔧 **Overview**
The middleware layer provides Express middleware components that handle cross-cutting concerns like authentication, error handling, and WebSocket integration. These middleware components create a processing pipeline for all HTTP requests.

## 🏗️ **Middleware Architecture**

### **Design Principles**
- **Single Responsibility:** Each middleware handles one specific concern
- **Chain Processing:** Middleware can be composed in a processing pipeline
- **Request Enhancement:** Add functionality and context to request objects
- **Error Boundary:** Proper error handling and propagation
- **Reusability:** Middleware can be used across multiple routes

### **Middleware Pattern**
```javascript
const middlewareName = (options = {}) => {
  return (req, res, next) => {
    try {
      // 1. Process request
      // 2. Add context to req/res objects
      // 3. Validate conditions
      // 4. Call next() or handle error
      
      next(); // Continue to next middleware/route
    } catch (error) {
      next(error); // Pass error to error handler
    }
  };
};
```

## 🔧 **Middleware Components**

### 🔐 **auth.js** - Authentication & Authorization Middleware
**Purpose:** JWT authentication, user context, and role-based access control

#### **Core Functions:**

##### **`authenticateToken`** - JWT Authentication
```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.error('Access token required', 401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.error('Invalid or expired token', 403);
    }
    
    req.user = user; // Add user context to request
    next();
  });
};
```

##### **`requireRole`** - Role-Based Authorization
```javascript
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.error('Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.error('Insufficient permissions', 403);
    }

    next();
  };
};
```

##### **`optionalAuth`** - Optional Authentication
```javascript
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user; // Add user if token is valid
      }
      next(); // Continue regardless of token validity
    });
  } else {
    next(); // No token provided, continue without user context
  }
};
```

#### **Usage Examples:**
```javascript
// Require authentication
router.get('/protected', authenticateToken, handler);

// Require specific role
router.post('/admin', authenticateToken, requireRole(['admin']), handler);

// Multiple roles allowed
router.get('/management', authenticateToken, requireRole(['admin', 'supervisor']), handler);

// Optional authentication
router.get('/public-with-context', optionalAuth, handler);
```

#### **Features:**
- JWT token validation and decoding
- User context injection into requests
- Role-based access control
- Token expiration handling
- Security logging and audit trails

---

### ❌ **error-handler.js** - Global Error Handling
**Purpose:** Centralized error processing, custom error types, and consistent error responses

#### **Custom Error Classes:**

##### **`ValidationError`** - Input Validation Errors
```javascript
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}
```

##### **`NotFoundError`** - Resource Not Found Errors
```javascript
class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}
```

##### **`UnauthorizedError`** - Authentication Errors
```javascript
class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}
```

#### **Global Error Handler:**
```javascript
const errorHandler = (err, req, res, next) => {
  // Log error details
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.username || 'anonymous'
  });

  // Handle different error types
  if (err instanceof ValidationError) {
    return res.error(err.message, 400, { type: 'validation' });
  }

  if (err instanceof NotFoundError) {
    return res.error(err.message, 404, { type: 'not_found' });
  }

  if (err instanceof UnauthorizedError) {
    return res.error(err.message, 401, { type: 'unauthorized' });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.error('Invalid token', 401, { type: 'token_invalid' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.error('Token expired', 401, { type: 'token_expired' });
  }

  // Handle database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.error('Duplicate entry', 409, { type: 'duplicate' });
  }

  // Default server error
  return res.error('Internal server error', 500, { 
    type: 'server_error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

#### **Async Error Handler:**
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

#### **Usage Examples:**
```javascript
// Wrap async route handlers
router.get('/orders', asyncHandler(async (req, res) => {
  const orders = await ordersService.getOrders();
  return res.success(orders);
}));

// Throw custom errors in services
if (!order) {
  throw new NotFoundError('Order');
}

if (!validInput) {
  throw new ValidationError('Invalid order data');
}
```

#### **Features:**
- Custom error classes for different error types
- Consistent error response formatting
- Error logging and monitoring
- Development vs production error details
- Database error handling
- JWT error handling

---

### 🌐 **websocket.js** - WebSocket Integration Middleware
**Purpose:** Integrate WebSocket functionality with Express routes and provide real-time communication

#### **Core Functions:**

##### **`initializeWebSocket`** - Server Initialization
```javascript
function initializeWebSocket(server) {
  return websocketService.initialize(server);
}
```

##### **`addWebSocketToApp`** - Express Integration
```javascript
function addWebSocketToApp(req, res, next) {
  // Add broadcast function to app instance
  if (!req.app.get('broadcast')) {
    req.app.set('broadcast', websocketService.getBroadcastFunction());
    req.app.set('websocketService', websocketService);
  }
  
  // Add WebSocket utilities to request object
  req.broadcast = websocketService.getBroadcastFunction();
  req.sendToUser = websocketService.sendToUser.bind(websocketService);
  req.websocket = {
    broadcast: websocketService.broadcast.bind(websocketService),
    sendToUser: websocketService.sendToUser.bind(websocketService),
    getConnectedCount: websocketService.getConnectedClientsCount.bind(websocketService),
    getClientsByChannel: websocketService.getClientsByChannel.bind(websocketService)
  };
  
  next();
}
```

##### **`startCleanupSchedule`** - Connection Management
```javascript
function startCleanupSchedule(intervalMs = 300000) { // 5 minutes
  setInterval(() => {
    websocketService.cleanupInactiveConnections();
  }, intervalMs);
  
  console.log('🧹 WebSocket cleanup scheduler started');
}
```

#### **WebSocket Integration in Routes:**
```javascript
router.post('/orders', 
  authenticateToken,
  asyncHandler(async (req, res) => {
    const order = await ordersService.createOrder(req.body, req.user.id);
    
    // Real-time broadcast to all subscribed clients
    req.broadcast('order_created', order, 'production');
    
    // Send notification to supervisor
    req.websocket.sendToUser(supervisorId, 'new_order', {
      message: 'New order created',
      order: order
    });
    
    // Get connection statistics
    const connectionCount = req.websocket.getConnectedCount();
    console.log(`Broadcast sent to ${connectionCount} connected clients`);
    
    return res.success(order, 'Order created successfully', 201);
  })
);
```

#### **WebSocket Authentication Flow:**
```javascript
// Client connects with JWT token
const ws = new WebSocket('ws://localhost:3001?token=YOUR_JWT_TOKEN');

// Server validates token and creates authenticated connection
// Client receives welcome message with user context
```

#### **Channel-Based Broadcasting:**
```javascript
// Available channels with role-based access
const channels = {
  'general': ['all'],                    // General notifications
  'production': ['admin', 'supervisor', 'operator'], // Production updates  
  'machines': ['admin', 'supervisor', 'operator'],   // Machine status
  'alerts': ['admin', 'supervisor'],                 // System alerts
  'admin': ['admin'],                                // Admin-only
  'analytics': ['admin', 'supervisor']               // Analytics updates
};

// Broadcasting to specific channels
req.broadcast('machine_status_changed', machineData, 'machines');
req.broadcast('system_alert', alertData, 'alerts');
req.broadcast('production_milestone', milestoneData, 'production');
```

#### **Features:**
- JWT-authenticated WebSocket connections
- Channel-based message distribution
- Role-based subscription management
- Room-based targeted messaging
- Connection health monitoring
- Automatic cleanup of inactive connections
- Seamless Express integration

---

## 🔄 **Middleware Pipeline**

### **Request Processing Flow**
```javascript
// Typical middleware pipeline for protected routes
app.use('/api', [
  addResponseUtils,        // Add response helpers
  addWebSocketToApp,       // Add WebSocket functionality
  authenticateToken,       // Authenticate user
  requireRole(['admin']),  // Check permissions
  routeHandler,           // Execute business logic
  errorHandler            // Handle any errors
]);
```

### **Conditional Middleware**
```javascript
// Apply middleware conditionally
const conditionalAuth = (req, res, next) => {
  if (req.path.startsWith('/api/public')) {
    return next(); // Skip authentication for public routes
  }
  return authenticateToken(req, res, next);
};
```

### **Middleware Composition**
```javascript
// Compose multiple middleware functions
const secureAdminRoute = [
  authenticateToken,
  requireRole(['admin']),
  addWebSocketToApp
];

router.use('/admin', secureAdminRoute);
```

## 🔒 **Security Considerations**

### **Authentication Security**
- JWT token validation and expiration
- Secure token storage recommendations
- Rate limiting for authentication endpoints
- Brute force protection
- Session management

### **WebSocket Security**
- Token-based WebSocket authentication
- Channel access control based on roles
- Message rate limiting
- Connection timeout management
- Audit logging for WebSocket events

### **Error Handling Security**
- Sensitive information filtering in error responses
- Different error details for development vs production
- Security-related error logging
- Error response consistency

## 🧪 **Testing Middleware**

### **Unit Testing**
```javascript
describe('authenticateToken middleware', () => {
  test('should authenticate valid token', async () => {
    const req = { headers: { authorization: 'Bearer valid_token' } };
    const res = {};
    const next = jest.fn();

    jwt.verify = jest.fn().mockImplementation((token, secret, callback) => {
      callback(null, { id: 1, username: 'test', role: 'admin' });
    });

    authenticateToken(req, res, next);

    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
```

### **Integration Testing**
```javascript
describe('WebSocket Integration', () => {
  test('should add WebSocket functions to request', () => {
    const req = { app: { get: jest.fn(), set: jest.fn() } };
    const res = {};
    const next = jest.fn();

    addWebSocketToApp(req, res, next);

    expect(req.broadcast).toBeDefined();
    expect(req.websocket).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
```

## 📊 **Performance Considerations**

### **Authentication Performance**
- JWT token caching for frequently accessed tokens
- Efficient role checking algorithms
- Database connection optimization for user lookups
- Rate limiting to prevent abuse

### **WebSocket Performance**
- Connection pooling and management
- Efficient message broadcasting algorithms
- Memory management for connection metadata
- Cleanup schedules for inactive connections

### **Error Handling Performance**
- Efficient error logging without blocking requests
- Error aggregation and batching
- Performance monitoring for error rates

## 🚀 **Best Practices**

### **Middleware Development**
1. **Single Responsibility** - Each middleware handles one concern
2. **Error Handling** - Always handle errors gracefully
3. **Next() Calls** - Always call next() or handle response
4. **Performance** - Minimize processing overhead
5. **Testing** - Write comprehensive tests for all middleware

### **Security Best Practices**
1. **Input Validation** - Validate all inputs in middleware
2. **Error Messages** - Don't expose sensitive information
3. **Logging** - Log security-related events
4. **Rate Limiting** - Implement appropriate rate limits
5. **Token Security** - Handle tokens securely

### **WebSocket Best Practices**
1. **Authentication** - Always authenticate WebSocket connections
2. **Channel Control** - Implement proper channel access control
3. **Connection Cleanup** - Regular cleanup of inactive connections
4. **Message Validation** - Validate all WebSocket messages
5. **Performance Monitoring** - Monitor WebSocket performance

---

*The middleware layer provides essential cross-cutting functionality that enhances security, performance, and real-time capabilities across the entire application.*