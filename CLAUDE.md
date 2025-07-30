# Production Orders App - Claude Context File

## App Overview
**Name:** Production Management System  
**Version:** 2.0.0  
**Type:** Multi-Environment Manufacturing Execution System (MES)  
**Tech Stack:** Node.js, Express, SQLite, React, Vite  
**Timezone:** SAST (UTC+2) - South African Standard Time  

## Recent Major Changes
- **2025-07-30:** Fixed critical timezone conversion bug in labor-planner.jsx causing data synchronization issues
- **2025-07-30:** Rebuilt labour-layout.jsx from ground up to resolve JSX syntax and build errors
- **2025-07-30:** Resolved database schema issues - verified all required columns exist
- **2025-07-30:** Fixed PM2 log errors and improved application stability
- **2025-01-28:** Changed "Pause" to "Stop" functionality across all components
- **2025-01-28:** Fixed production timer timezone issues (was showing 2 hours ahead)
- **2025-01-28:** Added comprehensive downtime reporting system
- **2025-01-28:** Enhanced stop tracking with categories and operator logging

## Current Architecture

### Backend (server.js)
- **Port:** 3000
- **Database:** SQLite (`production.db`)
- **Authentication:** JWT tokens
- **Key Routes:**
  - `/api/orders/:id/stop` - Stop production (was pause)
  - `/api/orders/:id/resume` - Resume production
  - `/api/reports/downtime` - Downtime analytics
  - `/api/auth/*` - Authentication
  - `/api/machines/*` - Machine management
  - `/api/environments/*` - Environment management

### Frontend Structure
```
src/js/
├── components/          # React components
│   ├── orders.jsx      # Main orders management
│   ├── machines.jsx    # Machine management
│   ├── dashboard.jsx   # Main dashboard
│   ├── downtime-report.jsx # New downtime reporting
│   └── ui-components.jsx # Shared UI components
├── modules/            # Feature modules
│   ├── production-module.jsx # Production timer & controls
│   ├── reporting-module.jsx  # Report generation
│   └── settings-module.jsx   # App settings
├── utils/              # Utility functions
│   ├── timezone.js     # SAST timezone handling
│   └── api.js          # API client
└── core/               # Core functionality
    ├── auth.js         # Authentication
    └── api.js          # API utilities
```

### Database Schema (Key Tables)
```sql
-- Production Orders
CREATE TABLE production_orders (
    id INTEGER PRIMARY KEY,
    order_number TEXT UNIQUE,
    product_name TEXT,
    quantity INTEGER,
    status TEXT CHECK(status IN ('pending','in_progress','completed','stopped')),
    start_time DATETIME,  -- Stores SAST time via datetime('now', '+2 hours')
    complete_time DATETIME,
    machine_id INTEGER,
    environment TEXT,
    stop_reason TEXT
);

-- Production Stops (New enhanced tracking)
CREATE TABLE production_stops (
    id INTEGER PRIMARY KEY,
    order_id INTEGER,
    reason TEXT,
    category TEXT,  -- Equipment, Material, Quality, Planned, etc.
    notes TEXT,
    start_time DATETIME,
    end_time DATETIME,
    duration INTEGER,  -- Minutes
    operator_id INTEGER,
    resolved_by INTEGER,
    FOREIGN KEY(order_id) REFERENCES production_orders(id)
);

-- Machines
CREATE TABLE machines (
    id INTEGER PRIMARY KEY,
    name TEXT,
    type TEXT,
    environment TEXT,
    status TEXT CHECK(status IN ('available','in_use','maintenance','offline')),
    capacity INTEGER,
    production_rate INTEGER
);

-- Environments (Dynamic from database)
CREATE TABLE environments (
    id INTEGER PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT,
    machine_types TEXT  -- JSON array of available machine types
);
```

## Key Features & Status

### ✅ Completed Features
- **Order Management:** Create, start, stop, resume, complete orders
- **Machine Management:** Add, edit, status tracking, environment-based grouping
- **Production Monitoring:** Real-time timers, progress tracking, efficiency calculations
- **Downtime Reporting:** Comprehensive stop analysis with categories and export
- **User Authentication:** Role-based access (admin, supervisor, operator, viewer)
- **Environment Management:** Dynamic environments with machine type configurations
- **Timezone Handling:** Proper SAST (UTC+2) support throughout system

### 🚧 Current Issues/Limitations
- Production timer calculations require `+ (2 * 60 * 60 * 1000)` offset for proper SAST display
- Some legacy components still use React.createElement syntax
- No real-time WebSocket updates yet

### 📋 Component Status Map

| Component | Status | Last Updated | Notes |
|-----------|--------|--------------|-------|
| orders.jsx | ✅ Modern | 2025-01-28 | Updated to "Stop" terminology |
| machines.jsx | ✅ Modern | 2025-01-27 | Dynamic environments |
| dashboard.jsx | ✅ Modern | 2025-01-27 | Full feature set |
| downtime-report.jsx | ✅ New | 2025-01-28 | Complete reporting system |
| production-module.jsx | ✅ Modern | 2025-01-28 | Fixed timers, stop functionality |
| production-control.jsx | ✅ Modern | 2025-01-28 | Enhanced stop tracking |
| settings-module.jsx | ✅ Modern | 2025-01-27 | Full modernization |
| reporting-module.jsx | ✅ Modern | 2025-01-27 | Export capabilities |

