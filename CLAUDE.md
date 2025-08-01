# Production Orders App - Claude Context File

## App Overview
**Name:** Production Management System  
**Version:** 2.0.0  
**Type:** Multi-Environment Manufacturing Execution System (MES)  
**Tech Stack:** Node.js, Express, SQLite, **React 19.1.0**, Vite 7.0.6, WebSocket (ws 8.16.0)  
**Architecture:** Mobile-First, Real-time, Progressive Web App  
**Timezone:** SAST (UTC+2) - South African Standard Time  

## Recent Major Changes
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
- **WebSocket Server:** Real-time communication on same port with `/ws` endpoint
- **Features:** Enhanced reconnection, message queuing, room-based subscriptions

### Frontend Structure
```
src/js/
├── components/          # React 19 components (32 total)
│   ├── orders.jsx      # Mobile-responsive orders with WebSocket
│   ├── machines.jsx    # Machine management
│   ├── dashboard.jsx   # Main dashboard
│   ├── mobile-operator-dashboard.jsx # Touch-optimized operator interface
│   ├── mobile-responsive-utils.jsx   # Mobile component library
│   ├── mobile-theme-system.jsx       # High-contrast industrial themes
│   ├── mobile-workflows.jsx          # Touch gesture workflows
│   ├── mobile-offline-system.jsx     # Offline capability system
│   ├── websocket-status.jsx          # Real-time connection monitoring
│   ├── global-websocket-notifications.jsx # System-wide notifications
│   ├── realtime-notifications.jsx    # Live alert system
│   ├── downtime-report.jsx           # Advanced reporting
│   └── ui-components.jsx             # Shared UI library
├── modules/            # Feature modules
│   ├── production-module.jsx # Real-time production controls
│   ├── reporting-module.jsx  # Export & analytics
│   └── settings-module.jsx   # Configuration management
├── core/               # Core functionality
│   ├── websocket-enhanced.js     # Advanced WebSocket service
│   ├── websocket-hooks.js        # React hooks for real-time data
│   ├── auth.js                   # JWT authentication
│   ├── api.js                    # API client
│   ├── event-bus.js              # Event management
│   └── time.js                   # Timezone utilities
├── hooks/              # Custom React hooks
│   └── use-adaptive-refresh.js   # Smart data refresh system
├── utils/              # Utility functions
│   ├── timezone.js     # SAST timezone handling
│   ├── helpers.js      # General utilities
│   └── file-utils.js   # File processing
└── config/             # Configuration
    └── app-config.js   # Application settings
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

## 📱 Mobile-First Architecture

### Mobile Responsiveness Features
- **TouchButton:** Large touch targets (44px minimum) with haptic feedback simulation
- **TouchDropdown:** Mobile-optimized dropdowns with touch-friendly interfaces
- **ResponsiveTable:** Automatically switches to card layout on mobile devices
- **MobileActionMenu:** Context menus optimized for touch interaction
- **MobileNavigation:** Slide-out navigation with hamburger menu

### Touch Gesture System
```javascript
// Touch gesture detection with configurable thresholds
const { useTouchGestures } = require('./mobile-responsive-utils.jsx');

