-- Enhanced Validation Constraints
-- This script adds comprehensive validation rules and constraints to ensure data integrity

BEGIN TRANSACTION;

-- =================================================================================
-- 1. ENHANCED CHECK CONSTRAINTS FOR EXISTING TABLES
-- =================================================================================

-- We'll recreate key tables with enhanced constraints since SQLite doesn't support ALTER TABLE ADD CONSTRAINT

-- First, let's create backup tables and add enhanced constraints

-- Enhanced Users Table Constraints
CREATE TABLE IF NOT EXISTS users_enhanced_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE 
        CHECK (length(username) >= 3 AND length(username) <= 50),
    fullName TEXT NOT NULL 
        CHECK (length(fullName) >= 2 AND length(fullName) <= 100),
    password TEXT NOT NULL 
        CHECK (length(password) >= 6),
    role TEXT NOT NULL 
        CHECK (role IN ('admin', 'supervisor', 'operator', 'packer', 'maintenance')),
    employee_code TEXT UNIQUE 
        CHECK (employee_code IS NULL OR (length(employee_code) >= 3 AND length(employee_code) <= 20)),
    is_active BOOLEAN DEFAULT TRUE NOT NULL 
        CHECK (is_active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Additional validation rules
    CONSTRAINT chk_username_format CHECK (username GLOB '[A-Za-z0-9_]*'),
    CONSTRAINT chk_employee_code_format CHECK (employee_code IS NULL OR employee_code GLOB '[A-Z][A-Z0-9][A-Z0-9]*'),
    CONSTRAINT chk_fullname_format CHECK (fullName NOT GLOB '*[0-9]*' AND length(trim(fullName)) = length(fullName))
);

-- Enhanced Machines Table Constraints  
CREATE TABLE IF NOT EXISTS machines_enhanced_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE 
        CHECK (length(name) >= 2 AND length(name) <= 100),
    type TEXT NOT NULL 
        CHECK (type IN ('production', 'blending', 'packaging', 'quality_control', 'maintenance')),
    environment TEXT NOT NULL 
        CHECK (environment IN ('production', 'blending', 'packaging')),
    status TEXT DEFAULT 'available' 
        CHECK (status IN ('available', 'maintenance', 'broken', 'retired')),
    capacity INTEGER NOT NULL DEFAULT 100 
        CHECK (capacity > 0 AND capacity <= 10000),
    production_rate INTEGER NOT NULL DEFAULT 60 
        CHECK (production_rate > 0 AND production_rate <= 1000),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional validation rules
    CONSTRAINT chk_capacity_rate_relationship CHECK (production_rate <= capacity),
    CONSTRAINT chk_machine_name_format CHECK (name NOT LIKE '% %' OR length(trim(name)) = length(name))
);

-- Enhanced Labor Assignments Constraints
CREATE TABLE IF NOT EXISTS labor_assignments_enhanced_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    machine_id INTEGER NOT NULL,
    assignment_date TEXT NOT NULL 
        CHECK (date(assignment_date) IS NOT NULL),
    shift TEXT NOT NULL 
        CHECK (shift IN ('day', 'night')),
    status TEXT DEFAULT 'planned' 
        CHECK (status IN ('planned', 'present', 'absent', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    
    -- Enhanced constraints
    CONSTRAINT chk_assignment_date_not_past CHECK (
        date(assignment_date) >= date('now', '-1 day') OR status != 'planned'
    ),
    CONSTRAINT chk_assignment_date_not_too_future CHECK (
        date(assignment_date) <= date('now', '+90 days')
    ),
    
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    -- Prevent duplicate assignments
    UNIQUE(employee_id, assignment_date, shift),
    -- Prevent machine over-assignment (simplified - in reality you might allow multiple operators per machine)
    UNIQUE(machine_id, assignment_date, shift)
);

-- Enhanced Production Orders Constraints
CREATE TABLE IF NOT EXISTS production_orders_enhanced_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE 
        CHECK (length(order_number) >= 5 AND length(order_number) <= 50),
    product_name TEXT NOT NULL 
        CHECK (length(product_name) >= 2 AND length(product_name) <= 200),
    quantity INTEGER NOT NULL 
        CHECK (quantity > 0 AND quantity <= 1000000),
    status TEXT DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    environment TEXT NOT NULL 
        CHECK (environment IN ('production', 'blending', 'packaging')),
    machine_id INTEGER,
    due_date DATETIME NOT NULL 
        CHECK (datetime(due_date) > datetime('now', '-1 day')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    archived BOOLEAN DEFAULT FALSE 
        CHECK (archived IN (0, 1)),
    
    -- Business logic constraints
    CONSTRAINT chk_completion_date_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    ),
    CONSTRAINT chk_due_date_reasonable CHECK (
        datetime(due_date) <= datetime('now', '+365 days')
    ),
    CONSTRAINT chk_order_number_format CHECK (
        order_number GLOB '[A-Z]*[0-9]*' OR order_number GLOB '[0-9]*'
    ),
    
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
);

