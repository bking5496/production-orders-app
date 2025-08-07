# routes/ - HTTP Endpoint Layer

## 🛣️ **Overview**
The routes layer handles HTTP endpoint definitions, request/response processing, middleware orchestration, and real-time communication integration. Each route module corresponds to a specific API domain.

## 🏗️ **Route Architecture**

### **Design Principles**
- **HTTP Concerns Only:** Handle request/response, authentication, validation
- **Service Delegation:** Delegate business logic to service classes
- **Consistent Patterns:** Standardized endpoint structure and responses
- **Real-Time Integration:** WebSocket broadcasting for live updates
- **Error Handling:** Proper HTTP status codes and error responses

### **Route Pattern**
```javascript
router.method('/endpoint/:param', 
  authenticateToken,                    // Authentication middleware
  requireRole(['admin', 'supervisor']), // Authorization middleware
  [
    param('id').isInt(),               // Parameter validation
    body('field').notEmpty()           // Body validation
  ],
  asyncHandler(async (req, res) => {   // Async error handling
    // 1. Extract data
    const data = req.body;
    const userId = req.user.id;

    // 2. Call service
    const result = await service.businessMethod(data, userId);

    // 3. Real-time broadcast (if applicable)
    req.broadcast('event_type', result, 'channel_name');

    // 4. Return response
    return res.success(result, 'Success message', 201);
  })
);
```

## 📋 **Route Modules**

### 🔐 **auth.routes.js** - Authentication API
**Base Path:** `/api/auth`

#### **Endpoints:**
```javascript
POST   /login          // User authentication
POST   /register       // User registration (admin only)
POST   /verify         // Token verification
POST   /refresh        // Token refresh
POST   /logout         // User logout
GET    /profile        // Get user profile
PUT    /profile        // Update user profile
PUT    /password       // Change password
```

#### **Key Features:**
- JWT token generation and validation
- Role-based registration controls
- Password hashing and verification
- Token refresh mechanism
- Profile management

#### **Example Usage:**
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Get profile (authenticated)
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 📦 **orders.routes.js** - Production Orders API
**Base Path:** `/api/orders`

#### **Endpoints:**
```javascript
GET    /                    // Get all orders with filtering
POST   /                    // Create new order
GET    /:id                 // Get order by ID
PUT    /:id                 // Update order
DELETE /:id                 // Delete order
PUT    /:id/status          // Update order status
POST   /:id/start           // Start production
POST   /:id/pause           // Pause production
POST   /:id/complete        // Complete production
GET    /:id/history         // Get order history
POST   /:id/notes           // Add order notes
GET    /stats               // Order statistics
```

#### **Key Features:**
- Complete order lifecycle management
- Production status transitions
- Real-time status broadcasting
- Order history tracking
- Bulk operations support

#### **Real-Time Events:**
```javascript
// Broadcasts on order events
req.broadcast('order_created', orderData, 'production');
req.broadcast('order_status_changed', statusData, 'production');
req.broadcast('production_started', productionData, 'machines');
```

---

### 🏭 **machines.routes.js** - Machine Management API
**Base Path:** `/api/machines`

#### **Endpoints:**
```javascript
GET    /                    // Get all machines with filtering
POST   /                    // Create new machine
GET    /:id                 // Get machine by ID
PUT    /:id                 // Update machine
DELETE /:id                 // Delete machine
PUT    /:id/status          // Update machine status
GET    /:id/performance     // Get performance metrics
POST   /:id/maintenance     // Schedule maintenance
GET    /:id/availability    // Check availability
GET    /stats               // Machine statistics
GET    /utilization         // Utilization metrics
```

#### **Key Features:**
- Machine lifecycle management
- Status tracking and updates
- Performance monitoring
- Maintenance scheduling
- Availability management

#### **Real-Time Events:**
```javascript
req.broadcast('machine_status_changed', machineData, 'machines');
req.broadcast('machine_performance_updated', performanceData, 'analytics');
req.broadcast('maintenance_scheduled', maintenanceData, 'maintenance');
```

---

### 👥 **users.routes.js** - User Management API
**Base Path:** `/api/users`

#### **Endpoints:**
```javascript
GET    /                    // Get all users (admin/supervisor only)
POST   /                    // Create new user (admin only)
GET    /:id                 // Get user by ID
PUT    /:id                 // Update user (admin only)
DELETE /:id                 // Deactivate user (admin only)
PUT    /:id/role            // Update user role (admin only)
PUT    /:id/password        // Reset user password (admin only)
GET    /:id/permissions     // Get user permissions
GET    /roles               // Get available roles
GET    /stats               // User statistics
```

