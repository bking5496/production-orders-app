# PostgreSQL Migration Plan
## Production Orders Manufacturing System

**Project:** SQLite to PostgreSQL Migration with Centralized Timezone Handling  
**Duration:** 25 Days  
**Created:** August 1, 2025  
**Status:** Planning Phase

---

## Executive Summary

This document outlines a comprehensive migration strategy from SQLite to PostgreSQL for the production manufacturing execution system, focusing on zero-downtime deployment, data integrity preservation, and centralized timezone handling improvements using PostgreSQL native features.

### Current System Overview
- **Database:** SQLite (production.db) with 15+ tables
- **Timezone Handling:** Custom SAST (UTC+2) implementation in `/src/js/core/time.js`
- **Architecture:** Node.js/Express backend with React frontend
- **Critical Features:** Real-time WebSocket tracking, shift management, production orders

### Migration Objectives
1. ✅ Complete migration from SQLite to PostgreSQL
2. ✅ Centralize timezone handling using PostgreSQL native features
3. ✅ Maintain existing SAST business logic
4. ✅ Achieve zero-downtime deployment
5. ✅ Preserve data integrity throughout migration
6. ✅ Optimize performance post-migration

---

## Phase-by-Phase Breakdown

### 🏗️ PHASE 1: FOUNDATION AND ANALYSIS (Days 1-3)

#### Task 1.1: Pre-Migration Analysis
**Duration:** 2 days | **Priority:** High | **Owner:** Database Team

**Technical Steps:**
1. **Database Schema Analysis**
   - Document all 15+ tables with relationships
   - Analyze foreign key constraints and indexes
   - Assess data volume and growth patterns
   - Identify complex queries requiring optimization

2. **Environment Setup**
   ```bash
   # PostgreSQL 15+ installation
   sudo apt update
   sudo apt install postgresql-15 postgresql-contrib-15
   
   # Configure timezone
   sudo -u postgres psql -c "ALTER SYSTEM SET timezone = 'Africa/Johannesburg';"
   sudo systemctl restart postgresql
   ```

3. **Risk Assessment Matrix**
   - Critical business hours identification
   - Rollback trigger definitions
   - Stakeholder communication plan

**Deliverables:**
- [ ] Complete database schema documentation
- [ ] PostgreSQL development environment
- [ ] Risk mitigation strategies document
- [ ] Business constraints timeline

---

### 🔄 PHASE 2: SCHEMA AND CONNECTION MIGRATION (Days 4-7)

#### Task 2.1: PostgreSQL Schema Design
**Duration:** 2 days | **Priority:** High | **Owner:** Database Team

**Schema Conversion Examples:**
```sql
-- SQLite to PostgreSQL conversions

-- Users table enhancement
CREATE TABLE users (
    id SERIAL PRIMARY KEY,                    -- Was: INTEGER PRIMARY KEY AUTOINCREMENT
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'supervisor', 'operator', 'viewer')),
    is_active BOOLEAN DEFAULT true,           -- Was: BOOLEAN DEFAULT 1
    created_at TIMESTAMPTZ DEFAULT NOW(),     -- Was: DATETIME DEFAULT CURRENT_TIMESTAMP
    last_login TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg'  -- New: timezone support
);

-- Production orders with timezone enhancement
CREATE TABLE production_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    actual_quantity INTEGER CHECK (actual_quantity >= 0),
    environment TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    machine_id INTEGER REFERENCES machines(id),
    operator_id INTEGER REFERENCES users(id),
    due_date TIMESTAMPTZ,                     -- Enhanced with timezone
    created_at TIMESTAMPTZ DEFAULT NOW(),
    start_time TIMESTAMPTZ,
    stop_time TIMESTAMPTZ,
    complete_time TIMESTAMPTZ,
    notes TEXT,
    archived BOOLEAN DEFAULT false
);
```

**Key Enhancements:**
- Replace `INTEGER AUTOINCREMENT` with `SERIAL`
- Convert `DATETIME` to `TIMESTAMPTZ` for proper timezone support
- Add `CHECK` constraints for data validation
- Implement proper foreign key relationships

#### Task 2.2: Database Connection Migration
**Duration:** 2 days | **Priority:** High | **Owner:** Backend Team

**Connection Layer Updates:**
```javascript
// Replace sqlite3 with pg in server.js
const { Pool } = require('pg');

// Database connection configuration
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'production_orders',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    max: 20,                    // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Timezone configuration
    timezone: 'Africa/Johannesburg'
};

const pool = new Pool(dbConfig);

// Updated database helper functions
const dbRun = async (sql, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result;
    } finally {
        client.release();
    }
};

const dbGet = async (sql, params = []) => {
    const result = await dbRun(sql, params);
    return result.rows[0] || null;
};

const dbAll = async (sql, params = []) => {
    const result = await dbRun(sql, params);
    return result.rows || [];
};
```