useTouchGestures(element, {
  onSwipeLeft: handleNext,
  onSwipeRight: handlePrevious,
  onLongPress: showContextMenu,
  swipeThreshold: 50,
  longPressDelay: 500
});
```

### Device Detection & Adaptation
- **Screen Size Detection:** Automatic mobile (< 768px), tablet (768-1024px), desktop detection
- **Performance Optimization:** Memory usage monitoring and animation reduction for low-power devices
- **Connection Quality:** Adaptive behavior based on network speed (2G, 3G, 4G, WiFi)
- **Battery Optimization:** Reduced refresh rates and animations when device is in power-saving mode

### Mobile Theme System
- **High-Contrast Colors:** Industrial-grade contrast ratios (4.5:1 minimum) for manufacturing environments
- **Enhanced Visibility:** Optimized for various lighting conditions on production floors
- **Touch-Safe Spacing:** Minimum 44px touch targets with adequate spacing
- **Accessibility:** WCAG 2.1 AA compliant with screen reader support

## 🔄 Real-Time WebSocket System

### WebSocket Architecture
```javascript
// Enhanced WebSocket service with advanced features
class EnhancedWebSocketService {
  // Features:
  // - Automatic reconnection with exponential backoff
  // - Message queuing during disconnections
  // - Room-based subscriptions
  // - Connection health monitoring
  // - Metrics tracking (messages sent/received, reconnections)
}
```

### React Hooks for Real-Time Data
```javascript
// WebSocket integration hooks
import { 
  useWebSocket,           // Core WebSocket connection management
  useWebSocketEvent,      // Event listener with dependency management
  useOrderUpdates,        // Real-time order status updates
  useMachineUpdates,      // Live machine status monitoring  
  useNotifications,       // System-wide notification management
  useAutoConnect          // Automatic connection on authentication
} from '../core/websocket-hooks.js';
```

### Real-Time Event Types
- **order_started, order_stopped, order_completed:** Production lifecycle events
- **machine_update:** Live machine status changes
- **user_joined, user_left:** User presence tracking
- **system_alert, system_maintenance:** Critical system notifications
- **notification:** General application notifications

### Connection Management
- **Auto-Reconnection:** Exponential backoff with maximum 10 attempts
- **Health Monitoring:** 30-second heartbeat with connection quality metrics
- **Message Queuing:** Automatic queuing of messages during disconnections
- **Room Subscriptions:** Environment-based data filtering

## 📊 Adaptive Data Refresh System

### Smart Refresh Priorities
```javascript
const REFRESH_RATES = {
  critical: 5000,   // Machine status, active production (5s)
  high: 15000,      // Orders, quality metrics (15s)
  normal: 30000,    // Dashboard overview (30s)  
  low: 60000,       // Analytics, historical data (1m)
  background: 300000 // User management, settings (5m)
};
```

### Context-Aware Optimization
- **Production Hours:** Faster refresh rates during 6 AM - 10 PM
- **Page Visibility:** Slower refresh when page is hidden
- **Error Recovery:** Exponential backoff on API failures
- **Connection Quality:** Adaptive rates based on network conditions

### Multi-Endpoint Management
```javascript
// Manage multiple data sources with different priorities
const { results, pauseAll, resumeAll } = useMultipleAdaptiveRefresh([
  { endpoint: '/api/production/status', priority: 'critical' },
  { endpoint: '/api/machines/status', priority: 'critical' },
  { endpoint: '/api/orders/active', priority: 'high' }
]);
```

## Key Features & Status

### ✅ Completed Features
- **Mobile-First Design:** Complete touch-optimized interface for manufacturing floor use
- **Real-time WebSocket System:** Live updates for orders, machines, and notifications
- **Adaptive Data Refresh:** Smart refresh rates based on data criticality and user context
- **Progressive Web App:** Offline capability and mobile app-like experience
- **React 19 Architecture:** Modern concurrent features and enhanced performance
- **Order Management:** Create, start, stop, resume, complete orders with real-time updates
- **Machine Management:** Live status tracking with WebSocket integration
- **Production Monitoring:** Real-time timers, progress tracking, efficiency calculations
- **Mobile Operator Dashboard:** Tablet-optimized interface for production operators
- **Touch Gesture Support:** Swipe actions, long press, and mobile-optimized interactions
- **High-Contrast UI:** Industrial-grade color system optimized for manufacturing lighting
- **Downtime Reporting:** Comprehensive stop analysis with categories and export
- **User Authentication:** Role-based access (admin, supervisor, operator, viewer)
- **Environment Management:** Dynamic environments with machine type configurations
- **Timezone Handling:** Proper SAST (UTC+2) support throughout system
- **Performance Optimization:** Device detection, memory management, and connection quality adaptation

### 🚧 Current Issues/Limitations
- Production timer calculations require `+ (2 * 60 * 60 * 1000)` offset for proper SAST display
- Some legacy components may still use React.createElement syntax
- Mobile offline functionality is implemented but requires further testing
- WebSocket reconnection logic needs stress testing under poor network conditions

### 📋 Component Status Map

| Component | Status | Last Updated | Notes |
|-----------|--------|--------------|-------|
| orders.jsx | ✅ Mobile + WebSocket | 2025-08-01 | Full mobile responsiveness, touch gestures, real-time updates |
| mobile-operator-dashboard.jsx | ✅ New | 2025-08-01 | Touch-optimized tablet interface for operators |
| mobile-responsive-utils.jsx | ✅ New | 2025-08-01 | Complete mobile component library with touch gestures |
| mobile-theme-system.jsx | ✅ New | 2025-08-01 | High-contrast industrial design system |
| mobile-workflows.jsx | ✅ New | 2025-08-01 | Touch-optimized production workflows |
| mobile-offline-system.jsx | ✅ New | 2025-08-01 | Offline capability and sync system |
| websocket-status.jsx | ✅ New | 2025-08-01 | Real-time connection monitoring |
| global-websocket-notifications.jsx | ✅ New | 2025-08-01 | System-wide notification management |
| realtime-notifications.jsx | ✅ New | 2025-08-01 | Live alert and notification system |
| machines.jsx | ✅ Modern + WebSocket | 2025-08-01 | Dynamic environments with real-time updates |
| dashboard.jsx | ✅ Modern + WebSocket | 2025-08-01 | Real-time data integration |
| downtime-report.jsx | ✅ Enhanced | 2025-08-01 | Mobile-responsive reporting |
| production-module.jsx | ✅ WebSocket | 2025-08-01 | Real-time production controls |
| production-control.jsx | ✅ WebSocket | 2025-08-01 | Live status tracking |
| settings-module.jsx | ✅ Modern | 2025-08-01 | Mobile-responsive settings |
| reporting-module.jsx | ✅ Enhanced | 2025-08-01 | Advanced export with mobile support |

## API Endpoints Reference

### Orders (Mobile + WebSocket Enhanced)
- `GET /api/orders` - List all orders (supports mobile pagination)
- `POST /api/orders` - Create new order (triggers WebSocket notification)
- `POST /api/orders/:id/start` - Start production (real-time machine updates)
- `POST /api/orders/:id/stop` - Stop production (requires reason, triggers alerts)
- `POST /api/orders/:id/resume` - Resume stopped production
- `POST /api/orders/:id/complete` - Mark order complete
- `GET /api/orders/active` - Currently active orders (critical priority refresh)

### Real-Time WebSocket Events
- **Connection:** `wss://oracles.africa/ws?token=<jwt>` (Production)
- **Connection:** `ws://localhost:3000?token=<jwt>` (Development)
- **Events:** `order_started`, `order_stopped`, `order_completed`, `machine_update`
- **Rooms:** Environment-based subscriptions (`production`, `testing`, `maintenance`)

