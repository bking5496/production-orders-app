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
- **2025-08-11:** **✅ ATTENDANCE REGISTER FIX:** Fixed validation errors in attendance endpoint - now accepts null check_in_time values
- **2025-08-11:** **🏗️ PRODUCTION SERVER ACTIVE:** Using `/src/server-production.js` as primary server on port 3000 (oracles.africa)
- **2025-08-11:** **🔧 WEBSOCKET & API FIXES:** Fixed environments/machines endpoints, WebSocket authentication, resume functionality
- **2025-08-07:** **🏗️ MAJOR ARCHITECTURE REFACTORING:** Complete server.js modularization from 3,889 lines to maintainable service architecture
- **2025-08-07:** **🌐 WEBSOCKET SERVICE EXTRACTION:** Advanced real-time communication with JWT auth, channels, and room management
- **2025-08-02:** **DYNAMIC CONFIGURATION SYSTEM:** Implemented comprehensive configurable system for all lists and workflows
- **2025-08-02:** **POSTGRESQL MIGRATION:** Complete migration from SQLite to PostgreSQL with enhanced performance
- **2025-08-01:** **REACT 19 UPGRADE:** Upgraded to React 19.1.0 with modern concurrent features

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

## 🔄 Server Management & Production Deployment

### **CURRENT PRODUCTION SERVER**
- **File:** `/home/production-app/production-orders-app/src/server-production.js`
- **URL:** `https://oracles.africa` (port 3000)
- **PM2 Process:** `production-management`
- **Status:** ✅ Active and serving production traffic

### **After Code Updates - CRITICAL PROCESS**
```bash
# 1. Restart PM2 server (no rebuild needed for server changes)
npx pm2 restart production-management

# 2. Verify restart
npx pm2 status
npx pm2 logs production-management --lines 20

# 3. Test health
curl https://oracles.africa/api/health
```

### **For Frontend Changes Only**
```bash
# Build and deploy frontend
npm run build
```

### **Database Connection Verification**
```bash
# Check database health
curl https://oracles.africa/api/health

# Direct database test
PGPASSWORD=$(node -e "console.log(require('./security/secrets-manager').getSecret('DB_PASSWORD'))") psql -h localhost -U postgres -d production_orders -c "SELECT NOW();"
```

## 🏗️ **Current File Structure**

### **📁 Production Architecture**
```
/home/production-app/production-orders-app/
├── src/
│   ├── server-production.js      # 🎯 MAIN PRODUCTION SERVER (port 3000)
│   ├── config/
│   │   └── database.js           # PostgreSQL connection & pooling
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication & role-based access
│   │   ├── error-handler.js     # Global error handling & custom errors
│   │   └── websocket.js         # WebSocket integration middleware
│   ├── services/                # Business logic layer
│   │   ├── orders.service.js    # Production orders management
│   │   ├── machines.service.js  # Machine lifecycle & performance
│   │   ├── users.service.js     # User management & authentication
│   │   ├── labor.service.js     # Labor planning & assignments ✅
│   │   ├── analytics.service.js # Dashboard metrics & analytics
│   │   ├── reports.service.js   # Reporting & CSV exports
│   │   ├── websocket.service.js # Real-time communication
│   │   └── system.service.js    # System settings & health
│   ├── routes/                  # HTTP endpoint definitions
│   │   ├── auth.routes.js       # Authentication endpoints
│   │   ├── orders.routes.js     # Production orders API
│   │   ├── machines.routes.js   # Machine management API
│   │   ├── users.routes.js      # User management API
│   │   ├── labor.routes.js      # Labor planning API ✅ FIXED
│   │   ├── analytics.routes.js  # Dashboard & analytics API
│   │   ├── reports.routes.js    # Reporting API
│   │   └── system.routes.js     # System management API
│   ├── utils/                   # Utility functions
│   │   ├── database.js          # Database CRUD utilities
│   │   └── response.js          # Standardized API responses
│   └── js/                      # Frontend React Components
│       ├── components/          # React UI components
│       ├── core/               # Core frontend utilities
│       └── utils/              # Frontend utilities
├── security/
│   └── secrets-manager.js       # Environment secrets
├── ecosystem.config.js          # PM2 configuration
└── CLAUDE.md                   # 📖 This file
```



## 🔧 Development Rules & Standards

### **CRITICAL DEVELOPMENT GUIDELINES** (Must Follow)

1. **🎯 Production Server:**
   - **ALWAYS use `/src/server-production.js`** - This is the active production server
   - **Port 3000** serves oracles.africa
   - **Never modify archived/legacy files** unless specifically needed

2. **📁 File Management:**
   - **NEVER create new files if existing ones serve the purpose**
   - Always check for existing components, utilities, or modules first
   - Prefer editing/extending existing files over creating duplicates

3. **🗃️ Database Schema:**
   - **NEVER create new database columns if existing ones exist**
   - Always check current schema before adding columns
   - Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` for safety

4. **🔌 API Development:**
   - **Check existing routes in server-production.js before adding new ones**
   - Follow REST conventions and existing naming patterns
   - **Use proper Express validator patterns:**
     ```javascript
     // For optional fields that can be null:
     body('field_name').optional({ nullable: true }).validation_method()
     ```

5. **⚡ Full-Stack Integration:**
   - **ALL new features must update backend, frontend, AND database**
   - Test integration across all three layers
   - Always restart PM2 after server changes: `npx pm2 restart production-management`

6. **⚙️ Configuration Management:**
   - **ALL lists and step-by-step processes MUST be configurable**
   - Use dynamic configuration system instead of hardcoded values
   - Never hardcode status lists, user roles, or workflow steps

## 🔧 Recent Fixes Applied

### **✅ Attendance Register Validation (August 11, 2025)**
**Problem:** Frontend getting "400 Bad Request" validation errors when marking attendance
**Solution:** Fixed validation in `src/routes/labor.routes.js:264`
```javascript
// BEFORE (broken):
body('check_in_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)

// AFTER (fixed):
body('check_in_time').optional({ nullable: true }).matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
```
**Status:** ✅ Fully resolved and tested

### **✅ Production Server Routes (August 11, 2025)**
- Fixed broken route redirection in server-production.js
- Implemented direct service forwarding for `/api/environments` and `/api/machines`
- Added missing `resume_time` column to production_orders table
- Fixed WebSocket token authentication

## 📝 Important Notes for Tomorrow
1. **Continue with:** Next tasks or features as needed
2. **Server Status:** Production server stable on oracles.africa:3000
3. **Knowledge Base:** All fixes documented in byterover-mcp
4. **Architecture:** Modular design working well, no major changes needed

---
*Last Updated: August 11, 2025 - All critical fixes applied and verified*