**Environment Configuration:**
```bash
# .env updates
DB_HOST=localhost
DB_PORT=5432
DB_NAME=production_orders
DB_USER=postgres
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:password@localhost:5432/production_orders
```

---

### ⚡ PHASE 3: APPLICATION LOGIC MIGRATION (Days 8-12)

#### Task 3.1: Centralized Timezone Handling
**Duration:** 3 days | **Priority:** High | **Owner:** Full-Stack Team

**Enhanced Timezone System:**
```javascript
// Updated /src/js/core/time.js with PostgreSQL integration
export const TIMEZONE_CONFIG = {
    name: 'Africa/Johannesburg',
    postgresTimezone: 'Africa/Johannesburg',
    displayName: 'South African Standard Time (SAST)',
    utcOffset: '+02:00'
};

// Use PostgreSQL's native timezone handling
export async function getCurrentSASTTime() {
    const result = await pool.query(
        "SELECT NOW() AT TIME ZONE $1 as sast_time",
        [TIMEZONE_CONFIG.postgresTimezone]
    );
    return result.rows[0].sast_time;
}

// PostgreSQL timezone conversion
export async function convertToSAST(utcDateTime) {
    const result = await pool.query(
        "SELECT $1::timestamptz AT TIME ZONE $2 as sast_time",
        [utcDateTime, TIMEZONE_CONFIG.postgresTimezone]
    );
    return result.rows[0].sast_time;
}

// Database-level timezone formatting
export async function formatSASTDateTime(dateTime, format = 'YYYY-MM-DD HH24:MI:SS') {
    const result = await pool.query(
        "SELECT TO_CHAR($1::timestamptz AT TIME ZONE $2, $3) as formatted_time",
        [dateTime, TIMEZONE_CONFIG.postgresTimezone, format]
    );
    return result.rows[0].formatted_time;
}
```

#### Task 3.2: SQL Query Migration
**Duration:** 2 days | **Priority:** High | **Owner:** Backend Team

**Query Conversion Examples:**
```javascript
// Before (SQLite)
const getCurrentOrders = `
    SELECT *, datetime('now', '+2 hours') as current_sast_time 
    FROM production_orders 
    WHERE status = ? 
    ORDER BY created_at LIMIT ?
`;

// After (PostgreSQL)
const getCurrentOrders = `
    SELECT *, NOW() AT TIME ZONE 'Africa/Johannesburg' as current_sast_time 
    FROM production_orders 
    WHERE status = $1 
    ORDER BY created_at 
    LIMIT $2
`;

// Parameter binding updates
// SQLite: db.all(sql, [status, limit])
// PostgreSQL: pool.query(sql, [status, limit])
```

**Key Changes:**
- Replace `?` placeholders with `$1, $2, $3...`
- Convert `datetime('now', '+2 hours')` to `NOW() AT TIME ZONE 'Africa/Johannesburg'`
- Update LIMIT/OFFSET syntax for pagination
- Replace SQLite-specific functions with PostgreSQL equivalents

---

### 📊 PHASE 4: DATA MIGRATION AND VALIDATION (Days 13-16)

#### Task 4.1: Data Migration Scripts
**Duration:** 3 days | **Priority:** High | **Owner:** Database Team