### Mobile-Optimized Endpoints
- `GET /api/mobile/dashboard` - Condensed dashboard data for mobile
- `GET /api/mobile/operator-status` - Operator-specific active orders
- `GET /api/mobile/quick-actions` - Touch-optimized action list

### Adaptive Refresh Endpoints
- `GET /api/production/status` - Critical priority (5s refresh)
- `GET /api/machines/status` - Critical priority (5s refresh)  
- `GET /api/quality/current` - High priority (15s refresh)
- `GET /api/performance/kpis` - Normal priority (30s refresh)
- `GET /api/analytics/summary` - Low priority (60s refresh)

### Reporting
- `GET /api/reports/downtime` - Downtime analysis with filters
- `GET /api/production/stats` - General production statistics
- `GET /api/production/active` - Currently active orders

### Machines
- `GET /api/machines` - List all machines
- `POST /api/machines` - Add new machine
- `PUT /api/machines/:id` - Update machine
- `PATCH /api/machines/:id/status` - Update machine status (triggers WebSocket update)

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

## Modern Code Patterns (React 19 + WebSocket + Mobile)

### Mobile-First Component Structure
```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from 'lucide-react';
import API from '../core/api';
import { 
  useDeviceDetection, 
  useTouchGestures, 
  ResponsiveTable, 
  TouchButton,
  usePerformanceOptimization
} from './mobile-responsive-utils.jsx';
import { useOrderUpdates, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';

export default function ModernMobileComponent() {
  const [state, setState] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Mobile and performance detection
  const { isMobile, isTablet } = useDeviceDetection();
  const { shouldReduceAnimations } = usePerformanceOptimization();
  
  // WebSocket integration
  useAutoConnect(); // Auto-connect when authenticated
  const { lastUpdate } = useOrderUpdates();
  const { notifications, clearNotification } = useNotifications();
  
  // Computed values with performance optimization
  const computedValue = useMemo(() => {
    return state.filter(item => item.active);
  }, [state]);
  
  // Touch gesture support
  const containerRef = useRef(null);
  useTouchGestures(containerRef.current, {
    onSwipeLeft: () => console.log('Next page'),
    onSwipeRight: () => console.log('Previous page'),
    onLongPress: (e) => showContextMenu(e)
  });
  
  // Adaptive data loading
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
  
  // Real-time updates from WebSocket
  useEffect(() => {
    if (lastUpdate) {
      loadData(); // Refresh data on WebSocket updates
    }
  }, [lastUpdate]);
  
  return (
    <div ref={containerRef} className={shouldReduceAnimations ? '' : 'animate-fade-in'}>
      {isMobile ? (
        <MobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
}
```

### WebSocket Integration Pattern
```javascript
// WebSocket-enabled API calls with real-time updates
import { useWebSocketEvent, useAutoConnect } from '../core/websocket-hooks.js';

// Auto-connect WebSocket when user is authenticated
useAutoConnect();

// Listen for real-time order updates
useWebSocketEvent('order_started', (data) => {
  console.log('🟢 Order started:', data.data.order);
  setOrders(prevOrders => 
    prevOrders.map(order => 
      order.id === data.data.order.id ? data.data.order : order
    )
  );
}, []);

// Stop production with WebSocket notification
const handleStopOrder = async (orderId, reason) => {
  try {
    await API.post(`/orders/${orderId}/stop`, { 
      reason,
      notes: 'Stopped via mobile interface'
    });
    // WebSocket will automatically notify all clients
    showNotification('Order stopped successfully');
  } catch (error) {
    showNotification('Error: ' + error.message, 'danger');
  }
};
```

