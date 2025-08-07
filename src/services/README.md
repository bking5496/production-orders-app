# services/ - Business Logic Layer

## 📊 **Overview**
The services layer contains pure business logic, data processing, and core application functionality. Each service class encapsulates a specific domain of the production management system.

## 🏗️ **Service Architecture**

### **Design Principles**
- **Single Responsibility:** Each service handles one business domain
- **Pure Business Logic:** No HTTP concerns, only business rules and data processing
- **Database Abstraction:** Uses DatabaseUtils for all data operations
- **Error Handling:** Throws business-specific errors for proper handling
- **Testability:** Pure functions that can be unit tested

### **Service Pattern**
```javascript
class ServiceName {
  constructor() {
    // Initialize dependencies
  }

  async businessMethod(data, userId) {
    // 1. Input validation
    if (!data.required_field) {
      throw new ValidationError('Required field missing');
    }

    // 2. Business rules
    const processedData = this.applyBusinessRules(data);

    // 3. Database operations
    const result = await DatabaseUtils.insert('table', processedData);

    // 4. Return processed result
    return this.formatResult(result);
  }

  applyBusinessRules(data) {
    // Business logic implementation
  }

  formatResult(data) {
    // Result formatting
  }
}
```

## 📋 **Service Classes**

### 📦 **orders.service.js** - Production Orders Management
**Domain:** Production order lifecycle, scheduling, and status management

#### **Key Features:**
- Complete order lifecycle management (create → in_progress → completed)
- Production scheduling and resource allocation
- Order status transitions with validation
- Batch operations for bulk order processing
- Order analytics and reporting data

#### **Core Methods:**
```javascript
// Order lifecycle
async createOrder(orderData, userId)
async updateOrderStatus(orderId, status, userId)
async getOrderById(orderId)
async getOrders(filters, pagination)

// Production operations
async startProduction(orderId, machineId, operatorId)
async pauseProduction(orderId, reason)
async completeProduction(orderId, completionData)

// Analytics
async getOrderStatistics(filters)
async getOrdersByStatus(status)
```

#### **Business Rules:**
- Order numbers must be unique
- Status transitions follow defined workflow
- Machine allocation validation
- Operator assignment requirements
- Production capacity constraints

---

### 🏭 **machines.service.js** - Machine Management
**Domain:** Machine lifecycle, performance monitoring, and availability management

#### **Key Features:**
- Machine status tracking (available → in_use → maintenance → offline)
- Performance metrics and OEE calculations
- Maintenance scheduling and tracking
- Machine allocation and resource management
- Equipment analytics and reporting

#### **Core Methods:**
```javascript
// Machine lifecycle
async createMachine(machineData, userId)
async updateMachineStatus(machineId, status, userId)
async getMachineById(machineId)
async getMachines(filters)

// Performance tracking
async recordMachinePerformance(machineId, performanceData)
async getMachinePerformance(machineId, dateRange)
async calculateOEE(machineId, dateRange)

// Maintenance
async scheduleMaintenance(machineId, maintenanceData)
async completeMaintenance(machineId, completionData)
```

#### **Business Rules:**
- Machine availability validation
- Performance threshold monitoring
- Maintenance schedule compliance
- Safety requirement verification
- Capacity planning constraints

---

### 👥 **users.service.js** - User Management
**Domain:** User lifecycle, authentication, and role-based access control

#### **Key Features:**
- User account management (create, update, deactivate)
- Role-based permission system
- Authentication and session management
- Employee information and organizational structure
- User activity tracking and auditing

#### **Core Methods:**
```javascript
// User management
async createUser(userData, createdBy)
async updateUser(userId, updateData, updatedBy)
async deactivateUser(userId, deactivatedBy)
async getUserById(userId)
async getUsers(filters)

// Authentication
async authenticateUser(username, password)
async validateToken(token)
async refreshToken(userId)

// Role management
async assignRole(userId, role, assignedBy)
async getUserPermissions(userId)
```

#### **Business Rules:**
- Username uniqueness validation
- Role hierarchy enforcement
- Password complexity requirements
- Account activation workflow
- Permission inheritance rules