**Migration Script Example:**
```python
#!/usr/bin/env python3
"""
SQLite to PostgreSQL Data Migration Script
Handles timezone conversion and data validation
"""

import sqlite3
import psycopg2
import csv
from datetime import datetime, timezone, timedelta
import logging

# SAST timezone offset
SAST_OFFSET = timedelta(hours=2)

def migrate_table_data(sqlite_conn, pg_conn, table_name, timezone_columns=[]):
    """Migrate data from SQLite to PostgreSQL with timezone handling"""
    
    # Export from SQLite
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cursor.fetchall()
    
    # Get column names
    column_names = [description[0] for description in sqlite_cursor.description]
    
    if not rows:
        print(f"No data to migrate for table {table_name}")
        return
    
    # Transform data for PostgreSQL
    pg_cursor = pg_conn.cursor()
    
    for row in rows:
        # Convert timezone-sensitive columns
        converted_row = list(row)
        for i, col_name in enumerate(column_names):
            if col_name in timezone_columns and converted_row[i]:
                # Convert SQLite datetime to PostgreSQL timestamptz
                dt = datetime.fromisoformat(converted_row[i].replace('Z', '+00:00'))
                # Ensure it's treated as SAST
                converted_row[i] = dt.replace(tzinfo=timezone(SAST_OFFSET))
        
        # Insert into PostgreSQL
        placeholders = ','.join(['%s'] * len(converted_row))
        insert_query = f"INSERT INTO {table_name} ({','.join(column_names)}) VALUES ({placeholders})"
        pg_cursor.execute(insert_query, converted_row)
    
    pg_conn.commit()
    print(f"Successfully migrated {len(rows)} rows from {table_name}")

# Migration configuration
TABLES_TO_MIGRATE = [
    {
        'name': 'users',
        'timezone_columns': ['created_at', 'last_login']
    },
    {
        'name': 'production_orders',
        'timezone_columns': ['created_at', 'start_time', 'stop_time', 'complete_time', 'due_date']
    },
    {
        'name': 'production_stops',
        'timezone_columns': ['start_time', 'end_time', 'resolved_at']
    }
    # Add all other tables...
]

if __name__ == "__main__":
    # Connect to databases
    sqlite_conn = sqlite3.connect('/home/production-app/production-orders-app/production.db')
    pg_conn = psycopg2.connect(
        host='localhost',
        database='production_orders',
        user='postgres',
        password='your_password'
    )
    
    # Migrate each table
    for table_config in TABLES_TO_MIGRATE:
        migrate_table_data(
            sqlite_conn, 
            pg_conn, 
            table_config['name'], 
            table_config['timezone_columns']
        )
    
    # Cleanup
    sqlite_conn.close()
    pg_conn.close()
    print("Migration completed successfully!")
```

**Validation Scripts:**
```sql
-- Data integrity validation queries
SELECT 
    'users' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT id) as unique_ids,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM users

UNION ALL

SELECT 
    'production_orders' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT id) as unique_ids,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM production_orders;

-- Timezone validation
SELECT 
    'Timezone Check' as test_name,
    EXTRACT(TIMEZONE FROM NOW()) / 3600 as hours_offset,
    CASE 
        WHEN EXTRACT(TIMEZONE FROM NOW()) / 3600 = 2 THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;
```

---

### 🧪 PHASE 5: COMPREHENSIVE TESTING (Days 17-20)

#### Task 5.1: Application Testing Suite
**Duration:** 3 days | **Priority:** High | **Owner:** QA Team

**Testing Categories:**
1. **API Endpoint Testing**
   - All CRUD operations for each entity
   - Authentication and authorization flows
   - Error handling and edge cases
   - File upload and Excel processing

2. **Real-time Features Testing**
   - WebSocket connection stability
   - Production order status updates
   - Shift change notifications
   - Multi-user concurrent operations

3. **Timezone Functionality Testing**
   ```javascript
   // Test cases for timezone handling
   describe('Timezone Handling', () => {
       test('should return current SAST time', async () => {
           const sastTime = await getCurrentSASTTime();
           expect(sastTime).toBeDefined();
           // Verify it's 2 hours ahead of UTC
       });
       
       test('should convert UTC to SAST correctly', async () => {
           const utcTime = '2025-08-01T10:00:00Z';
           const sastTime = await convertToSAST(utcTime);
           expect(sastTime.getHours()).toBe(12); // 10 + 2 hours
       });
   });
   ```

**Load Testing Configuration:**
```javascript
// K6 load testing script
import http from 'k6/http';
import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
    stages: [
        { duration: '2m', target: 20 },   // Ramp up
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 0 },    // Ramp down
    ],
};

export default function () {
    // Test production order creation
    const payload = JSON.stringify({
        order_number: `ORDER-${Date.now()}`,
        product_name: 'Test Product',
        quantity: 100,
        environment: 'production'
    });
    
    const response = http.post('http://localhost:3000/api/orders', payload, {
        headers: { 'Content-Type': 'application/json' },
    });
    
    check(response, {
        'status is 201': (r) => r.status === 201,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
}
```

---

### 🚀 PHASE 6: PRODUCTION DEPLOYMENT (Days 21-23)

#### Task 6.1: Blue-Green Deployment Strategy
**Duration:** 2 days | **Priority:** High | **Owner:** DevOps Team