### Mobile Touch Interface Pattern
```jsx
// Touch-optimized production controls
import { TouchButton, MobileActionMenu } from './mobile-responsive-utils.jsx';

const MobileProductionControls = ({ order, onStart, onStop, onComplete }) => {
  const actions = [
    { 
      label: 'Start Production', 
      icon: Play, 
      action: () => onStart(order.id),
      disabled: order.status !== 'pending'
    },
    { 
      label: 'Stop Production', 
      icon: Square, 
      action: () => onStop(order.id),
      danger: true,
      disabled: order.status !== 'in_progress'
    },
    { 
      label: 'Complete Order', 
      icon: CheckCircle, 
      action: () => onComplete(order.id),
      disabled: order.status !== 'in_progress'
    }
  ];

  return (
    <div className="flex gap-2 md:gap-4">
      {actions.map(action => (
        <TouchButton
          key={action.label}
          onClick={action.action}
          disabled={action.disabled}
          variant={action.danger ? 'danger' : 'primary'}
          size="lg" // Large touch targets
          icon={action.icon}
        >
          {action.label}
        </TouchButton>
      ))}
    </div>
  );
};
```

### Adaptive Refresh Pattern
```javascript
// Smart data refresh with priority-based rates
import { useAdaptiveRefresh, useProductionData } from '../hooks/use-adaptive-refresh.js';

// Single endpoint with adaptive refresh
const { data, isLoading, refresh, pause, resume } = useAdaptiveRefresh(
  '/api/orders/active', 
  'critical' // 5-second refresh during production hours
);

// Multiple endpoints with different priorities
const { results, pauseAll, resumeAll } = useProductionData();

// Access individual data sources
const productionStatus = results.find(r => r.endpoint === '/api/production/status')?.data;
const machineStatus = results.find(r => r.endpoint === '/api/machines/status')?.data;
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

## 🎨 Modern UI Standards & Guidelines (2025-07-31)

### **Applied Enhancements (orders.jsx)**
- ✅ **Gradient animated background** - Dynamic color-shifting background
- ✅ **Glass morphism effects** - Semi-transparent cards with backdrop blur
- ✅ **Floating animations** - Statistics icons with staggered timing
- ✅ **Gradient buttons** - Modern gradient backgrounds on primary actions
- ✅ **Hover lift effects** - Cards and buttons lift with smooth shadows
- ✅ **Enhanced notifications** - Glass morphism with icons and animations

### **🚨 CRITICAL HORIZONTAL SCROLL FIX**
**Issue:** `hover:scale-[1.01]` on table rows caused horizontal scrolling on hover
**Solution:** Removed scale transforms from table rows while preserving other hover effects

**STANDARD RULE FOR ALL FUTURE COMPONENTS:**
```css
/* ❌ AVOID - Causes horizontal scroll in tables */
.table-row {
  hover:scale-[1.01]
}

/* ✅ RECOMMENDED - Safe hover effects for table rows */
.table-row {
  hover:bg-white/50 
  transition-all 
  duration-300 
  hover:shadow-md
}
```

### **Safe Animation Classes (Use These)**
```css
/* Cards & standalone elements - Safe to scale */
.card-hover:hover { transform: scale(1.02); }

/* Buttons - Safe micro-interactions */
.btn-micro:active { transform: scale(0.95); }

/* Table rows - NO SCALING, use background/shadow only */
.table-row:hover { background: rgba(255,255,255,0.5); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

/* Lift effect - Safe for most elements */
.hover-lift:hover { transform: translateY(-2px); }
```

### **Implementation Checklist for Future Components**
- [ ] Apply glass morphism to main containers
- [ ] Use gradient backgrounds for primary actions
- [ ] Add floating animations to icons (with staggered delays)
- [ ] Implement hover-lift for cards and buttons
- [ ] **NEVER use scale transforms on table rows**
- [ ] Test all hover states to ensure no horizontal scrolling
- [ ] Use consistent transition timing (300ms cubic-bezier)

## Next Planned Features
- Real-time WebSocket updates for production status
- Advanced analytics dashboard
- Shift management integration
- Preventive maintenance scheduling
- Quality control integration

---
**Last Updated:** 2025-07-31  
**Maintained by:** Claude AI Assistant  
**Purpose:** Maintain full context for development sessions