---

### 👷 **labor.service.js** - Labor Planning & Workforce Management
**Domain:** Labor assignments, scheduling, and workforce optimization

#### **Key Features:**
- Labor assignment creation and management
- Shift scheduling and workforce planning
- Skill-based assignment matching
- Labor cost tracking and analysis
- Workforce utilization analytics

#### **Core Methods:**
```javascript
// Labor assignments
async createAssignment(assignmentData, createdBy)
async updateAssignment(assignmentId, updateData, updatedBy)
async getLaborAssignments(filters)
async getAssignmentsByEmployee(employeeId, dateRange)

// Scheduling
async scheduleWorkforce(scheduleData)
async optimizeAssignments(criteria)
async checkAvailability(employeeId, timeSlot)

// Analytics
async getLaborUtilization(dateRange)
async getLaborCosts(dateRange)
```

#### **Business Rules:**
- Skill requirement matching
- Working hour compliance
- Labor cost budgeting
- Overtime calculation rules
- Shift coverage requirements

---

### 📈 **analytics.service.js** - Business Intelligence & Metrics
**Domain:** Dashboard metrics, production analytics, and business intelligence

#### **Key Features:**
- Real-time production floor overview
- Machine utilization and performance analytics
- Production trend analysis and forecasting
- OEE (Overall Equipment Effectiveness) calculations
- Key Performance Indicator (KPI) tracking

#### **Core Methods:**
```javascript
// Dashboard data
async getProductionFloorOverview()
async getDashboardMetrics(dateRange)
async getRealTimeMetrics()

// Analytics
async getMachineUtilization(machineId, dateRange)
async getProductionTrends(dateRange)
async calculateOEE(machineId, dateRange)
async getDowntimeAnalysis(dateRange)

// KPIs
async getKPIs(dateRange)
async getProductionEfficiency(dateRange)
```

#### **Business Rules:**
- Metric calculation accuracy
- Real-time data freshness
- Historical data retention
- Performance benchmark validation
- Alert threshold management

---

### 📊 **reports.service.js** - Reporting & Export System
**Domain:** Report generation, data export, and business reporting

#### **Key Features:**
- Comprehensive production reporting
- CSV export functionality for all data types
- Scheduled report generation
- Custom report builder capabilities
- Report sharing and distribution

#### **Core Methods:**
```javascript
// Report generation
async generateProductionReport(filters)
async generateDowntimeReport(filters)
async generateLaborReport(filters)
async generateMachineReport(filters)

// CSV exports
async exportToCSV(reportType, filters)
async generateCSVReport(data, filename)

// Custom reports
async createCustomReport(reportConfig)
async scheduleReport(reportId, schedule)
```

#### **Business Rules:**
- Data access permission validation
- Export size limitations
- Report generation optimization
- Historical data availability
- Audit trail maintenance

---

### 🌐 **websocket.service.js** - Real-Time Communication
**Domain:** WebSocket management, real-time messaging, and live updates

#### **Key Features:**
- JWT-authenticated WebSocket connections
- Channel-based message distribution
- Role-based subscription management
- Room-based targeted messaging
- Connection health monitoring and cleanup

#### **Core Methods:**
```javascript
// Connection management
handleConnection(ws, req)
handleDisconnection(clientId)
cleanupInactiveConnections(timeoutMs)

// Messaging
broadcast(type, data, channel, room)
sendToUser(userId, type, data)
sendToRole(role, type, data)

// Subscriptions
handleSubscribe(ws, clientId, channels)
handleUnsubscribe(ws, clientId, channels)
getClientsByChannel(channel)

// Health monitoring
handleHeartbeat(ws, clientId)
getConnectedClientsCount()
```

#### **Business Rules:**
- Authentication requirement for all connections
- Role-based channel access validation
- Message rate limiting
- Connection timeout management
- Security audit logging

---

### ⚙️ **system.service.js** - System Management & Configuration
**Domain:** System health, configuration management, and administrative functions

#### **Key Features:**
- Comprehensive system health monitoring
- System settings and configuration management
- Environment and machine type management
- System statistics and metrics collection
- Administrative function automation

