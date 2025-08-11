# Production Orders App - Claude Context File

## App Overview
**Name:** Production Management System  
**Version:** 2.0.0  
**Type:** Multi-Environment Manufacturing Execution System (MES)  
**Tech Stack:** Node.js, Express, PostgreSQL, **React 19.1.0**, Vite 7.0.6, WebSocket (ws 8.16.0)  
**Architecture:** Real-time, Progressive Web App  
**Timezone:** SAST (UTC+2) - South African Standard Time  

## Development Philosophy
- Everything with a list or step by step process needs to be configurable.

## Recent Major Changes
- **2025-08-11:** **🏗️ ARCHITECTURE MIGRATION COMPLETE:** Fully migrated to modular server architecture, archived monolithic server.js
- **2025-08-11:** **🗂️ SERVER ARCHIVAL:** Moved legacy server.js to archived/server-monolithic.js for reference
- **2025-08-07:** **🏗️ MAJOR ARCHITECTURE REFACTORING:** Complete server.js modularization from 3,889 lines to maintainable service architecture
- **2025-08-07:** **🌐 WEBSOCKET SERVICE EXTRACTION:** Advanced real-time communication with JWT auth, channels, and room management
- **2025-08-07:** **⚙️ SYSTEM MANAGEMENT:** Complete system health monitoring, settings, and configuration endpoints
- **2025-08-07:** **📊 ANALYTICS & REPORTING:** Comprehensive business intelligence and CSV export capabilities
- **2025-08-02:** **DYNAMIC CONFIGURATION SYSTEM:** Implemented comprehensive configurable system for all lists and workflows
- **2025-08-02:** **POSTGRESQL MIGRATION:** Complete migration from SQLite to PostgreSQL with enhanced performance
- **2025-08-01:** **MAJOR UPGRADE:** Complete mobile responsiveness transformation with touch-optimized components
- **2025-08-01:** **WEBSOCKET INTEGRATION:** Real-time WebSocket system with enhanced hooks and auto-reconnection
- **2025-08-01:** **REACT 19 UPGRADE:** Upgraded to React 19.1.0 with modern concurrent features
- **2025-08-01:** **MOBILE ARCHITECTURE:** Added comprehensive mobile components and adaptive refresh system

## Knowledge Management
- Use byterover-mcp to store and retrieve knowledge and context
- Always use byterover-retrive-knowledge tool to get the related context before any tasks
- Always use byterover-store-knowledge to store all the critical informations after successful tasks

## 🔐 Secrets Management
**CRITICAL: Always use secrets manager for sensitive data**
- **Database password:** `getSecret('DB_PASSWORD')` - NEVER use hardcoded passwords
- **JWT secret:** `getSecret('JWT_SECRET')`
- **Email credentials:** `getSecret('EMAIL_PASSWORD')`
- **API keys:** `getSecret('API_KEY_NAME')`

**Usage:**
```javascript
const { getSecret } = require('./security/secrets-manager');
const dbPassword = getSecret('DB_PASSWORD');
```

**Database Connection:**
- PostgreSQL Database: `production_orders`
- Host: localhost, Port: 5432, User: postgres
- Password: **Retrieved from secrets manager only**

**Direct PostgreSQL Access:**
```bash
# Connect to PostgreSQL using secrets manager password
PGPASSWORD=$(node -e "console.log(require('./security/secrets-manager').getSecret('DB_PASSWORD'))") psql -h localhost -U postgres -d production_orders
```

## 🔄 Server Management & Rebuilding

### **After Code Updates - CRITICAL PROCESS**
When making changes to server-side code (server.js, endpoints, database functions), follow these steps:

1. **Stop PM2 Server:**
```bash
npx pm2 stop production-management
npx pm2 delete production-management
```

2. **Rebuild Application:**
```bash
npm run build
```

3. **Restart with PM2:**
```bash
npx pm2 start server.js --name "production-management"
npx pm2 save
```

4. **Verify Restart:**
```bash
npx pm2 status
npx pm2 logs production-management --lines 20
```

### **Development vs Production**
- **Development:** Use `npm run dev` for hot reload
- **Production:** Always use PM2 for process management
- **After updates:** Always rebuild before restarting PM2

### **Database Connection Verification**
```bash
# Check database health
curl http://localhost:3000/api/health

# Direct database test
PGPASSWORD=$(node -e "console.log(require('./security/secrets-manager').getSecret('DB_PASSWORD'))") psql -h localhost -U postgres -d production_orders -c "SELECT NOW();"
```

## 🏗️ **Refactored Architecture - Modular Design**

### **🎯 Architecture Overview**
**TRANSFORMATION COMPLETE:** Successfully refactored monolithic 3,889-line server.js into maintainable, scalable service architecture.