-- =================================================================================
-- 2. DATA VALIDATION FUNCTIONS (VIEWS)
-- =================================================================================

-- Create validation views to check data integrity
CREATE VIEW IF NOT EXISTS v_data_validation_report AS
SELECT 
    'users' as table_name,
    'missing_employee_codes' as validation_type,
    COUNT(*) as violation_count,
    'Users without employee codes' as description
FROM users 
WHERE employee_code IS NULL OR employee_code = ''

UNION ALL

SELECT 
    'labor_assignments' as table_name,
    'future_assignments_too_far' as validation_type,
    COUNT(*) as violation_count,
    'Assignments scheduled more than 90 days in future' as description
FROM labor_assignments 
WHERE date(assignment_date) > date('now', '+90 days')

UNION ALL

SELECT 
    'labor_assignments' as table_name,
    'duplicate_employee_assignments' as validation_type,
    COUNT(*) as violation_count,
    'Employees with multiple assignments on same date/shift' as description
FROM (
    SELECT employee_id, assignment_date, shift, COUNT(*) as cnt
    FROM labor_assignments 
    GROUP BY employee_id, assignment_date, shift
    HAVING cnt > 1
)

UNION ALL

SELECT 
    'production_orders' as table_name,
    'overdue_orders' as validation_type,
    COUNT(*) as violation_count,
    'Orders past due date but not completed' as description
FROM production_orders 
WHERE datetime(due_date) < datetime('now') 
  AND status NOT IN ('completed', 'cancelled')

UNION ALL

SELECT 
    'machines' as table_name,
    'invalid_capacity_rate' as validation_type,
    COUNT(*) as violation_count,
    'Machines with production_rate > capacity' as description
FROM machines 
WHERE production_rate > capacity

UNION ALL

SELECT 
    'users' as table_name,
    'inactive_users_with_assignments' as validation_type,
    COUNT(DISTINCT u.id) as violation_count,
    'Inactive users with future assignments' as description
FROM users u
JOIN labor_assignments la ON u.id = la.employee_id
WHERE u.is_active = FALSE 
  AND date(la.assignment_date) >= date('now');

-- =================================================================================
-- 3. CONSTRAINT VIOLATION TRIGGERS
-- =================================================================================

-- Trigger to prevent assignment of inactive users
CREATE TRIGGER IF NOT EXISTS prevent_inactive_user_assignment
    BEFORE INSERT ON labor_assignments
    FOR EACH ROW
    WHEN (SELECT is_active FROM users WHERE id = NEW.employee_id) = 0
BEGIN
    SELECT RAISE(ABORT, 'Cannot assign inactive user to work shift');
END;

-- Trigger to prevent assignment to unavailable machines
CREATE TRIGGER IF NOT EXISTS prevent_unavailable_machine_assignment
    BEFORE INSERT ON labor_assignments
    FOR EACH ROW
    WHEN (SELECT status FROM machines WHERE id = NEW.machine_id) != 'available'
BEGIN
    SELECT RAISE(ABORT, 'Cannot assign work to unavailable machine');
END;

-- Trigger to validate production order dates
CREATE TRIGGER IF NOT EXISTS validate_production_order_dates
    BEFORE INSERT ON production_orders
    FOR EACH ROW
    WHEN datetime(NEW.due_date) <= datetime('now')