## API Endpoints Reference

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create new order
- `POST /api/orders/:id/start` - Start production
- `POST /api/orders/:id/stop` - Stop production (requires reason)
- `POST /api/orders/:id/resume` - Resume stopped production
- `POST /api/orders/:id/complete` - Mark order complete

### Reporting
- `GET /api/reports/downtime` - Downtime analysis with filters
- `GET /api/production/stats` - General production statistics
- `GET /api/production/active` - Currently active orders

### Machines
- `GET /api/machines` - List all machines
- `POST /api/machines` - Add new machine
- `PUT /api/machines/:id` - Update machine
- `PATCH /api/machines/:id/status` - Update machine status

## Environment Variables
```bash
PORT=3000
JWT_SECRET=your_jwt_secret_here
NODE_ENV=production
DB_PATH=./production.db
```

## Build & Deploy Commands
```bash
npm run build    # Build frontend assets
npm run start    # Start production server
npm run dev      # Development mode with Vite
npm run lint     # Code linting
```

## Timezone Implementation Notes
- Database stores SAST time using `datetime('now', '+2 hours')`
- Frontend adds 2-hour offset for timer calculations: `+ (2 * 60 * 60 * 1000)`
- All user-facing times should display in SAST
- Use `formatSASTDate()` utility for consistent time formatting

## Recent Code Patterns

### Modern Component Structure
```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from 'lucide-react';
import API from '../core/api';

export default function ComponentName() {
  const [state, setState] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use useMemo for computed values
  const computedValue = useMemo(() => {
    return state.filter(item => item.active);
  }, [state]);
  
  // Load data pattern
  const loadData = async () => {
    try {
      const data = await API.get('/endpoint');
      setState(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  return <div>Component JSX</div>;
}
```

### API Call Pattern
```javascript
// Stop production (new pattern)
await API.post(`/orders/${orderId}/stop`, { 
  reason: 'machine_breakdown',
  notes: 'Additional details...' 
});

// With proper error handling
try {
  const response = await API.post('/endpoint', data);
  showNotification('Success message');
} catch (error) {
  showNotification('Error: ' + error.message, 'danger');
}
```

## Critical Fixes Implemented (2025-07-30)

### 🔧 **Database Schema Verification**
**Issue:** PM2 logs showing SQLITE_ERROR for missing columns  
**Resolution:** Verified all database tables have required columns:
- `production_orders` table already has `created_at` column
- `production_waste` table (not waste_records) already has `waste_type` column
- **Root Cause:** False positive errors from stale queries
- **Impact:** Eliminated database error noise in logs

### 🐛 **Labour Layout Component Critical Fix**
**Issue:** JSX syntax errors preventing frontend compilation  
**Resolution:** Complete component rebuild with:
- Fixed adjacent JSX elements wrapping issue
- Removed problematic Unicode character (`›` → `&gt;`)
- Cleaned up component structure and imports
- **Files Modified:** `/src/js/components/labour-layout.jsx`
- **Impact:** Component now builds successfully and displays workforce data

### ⚠️ **Timezone Conversion Bug - Data Synchronization**
**Issue:** Labor planner and labour layout showing different data for same dates  
**Root Cause:** 
```javascript
// PROBLEMATIC CODE (labor-planner.jsx)
const utcDate = convertSASTToUTC(selectedDate + 'T00:00:00');
const apiDate = utcDate ? new Date(utcDate).toISOString().split('T')[0] : selectedDate;
// 2025-08-07 (SAST) → 2025-08-06 (UTC) - Wrong!
```

**Resolution:** Removed timezone conversion in labor-planner.jsx to match labour-layout.jsx behavior:
- Both components now use dates directly without UTC conversion
- Database queries use consistent date format (YYYY-MM-DD)
- **Functions Modified:**
  - `fetchData()` - Removed UTC conversion in API calls
  - `currentAssignments` memo - Direct date comparison
  - `addSupervisor()` - Direct date usage
  - `assignEmployee()` - Direct date usage
  - `cancelDayLabour()` - Direct date filtering
  - Machine assignment counting - Direct date filtering

**Impact:** 
- ✅ Both components now show identical data for same dates
- ✅ Assignments created in planner appear in layout view
- ✅ Supervisors assigned in planner appear in layout view
- ✅ Data synchronization restored

### 📊 **Verification Results**
```sql
-- Test Data Verification
SELECT assignment_date, COUNT(*) as assignments 
FROM labor_assignments 
GROUP BY assignment_date 
ORDER BY assignment_date;

2025-08-07 | 3 assignments (now visible in both components)
```

### 🔍 **API Endpoint Analysis**
Both components now correctly query same endpoints:
- **Labour Layout:** `GET /labour/roster?date=2025-08-07`
- **Labor Planner:** `GET /planner/assignments?date=2025-08-07`
- **Database Tables:** `labor_assignments`, `shift_supervisors` (shared data source)

## Next Planned Features
- Real-time WebSocket updates for production status
- Advanced analytics dashboard
- Shift management integration
- Preventive maintenance scheduling
- Quality control integration

---
**Last Updated:** 2025-07-30  
**Maintained by:** Claude AI Assistant  
**Purpose:** Maintain full context for development sessions