#### **Key Features:**
- User account management
- Role-based access control
- Permission management
- Account activation/deactivation
- User statistics and reporting

#### **Authorization Matrix:**
```javascript
// Role-based access control
'admin'      -> All operations
'supervisor' -> Read operations only
'operator'   -> Own profile only
```

---

### 👷 **labor.routes.js** - Labor Planning API
**Base Path:** `/api/labor` (also available at `/api/labour`)

#### **Endpoints:**
```javascript
GET    /assignments         // Get labor assignments
POST   /assignments         // Create new assignment
PUT    /assignments/:id     // Update assignment
DELETE /assignments/:id     // Delete assignment
GET    /assignments/employee/:id  // Get assignments by employee
GET    /assignments/date/:date    // Get assignments by date
POST   /schedule            // Schedule workforce
GET    /availability        // Check employee availability
GET    /utilization         // Labor utilization metrics
GET    /costs               // Labor cost analysis
```

#### **Key Features:**
- Labor assignment management
- Workforce scheduling
- Availability tracking
- Utilization analytics
- Cost analysis and reporting

#### **Real-Time Events:**
```javascript
req.broadcast('assignment_created', assignmentData, 'labor');
req.broadcast('schedule_updated', scheduleData, 'labor');
req.broadcast('availability_changed', availabilityData, 'labor');
```

---

### 📈 **analytics.routes.js** - Dashboard & Analytics API
**Base Path:** `/api/analytics` (also available at `/api/production`)

#### **Endpoints:**
```javascript
GET    /floor-overview      // Production floor overview
GET    /dashboard           // Dashboard metrics
GET    /metrics             // Real-time metrics
GET    /machine-utilization // Machine utilization analytics
GET    /production-trends   // Production trend analysis
GET    /oee/:machineId      // OEE calculations
GET    /downtime-analysis   // Downtime analysis
GET    /kpis                // Key Performance Indicators
GET    /efficiency          // Production efficiency metrics
```

#### **Key Features:**
- Real-time dashboard data
- Machine utilization analytics
- Production trend analysis
- OEE (Overall Equipment Effectiveness) calculations
- KPI tracking and monitoring

#### **Response Format:**
```javascript
{
  "success": true,
  "message": "Dashboard metrics retrieved successfully",
  "data": {
    "activeOrders": 15,
    "availableMachines": 12,
    "currentOEE": 85.3,
    "todayProduction": 1250,
    "trends": { ... }
  }
}
```

---

### 📊 **reports.routes.js** - Reporting & Export API
**Base Path:** `/api/reports`

#### **Endpoints:**
```javascript
GET    /production          // Production reports
GET    /downtime            // Downtime reports  
GET    /labor               // Labor reports
GET    /machines            // Machine reports
GET    /export/:type        // Export reports as CSV
POST   /custom              // Generate custom report
GET    /templates           // Report templates
POST   /schedule            // Schedule automated reports
```

#### **Key Features:**
- Comprehensive reporting system
- CSV export functionality
- Custom report generation
- Report scheduling
- Template-based reports

#### **CSV Export Example:**
```bash
# Export production report as CSV
curl -X GET "http://localhost:3001/api/reports/export/production?start_date=2025-08-01&end_date=2025-08-07" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o production_report.csv
```

---

### ⚙️ **system.routes.js** - System Management API
**Base Path:** `/api/system` (also available at `/api/settings`, `/api/environments`, `/api/machine-types`)

#### **Endpoints:**
```javascript
// Health & monitoring
GET    /health              // System health check
GET    /health/detailed     // Detailed health info
GET    /statistics          // System statistics

// Settings management
GET    /settings/general    // Get system settings
PUT    /settings/general    // Update system settings

// Environment management
GET    /environments        // Get all environments
POST   /environments        // Create environment
PUT    /environments/:id    // Update environment
DELETE /environments/:id    // Delete environment

// Machine types management
GET    /machine-types       // Get all machine types
POST   /machine-types       // Create machine type
PUT    /machine-types/:id   // Update machine type
DELETE /machine-types/:id   // Delete machine type
```

#### **Key Features:**
- System health monitoring
- Configuration management
- Environment CRUD operations
- Machine type management
- System statistics and metrics

#### **Health Check Response:**
```javascript
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": {
      "status": "connected",
      "totalTables": 49,
      "statistics": { ... }
    },
    "system": {
      "uptime": 3600,
      "memory": { ... },
      "nodeVersion": "v20.19.4"
    },
    "services": {
      "websocket": "running",
      "authentication": "running"
    }
  }
}
```