**Deployment Process:**
```bash
#!/bin/bash
# Blue-Green Deployment Script

set -e

# Configuration
BLUE_DB="production_orders_blue"
GREEN_DB="production_orders_green"
CURRENT_ENV="blue"
NEW_ENV="green"

echo "Starting Blue-Green PostgreSQL Migration Deployment..."

# Step 1: Set up Green environment (PostgreSQL)
echo "Setting up Green environment..."
createdb $GREEN_DB
psql $GREEN_DB < schema.sql

# Step 2: Migrate data during low-traffic window (e.g., 2 AM SAST)
echo "Migrating data to Green environment..."
python3 migration_script.py --source=sqlite --target=$GREEN_DB

# Step 3: Validate Green environment
echo "Validating Green environment..."
python3 validation_script.py --database=$GREEN_DB

# Step 4: Switch application configuration
echo "Switching to Green environment..."
export DATABASE_URL="postgresql://user:pass@localhost:5432/$GREEN_DB"

# Step 5: Health check
echo "Performing health check..."
curl -f http://localhost:3000/api/health || exit 1

# Step 6: Monitor for 15 minutes
echo "Monitoring new environment..."
sleep 900

# Step 7: Success - update environment labels
echo "Deployment successful!"
```

**Rollback Procedure:**
```bash
#!/bin/bash
# Emergency Rollback Script

echo "EMERGENCY ROLLBACK INITIATED"
echo "Switching back to SQLite database..."

# Restore original configuration
export DATABASE_PATH="./production.db"
export DATABASE_TYPE="sqlite"

# Restart application
pm2 restart production-orders-app

# Verify rollback
curl -f http://localhost:3000/api/health

echo "Rollback completed. System restored to SQLite."
```

**Monitoring Setup:**
```javascript
// Health check endpoint enhancement
app.get('/api/health', async (req, res) => {
    try {
        // Database connectivity check
        const dbResult = await pool.query('SELECT NOW() as current_time');
        
        // Timezone verification
        const timezoneResult = await pool.query(
            "SELECT EXTRACT(TIMEZONE FROM NOW()) / 3600 as tz_offset"
        );
        
        const health = {
            status: 'healthy',
            timestamp: dbResult.rows[0].current_time,
            database: 'postgresql',
            timezone_offset: timezoneResult.rows[0].tz_offset,
            version: process.env.npm_package_version
        };
        
        res.json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
```

---

### ✅ PHASE 7: POST-MIGRATION VALIDATION (Days 24-25)

#### Task 7.1: Final Validation and Documentation
**Duration:** 2 days | **Priority:** High | **Owner:** Project Team

**Validation Checklist:**
- [ ] All production orders processing correctly
- [ ] Shift management functionality operational
- [ ] Real-time WebSocket tracking accurate
- [ ] Timezone conversions working properly
- [ ] Performance metrics within acceptable ranges
- [ ] User authentication and authorization working
- [ ] Reporting systems generating accurate data
- [ ] Mobile interface compatibility confirmed

**Performance Metrics:**
```sql
-- Performance validation queries
SELECT 
    schemaname,
    tablename,
    attname,
    avg_width,
    n_distinct,
    most_common_vals
FROM pg_stats 
WHERE tablename IN ('users', 'production_orders', 'machines')
ORDER BY tablename, attname;

-- Query performance analysis
EXPLAIN ANALYZE 
SELECT po.*, u.username, m.name as machine_name
FROM production_orders po
JOIN users u ON po.operator_id = u.id
JOIN machines m ON po.machine_id = m.id
WHERE po.status = 'in_progress'
AND po.created_at >= NOW() - INTERVAL '7 days';
```

---

## Risk Management

### High-Risk Scenarios

#### 1. Data Loss Prevention
**Risk Level:** CRITICAL

**Mitigation Strategies:**
- Multiple backup layers before migration
- Real-time data validation during migration
- Point-in-time recovery capability
- Automated backup verification

**Rollback Triggers:**
- Any data integrity failures
- Missing records after migration
- Corrupted foreign key relationships

#### 2. Downtime Minimization
**Risk Level:** HIGH

**Mitigation Strategies:**
- Blue-green deployment approach
- Feature flags for gradual rollout
- Load balancer configuration for seamless switching
- Real-time health monitoring

**Rollback Triggers:**
- Application response time > 2 seconds
- Database connection failures
- Authentication system failures

#### 3. Performance Degradation  
**Risk Level:** MEDIUM

**Mitigation Strategies:**
- Comprehensive load testing before deployment
- Query optimization and indexing
- Connection pooling configuration
- Performance monitoring with alerts

**Rollback Triggers:**
- Query response time increase > 25%
- CPU utilization > 80% sustained
- Memory usage > 90%

### Emergency Procedures