#### **Core Methods:**
```javascript
// Health monitoring
async getSystemHealth()
async getSystemStatistics()
async checkDatabaseHealth()

// Settings management
async getGeneralSettings()
async updateGeneralSettings(settings, userId)

// Environment management
async getEnvironments()
async createEnvironment(environmentData, userId)
async updateEnvironment(id, updateData, userId)
async deleteEnvironment(id, userId)

// Machine types
async getMachineTypes()
async createMachineType(machineTypeData, userId)
async updateMachineType(id, updateData, userId)
```

#### **Business Rules:**
- System health threshold validation
- Configuration change authorization
- Environment dependency checking
- Machine type usage validation
- Administrative audit requirements

## 🔄 **Service Interactions**

### **Inter-Service Communication**
Services can call other services for complex operations:

```javascript
class OrdersService {
  async startProduction(orderId, machineId, operatorId) {
    // Validate machine availability
    const machine = await machinesService.getMachineById(machineId);
    if (machine.status !== 'available') {
      throw new ValidationError('Machine not available');
    }

    // Validate operator assignment
    const operator = await usersService.getUserById(operatorId);
    if (!operator.canOperateMachine(machine.type)) {
      throw new ValidationError('Operator not qualified');
    }

    // Start production
    const result = await this.updateOrderStatus(orderId, 'in_progress');
    
    // Update machine status
    await machinesService.updateMachineStatus(machineId, 'in_use');
    
    return result;
  }
}
```

### **Service Dependencies**
- **All Services** → `DatabaseUtils` (data operations)
- **All Services** → `Error Classes` (error handling)
- **OrdersService** → `MachinesService`, `UsersService` (cross-domain validation)
- **LaborService** → `UsersService` (employee validation)
- **AnalyticsService** → `OrdersService`, `MachinesService` (data aggregation)

## 🧪 **Testing Services**

### **Unit Testing Pattern**
```javascript
describe('OrdersService', () => {
  beforeEach(() => {
    // Mock DatabaseUtils
    DatabaseUtils.insert = jest.fn();
    DatabaseUtils.select = jest.fn();
  });

  test('should create order with valid data', async () => {
    const orderData = { order_number: 'ORD001', product_name: 'Product A' };
    const userId = 1;

    DatabaseUtils.insert.mockResolvedValue({ id: 1, ...orderData });

    const result = await ordersService.createOrder(orderData, userId);

    expect(result).toBeDefined();
    expect(DatabaseUtils.insert).toHaveBeenCalledWith('production_orders', expect.any(Object));
  });
});
```

### **Integration Testing**
- Test service interactions with real database
- Validate business rule enforcement
- Test error handling and edge cases
- Performance testing for complex operations

## 🔒 **Security Considerations**

### **Input Validation**
- All service methods validate input parameters
- Business rules enforce data integrity
- SQL injection prevention through parameterized queries
- Data type validation and sanitization

### **Authorization**
- User context passed to all operations
- Permission checking for sensitive operations
- Audit trail for all data modifications
- Role-based access control enforcement

## 📊 **Performance Optimization**

### **Database Efficiency**
- Use of DatabaseUtils for optimized queries
- Connection pooling for concurrent operations
- Query optimization and indexing
- Batch operations for bulk processing

### **Caching Strategy**
- Service-level caching for frequently accessed data
- Cache invalidation on data updates
- Performance monitoring and optimization

## 🚀 **Best Practices**

### **Service Development**
1. **Single Responsibility** - Each service handles one business domain
2. **Pure Functions** - No side effects in business logic
3. **Error Handling** - Throw appropriate business errors
4. **Input Validation** - Validate all input parameters
5. **Documentation** - Document all public methods and business rules

### **Maintenance**
1. **Regular Updates** - Keep business rules current
2. **Performance Monitoring** - Track service performance
3. **Testing** - Maintain comprehensive test coverage
4. **Refactoring** - Regular code quality improvements

---

*The services layer provides a clean, maintainable, and testable foundation for all business logic in the production management system.*