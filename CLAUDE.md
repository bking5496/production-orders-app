# Production Orders App - Claude Context File

## App Overview
**Name:** Production Management System  
**Version:** 2.0.0  
**Type:** Multi-Environment Manufacturing Execution System (MES)  
**Tech Stack:** Node.js, Express, SQLite, **React 19.1.0**, Vite 7.0.6, WebSocket (ws 8.16.0)  
**Architecture:** Mobile-First, Real-time, Progressive Web App  
**Timezone:** SAST (UTC+2) - South African Standard Time  

## Development Philosophy
- Everything with a list or step by step process needs to be configurable.

## Recent Major Changes
- **2025-08-02:** **DYNAMIC CONFIGURATION SYSTEM:** Implemented comprehensive configurable system for all lists and workflows
- **2025-08-02:** **POSTGRESQL MIGRATION:** Complete migration from SQLite to PostgreSQL with enhanced performance
- **2025-08-01:** **MAJOR UPGRADE:** Complete mobile responsiveness transformation with touch-optimized components
- **2025-08-01:** **WEBSOCKET INTEGRATION:** Real-time WebSocket system with enhanced hooks and auto-reconnection
- **2025-08-01:** **REACT 19 UPGRADE:** Upgraded to React 19.1.0 with modern concurrent features
- **2025-08-01:** **MOBILE ARCHITECTURE:** Added comprehensive mobile components and adaptive refresh system
- **2025-08-01:** **PERFORMANCE OPTIMIZATION:** Implemented adaptive refresh rates and mobile performance hooks
- **2025-07-31:** **UI ENHANCEMENT:** Applied modern animations and glass morphism to orders.jsx with horizontal scroll fix
- **2025-07-31:** **STANDARD FIX:** Established hover animation standards - removed scale transforms from table rows to prevent horizontal scrolling
- **2025-07-30:** Fixed critical timezone conversion bug in labor-planner.jsx causing data synchronization issues
- **2025-07-30:** Rebuilt labour-layout.jsx from ground up to resolve JSX syntax and build errors
- **2025-07-30:** Resolved database schema issues - verified all required columns exist
- **2025-07-30:** Fixed PM2 log errors and improved application stability

## Knowledge Management
- Use byterover-mcp to store and retrieve knowledge and context

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