## 🔧 **Middleware Integration**

### **Authentication Flow**
```javascript
// All protected routes use authentication middleware
router.use('/protected', authenticateToken);

// Role-based access control
router.post('/admin-only', requireRole(['admin']));
router.get('/supervisor-access', requireRole(['admin', 'supervisor']));
```

### **Validation Pipeline**
```javascript
// Request validation using express-validator
router.post('/orders',
  [
    body('order_number').notEmpty().withMessage('Order number required'),
    body('product_name').isLength({ min: 1, max: 255 }),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive integer')
  ],
  asyncHandler(async (req, res) => {
    // Validation errors automatically handled
  })
);
```

### **WebSocket Integration**
```javascript
// Real-time broadcasting available in all routes
router.post('/orders', asyncHandler(async (req, res) => {
  const order = await ordersService.createOrder(req.body, req.user.id);
  
  // Broadcast to all clients subscribed to 'production' channel
  req.broadcast('order_created', order, 'production');
  
  // Send notification to specific user
  req.websocket.sendToUser(managerId, 'new_order_notification', order);
  
  return res.success(order, 'Order created successfully', 201);
}));
```

## 🔒 **Security & Authorization**

### **Authentication Requirements**
- **Public Endpoints:** Health checks, some system information
- **Authenticated Endpoints:** Most CRUD operations
- **Admin Only:** User management, system configuration
- **Role-Based:** Different access levels based on user role

### **Authorization Matrix**
```javascript
const permissions = {
  'admin': ['*'],  // All operations
  'supervisor': [
    'orders:read', 'orders:create', 'orders:update',
    'machines:read', 'machines:update',
    'users:read',
    'labor:*',
    'analytics:read',
    'reports:read'
  ],
  'operator': [
    'orders:read',
    'machines:read',
    'labor:read',
    'auth:profile'
  ]
};
```

### **Input Validation**
- Request parameter validation
- Body content validation
- File upload validation (where applicable)
- SQL injection prevention
- XSS protection

## 🌐 **Real-Time Communication**

### **WebSocket Channels**
```javascript
const channels = {
  'general': ['all'],           // General notifications
  'production': ['admin', 'supervisor', 'operator'],  // Production updates
  'machines': ['admin', 'supervisor', 'operator'],    // Machine status
  'alerts': ['admin', 'supervisor'],                  // System alerts
  'admin': ['admin'],                                 // Admin-only
  'analytics': ['admin', 'supervisor']                // Analytics updates
};
```

### **Broadcasting Patterns**
```javascript
// Channel broadcast
req.broadcast('event_type', data, 'channel_name');

// User-specific message
req.websocket.sendToUser(userId, 'notification', data);

// Role-based broadcast
req.websocket.sendToRole('supervisor', 'alert', alertData);

// Room-based broadcast
req.broadcast('update', data, 'production', 'room_1');
```

## 🧪 **Testing Routes**

### **Integration Testing**
```javascript
describe('Orders Routes', () => {
  test('POST /api/orders should create order', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        order_number: 'ORD001',
        product_name: 'Test Product',
        quantity: 100
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.order_number).toBe('ORD001');
  });
});
```

### **Manual Testing**
```bash
# Health check
curl http://localhost:3001/api/health

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.data.token')

# Create order
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_number":"ORD001","product_name":"Test Product","quantity":100}'
```

## 📊 **Performance Considerations**

### **Response Time Optimization**
- Async/await patterns for non-blocking operations
- Database query optimization
- Pagination for large datasets
- Caching for frequently accessed data

### **Load Handling**
- Connection pooling for database operations
- Rate limiting for API endpoints
- WebSocket connection management
- Memory usage optimization

## 🚀 **Best Practices**

### **Route Development**
1. **RESTful Design** - Follow REST conventions
2. **Consistent Responses** - Use standardized response format
3. **Proper HTTP Status Codes** - Return appropriate status codes
4. **Input Validation** - Validate all inputs
5. **Error Handling** - Handle errors gracefully

### **Security Best Practices**
1. **Authentication Required** - Protect sensitive endpoints
2. **Authorization Checks** - Verify user permissions
3. **Input Sanitization** - Sanitize all inputs
4. **Rate Limiting** - Prevent abuse
5. **Audit Logging** - Log security-related events

---

*The routes layer provides a clean, secure, and maintainable HTTP API for the production management system while integrating seamlessly with real-time communication.*