### **📁 File Structure**
```
/home/production-app/production-orders-app/
├── src/                           # 🏗️ NEW: Modular Backend Architecture
│   ├── config/                    # Configuration management
│   │   └── database.js           # PostgreSQL connection & pooling
│   ├── middleware/               # Express middleware components
│   │   ├── auth.js              # JWT authentication & role-based access
│   │   ├── error-handler.js     # Global error handling & custom errors
│   │   └── websocket.js         # WebSocket integration middleware
│   ├── services/                # Business logic layer (NEW)
│   │   ├── orders.service.js    # Production orders management
│   │   ├── machines.service.js  # Machine lifecycle & performance
│   │   ├── users.service.js     # User management & authentication
│   │   ├── labor.service.js     # Labor planning & assignments
│   │   ├── analytics.service.js # Dashboard metrics & analytics
│   │   ├── reports.service.js   # Reporting & CSV exports
│   │   ├── websocket.service.js # Real-time communication
│   │   └── system.service.js    # System settings & health
│   ├── routes/                  # HTTP endpoint definitions (NEW)
│   │   ├── auth.routes.js       # Authentication endpoints
│   │   ├── orders.routes.js     # Production orders API
│   │   ├── machines.routes.js   # Machine management API
│   │   ├── users.routes.js      # User management API
│   │   ├── labor.routes.js      # Labor planning API
│   │   ├── analytics.routes.js  # Dashboard & analytics API
│   │   ├── reports.routes.js    # Reporting API
│   │   └── system.routes.js     # System management API
│   ├── utils/                   # Utility functions (NEW)
│   │   ├── database.js          # Database CRUD utilities
│   │   └── response.js          # Standardized API responses
│   └── server-refactored.js     # 🧪 TEST: Modular server (port 3001)
├── src/js/                      # Frontend React Components
│   ├── components/              # React UI components
│   ├── core/                    # Core frontend utilities
│   └── utils/                   # Frontend utilities
├── security/                    # Security & secrets management
│   └── secrets-manager.js       # Environment secrets
├── server.js                    # 📜 LEGACY: Original monolithic server
├── REFACTORING-PROGRESS.md      # 📊 Detailed refactoring documentation
└── CLAUDE.md                    # 📖 This file
```

### **🔧 Service Layer Architecture**

**Business Logic Separation:**
```javascript
// Service handles pure business logic
class OrdersService {
  async createOrder(orderData, userId) {
    // Validation, business rules, database operations
    const order = await DatabaseUtils.insert('production_orders', {
      ...orderData,
      created_by: userId,
      created_at: new Date()
    });
    return order;
  }
}

// Route handles HTTP concerns & real-time notifications
router.post('/orders', 
  authenticateToken, 
  requireRole(['admin', 'supervisor']),
  [body('order_number').notEmpty()],
  asyncHandler(async (req, res) => {
    const order = await ordersService.createOrder(req.body, req.user.id);
    req.broadcast('order_created', order, 'production'); // WebSocket
    return res.success(order, 'Order created successfully', 201);
  })
);
```

### **🌐 WebSocket Real-Time System**

**Advanced Features:**
- **JWT Authentication:** Secure WebSocket connections with token validation
- **Channel Subscriptions:** Role-based channel access (`admin`, `production`, `machines`)
- **Room Management:** Targeted broadcasting for specific groups
- **Auto-Cleanup:** Inactive connection management
- **Heartbeat Monitoring:** Connection health verification

**Usage Pattern:**
```javascript
// In any route - broadcast real-time updates
req.broadcast('machine_status_changed', machineData, 'machines');
req.websocket.sendToUser(userId, 'notification', alertData);
req.websocket.getConnectedCount(); // Monitor connections
```

### **📊 System Health & Monitoring**

**Comprehensive Health Checks:**
```bash
# System health endpoint
curl http://localhost:3001/api/system/health

# Response includes:
{
  "status": "healthy",
  "database": { "status": "connected", "totalTables": 49 },
  "system": { "uptime": 123.45, "memory": {...} },
  "services": { "websocket": "running", "authentication": "running" }
}
```

### **⚙️ Database Layer**

**Connection Management:**
- **PostgreSQL Pooling:** Efficient connection reuse
- **Transaction Support:** ACID compliance for complex operations
- **CRUD Utilities:** Standardized database operations
- **Query Optimization:** Prepared statements and connection pooling

**Usage:**
```javascript
const DatabaseUtils = require('./src/utils/database');

// Standardized operations
const orders = await DatabaseUtils.select('production_orders', { status: 'active' });
const newOrder = await DatabaseUtils.insert('production_orders', orderData, '*');
await DatabaseUtils.transaction([
  { text: 'INSERT INTO orders...', params: [...] },
  { text: 'UPDATE inventory...', params: [...] }
]);
```