#### Immediate Response Protocol
1. **Alert System:** Automated alerts for critical metrics
2. **Escalation Path:** On-call engineer → Team Lead → Management
3. **Communication:** Real-time status updates to stakeholders
4. **Decision Matrix:** Pre-defined rollback criteria

#### Post-Incident Process
1. **Root Cause Analysis:** Within 24 hours
2. **Lessons Learned:** Document and share findings
3. **Process Improvement:** Update procedures based on learnings
4. **Preventive Measures:** Implement additional safeguards

---

## Success Criteria

### Technical Requirements
- ✅ Zero data loss during migration
- ✅ <5% performance degradation from baseline
- ✅ All automated tests passing (100%)
- ✅ Database response time <500ms for 95% of queries
- ✅ WebSocket connections stable under load

### Business Requirements
- ✅ Production order processing accuracy maintained
- ✅ Shift management operations uninterrupted
- ✅ Real-time tracking functionality preserved
- ✅ Reporting accuracy verified against historical data
- ✅ User satisfaction scores maintained

### Operational Requirements
- ✅ 24/7 monitoring and alerting operational
- ✅ Backup and recovery procedures tested
- ✅ Documentation updated and accessible
- ✅ Team training completed
- ✅ Support procedures established

---

## Resource Requirements

### Team Composition
- **Project Manager:** 1 person (full-time, 25 days)
- **Database Administrator:** 1 person (full-time, 25 days)
- **Backend Developer:** 2 people (full-time, 20 days)
- **Frontend Developer:** 1 person (part-time, 10 days)
- **QA Engineer:** 1 person (full-time, 15 days)
- **DevOps Engineer:** 1 person (full-time, 10 days)

### Infrastructure Requirements
- **Development PostgreSQL Server:** 16GB RAM, 4 CPU cores
- **Staging Environment:** Mirror of production
- **Backup Storage:** 500GB for data backups
- **Monitoring Tools:** PostgreSQL monitoring, application APM

### Budget Considerations
- **Infrastructure Costs:** Estimated $500-1000/month
- **Tooling and Licenses:** $200-500 one-time
- **Backup and Monitoring:** $100-300/month
- **Training and Documentation:** $1000-2000 one-time

---

## Timeline Summary

| Phase | Duration | Key Deliverables | Dependencies |
|-------|----------|------------------|--------------|
| Foundation | 3 days | Environment setup, risk assessment | None |
| Schema Migration | 4 days | PostgreSQL schema, connection layer | Phase 1 |
| Application Logic | 5 days | Timezone handling, query migration | Phase 2 |
| Data Migration | 4 days | Data transfer and validation | Phase 3 |
| Testing | 4 days | Comprehensive testing suite | Phase 4 |
| Deployment | 3 days | Production deployment | Phase 5 |
| Validation | 2 days | Final validation and sign-off | Phase 6 |

**Total Duration:** 25 days  
**Critical Path:** Schema Design → Connection Migration → Data Migration → Testing → Deployment

---

## Communication Plan

### Stakeholder Updates
- **Daily Standups:** Development team (Days 1-25)
- **Weekly Reports:** Management and business stakeholders
- **Milestone Reviews:** End of each phase with key stakeholders
- **Go/No-Go Meetings:** Before production deployment

### Documentation
- **Technical Documentation:** Updated throughout migration
- **User Guides:** Updated for any interface changes  
- **Runbooks:** Operations procedures for new PostgreSQL system
- **Troubleshooting Guides:** Common issues and resolutions

### Training Requirements
- **Database Team:** PostgreSQL administration and monitoring
- **Development Team:** PostgreSQL query optimization and debugging
- **Operations Team:** New backup and recovery procedures
- **Support Team:** Updated troubleshooting procedures

---

## Appendices

### A. Database Schema Comparison
*[Detailed comparison between SQLite and PostgreSQL schemas]*

### B. Query Migration Reference
*[Complete list of SQLite to PostgreSQL query conversions]*

### C. Testing Scripts
*[Comprehensive test suite for validation]*

### D. Monitoring Configuration
*[PostgreSQL monitoring setup and alert configurations]*

### E. Backup and Recovery Procedures
*[Detailed backup strategies and recovery procedures]*

---

**Document Control:**
- **Version:** 1.0
- **Last Updated:** August 1, 2025
- **Next Review:** August 8, 2025
- **Approved By:** [Project Manager Name]
- **Distribution:** Development Team, Management, Operations

---

*This document is a living document and will be updated throughout the migration process to reflect actual progress, lessons learned, and any necessary adjustments to the plan.*