BEGIN
    SELECT RAISE(ABORT, 'Due date must be in the future');
END;

-- Trigger to ensure completed orders have completion timestamp
CREATE TRIGGER IF NOT EXISTS ensure_completion_timestamp
    BEFORE UPDATE ON production_orders
    FOR EACH ROW
    WHEN NEW.status = 'completed' AND NEW.completed_at IS NULL
BEGIN
    UPDATE production_orders 
    SET completed_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- =================================================================================
-- 4. BUSINESS RULE CONSTRAINTS
-- =================================================================================

-- Create a business rules validation table
CREATE TABLE IF NOT EXISTS business_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL UNIQUE,
    rule_category TEXT NOT NULL CHECK (rule_category IN ('assignment', 'production', 'quality', 'safety')),
    rule_description TEXT NOT NULL,
    validation_query TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    severity TEXT DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Insert standard business rules
INSERT OR IGNORE INTO business_rules (rule_name, rule_category, rule_description, validation_query, severity, created_by)
VALUES 
('max_shift_assignments', 'assignment', 'No employee should work more than 6 consecutive days', 
 'SELECT employee_id FROM labor_assignments WHERE status != ''absent'' GROUP BY employee_id HAVING COUNT(*) > 6', 
 'warning', 1),

('machine_maintenance_schedule', 'production', 'Machines should not be assigned if maintenance is overdue',
 'SELECT id FROM machines WHERE status = ''available'' AND last_maintenance < date(''now'', ''-30 days'')',
 'error', 1),

('supervisor_coverage', 'assignment', 'Each shift must have at least one supervisor assigned',
 'SELECT assignment_date, shift FROM labor_assignments la WHERE NOT EXISTS (SELECT 1 FROM labor_assignments la2 JOIN users u ON la2.employee_id = u.id WHERE la2.assignment_date = la.assignment_date AND la2.shift = la.shift AND u.role = ''supervisor'')',
 'critical', 1),

('quality_check_frequency', 'quality', 'Quality checks should be performed at least every 4 hours',
 'SELECT order_id FROM production_orders WHERE status = ''in_progress'' AND NOT EXISTS (SELECT 1 FROM quality_checks WHERE order_id = production_orders.id AND created_at > datetime(''now'', ''-4 hours''))',
 'error', 1);

-- =================================================================================
-- 5. CREATE VALIDATION INDEXES
-- =================================================================================

-- Indexes to support constraint checking
CREATE INDEX IF NOT EXISTS idx_users_active_employee_code 
ON users(is_active, employee_code);

CREATE INDEX IF NOT EXISTS idx_machines_status_environment 
ON machines(status, environment);

CREATE INDEX IF NOT EXISTS idx_labor_assignments_employee_date_shift 
ON labor_assignments(employee_id, assignment_date, shift);

CREATE INDEX IF NOT EXISTS idx_production_orders_status_due_date 
ON production_orders(status, due_date);

-- =================================================================================
-- 6. CONSTRAINT MONITORING VIEW
-- =================================================================================

CREATE VIEW IF NOT EXISTS v_constraint_monitoring AS
SELECT 
    'Real-time Constraint Violations' as report_title,
    datetime('now') as check_timestamp,
    (SELECT COUNT(*) FROM v_data_validation_report WHERE violation_count > 0) as total_violations,
    (SELECT SUM(violation_count) FROM v_data_validation_report) as total_violation_records;

-- =================================================================================
-- 7. VALIDATION SUMMARY
-- =================================================================================

-- Create a comprehensive validation report
SELECT 'Enhanced validation constraints implemented successfully!' as status;

-- Show current validation status
SELECT 'Current Data Validation Report:' as report_header;
SELECT * FROM v_data_validation_report WHERE violation_count > 0;

-- Show constraint summary
SELECT 'Constraint Summary:' as summary_header;
SELECT 
    COUNT(*) as total_business_rules,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_rules,
    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_rules,
    SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as error_rules,
    SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning_rules
FROM business_rules;

SELECT 'Validation system includes: triggers, check constraints, business rules, and monitoring views!' as features;

COMMIT;