### **🔒 Security & Authentication**

**Multi-Layer Security:**
- **JWT Tokens:** Stateless authentication with role-based access
- **Secrets Manager:** Environment-based secret management
- **Role Validation:** Granular permission controls
- **Request Validation:** Express-validator integration
- **WebSocket Security:** Token-based WebSocket authentication

### **📈 Benefits Achieved**
1. **Modularity:** 8 focused service classes vs 1 monolithic file
2. **Maintainability:** Clear separation of concerns
3. **Scalability:** Independent service scaling
4. **Testing:** Unit testable components
5. **Team Development:** Multiple developers can work simultaneously
6. **Real-Time:** Advanced WebSocket integration
7. **Monitoring:** Comprehensive health and performance tracking

## 🔧 Dynamic Configuration System

### **Core Principle**
Everything with a list or step-by-step process is now fully configurable through the admin interface. No more hardcoded values in components.

### **Configuration Categories:**
1. **Order Management:** Statuses, priorities, transitions, validation rules
2. **Machine Management:** Statuses, types, environments, capacity settings
3. **User Roles:** Role definitions, permission matrices, access controls
4. **Production Workflow:** Stop reasons, quality checkpoints, waste types
5. **Business Rules:** Operational constraints, validation thresholds
6. **UI Settings:** Display preferences, color schemes, interface options
7. **System Settings:** Core configuration, external integrations

### **Database Schema:**
```sql
configuration_categories    -- Category definitions
configuration_items        -- Individual config items with validation
configuration_history      -- Change tracking and audit trail
```

### **Frontend Integration:**
```jsx
// Use dynamic configuration in components
import { useDynamicConfig, useConfigArray } from '../core/dynamic-config.js';
import { DynamicStatusBadge, DynamicStatusSelect } from './dynamic-status-badge.jsx';

// Get order statuses dynamically
const { items: orderStatuses } = useConfigArray('order_management.order_statuses');

// Use configurable status components
<DynamicStatusBadge status={order.status} type="order" />
<DynamicStatusSelect value={status} onChange={setStatus} type="order" />
```

### **API Endpoints:**
- `GET /api/config/public` - Public configuration for frontend
- `GET /api/config/categories` - Admin: Configuration categories
- `PUT /api/config/items/:id` - Admin: Update configuration
- `GET /api/config/items/:id/history` - Admin: Change history
- `GET /api/config/export` - Admin: Export all configurations

### **Real-time Updates:**
Configuration changes broadcast via WebSocket to all connected clients for immediate updates without page refresh.

### **Development Guidelines:**
- **NEVER hardcode lists or statuses** - Always use dynamic configuration
- **Use configuration hooks** - `useDynamicConfig()`, `useConfigArray()`, `useConfigObject()`
- **Validate against configuration** - Use `ConfigUtils.isValidStatusTransition()`
- **Update through admin interface** - Not code changes

## 🔧 Development Rules & Standards

### **CRITICAL DEVELOPMENT GUIDELINES** (Must Follow)

1. **📁 File Management:**
   - **NEVER create new files if existing ones serve the purpose**
   - Always check for existing components, utilities, or modules first
   - Prefer editing/extending existing files over creating duplicates
   - Only create new files when implementing entirely new features

2. **🗃️ Database Schema:**
   - **NEVER create new database columns if existing ones exist**
   - Always check current schema before adding columns
   - Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` for safety
   - Verify column existence with information_schema queries

3. **🔌 API Development:**
   - **NEVER create duplicate API endpoints**
   - Check existing routes in server.js before adding new ones
   - Extend existing endpoints with new functionality when possible
   - Follow REST conventions and existing naming patterns

4. **⚡ Full-Stack Integration:**
   - **ALL new features must update backend, frontend, AND database**
   - Database changes require corresponding API updates
   - API changes require frontend component updates
   - Test integration across all three layers

5. **🏗️ File Structure Preservation:**
   - **Maintain existing file organization structure**
   - Follow established patterns in `/src/js/components/`
   - Use existing utility files in `/src/js/utils/`
   - Respect the modular architecture

6. **📤 Version Control:**
   - **COMMIT ALL CHANGES to GitHub after completion**
   - Use descriptive commit messages with feature context
   - Include all modified files (backend, frontend, database)
   - Follow existing commit message patterns

7. **⚙️ Configuration Management:**
   - **ALL lists and step-by-step processes MUST be configurable**
   - Use dynamic configuration system instead of hardcoded values
   - Never hardcode status lists, user roles, or workflow steps
   - Always use `useDynamicConfig()` hooks for configuration data
   - Update configuration through admin interface, not code changes
