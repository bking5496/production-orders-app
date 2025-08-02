-- Enhanced Downtime Tracking Database Schema
-- Comprehensive downtime recording and categorization

-- 1. ENHANCED DOWNTIME CATEGORIES AND TRACKING
CREATE TABLE IF NOT EXISTS downtime_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_code TEXT UNIQUE NOT NULL,
    category_name TEXT NOT NULL,
    description TEXT,
    color_code TEXT DEFAULT '#ff6b6b',
    requires_approval BOOLEAN DEFAULT FALSE,
    auto_resolution BOOLEAN DEFAULT FALSE,
    priority_level INTEGER DEFAULT 3, -- 1=Critical, 2=High, 3=Medium, 4=Low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard downtime categories
INSERT OR IGNORE INTO downtime_categories (category_code, category_name, description, color_code, requires_approval, priority_level) VALUES
('MECH_FAIL', 'Mechanical Failure', 'Equipment mechanical breakdown', '#dc2626', true, 1),
('ELEC_FAIL', 'Electrical Failure', 'Electrical system issues', '#dc2626', true, 1),
('MATERIAL_OUT', 'Material Shortage', 'Raw material unavailable', '#f59e0b', false, 2),
('QUALITY_HOLD', 'Quality Hold', 'Quality issue requiring investigation', '#f59e0b', true, 2),
('CHANGEOVER', 'Product Changeover', 'Planned product changeover', '#10b981', false, 3),
('MAINTENANCE', 'Planned Maintenance', 'Scheduled maintenance activity', '#10b981', false, 3),
('CLEANING', 'Cleaning/Sanitation', 'Equipment cleaning and sanitation', '#6b7280', false, 4),
('BREAK_TIME', 'Break Time', 'Scheduled break periods', '#6b7280', false, 4),
('STARTUP', 'Startup Time', 'Equipment startup and warm-up', '#3b82f6', false, 4),
('TRAINING', 'Training', 'Operator training activity', '#8b5cf6', false, 4),
('WAITING_INST', 'Waiting for Instructions', 'Waiting for work orders or instructions', '#f59e0b', false, 3),
('TOOL_CHANGE', 'Tool Change', 'Tool or die changeover', '#10b981', false, 3),
('ADJUSTMENT', 'Machine Adjustment', 'Equipment setup and adjustment', '#3b82f6', false, 3),
('TESTING', 'Testing/Trials', 'Product testing or trial runs', '#8b5cf6', false, 3);

-- 2. ENHANCED PRODUCTION STOPS WITH DETAILED TRACKING
DROP TABLE IF EXISTS production_stops_enhanced;
CREATE TABLE production_stops_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    machine_id INTEGER REFERENCES machines(id),
    downtime_category_id INTEGER NOT NULL REFERENCES downtime_categories(id),
    
    -- Timing Information
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    estimated_duration INTEGER, -- Estimated time to resolve
    
    -- Cause and Resolution
    primary_cause TEXT NOT NULL,
    secondary_cause TEXT,
    root_cause TEXT,
    immediate_action TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    
    -- People Involved
    reported_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    resolved_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    
    -- Status and Impact
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'investigating', 'resolving', 'resolved', 'approved')),
    severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    production_impact TEXT CHECK(production_impact IN ('none', 'minor', 'moderate', 'major', 'severe')),
    cost_impact DECIMAL(10,2) DEFAULT 0,
    units_lost INTEGER DEFAULT 0,
    
    -- Documentation
    notes TEXT,
    photos TEXT, -- JSON array of photo URLs
    documents TEXT, -- JSON array of document URLs
    
    -- Workflow Integration
    workflow_stage TEXT, -- Which stage of production this occurred
    quality_impact BOOLEAN DEFAULT FALSE,
    safety_incident BOOLEAN DEFAULT FALSE,
    environmental_impact BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DOWNTIME RESOLUTION TRACKING
CREATE TABLE IF NOT EXISTS downtime_resolution_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    downtime_id INTEGER NOT NULL REFERENCES production_stops_enhanced(id),
    step_number INTEGER NOT NULL,
    action_description TEXT NOT NULL,
    expected_duration INTEGER, -- Minutes
    actual_duration INTEGER, -- Minutes
    performed_by INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completion_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. DOWNTIME APPROVAL WORKFLOW
CREATE TABLE IF NOT EXISTS downtime_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    downtime_id INTEGER NOT NULL REFERENCES production_stops_enhanced(id),
    approver_id INTEGER NOT NULL REFERENCES users(id),
    approval_level INTEGER NOT NULL, -- 1=Supervisor, 2=Manager, 3=Plant Manager
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'escalated')),
    comments TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. REAL-TIME DOWNTIME ALERTS
CREATE TABLE IF NOT EXISTS downtime_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    downtime_id INTEGER NOT NULL REFERENCES production_stops_enhanced(id),
    alert_type TEXT NOT NULL CHECK(alert_type IN ('new_downtime', 'duration_exceeded', 'critical_failure', 'approval_required')),
    severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    recipient_role TEXT, -- Target role for notification
    sent_to TEXT, -- JSON array of user IDs who received alert
    acknowledged_by TEXT, -- JSON array of user IDs who acknowledged
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP
);

-- 6. PREVENTIVE MAINTENANCE INTEGRATION
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    maintenance_type TEXT NOT NULL CHECK(maintenance_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'hours_based', 'cycles_based')),
    task_description TEXT NOT NULL,
    frequency_value INTEGER NOT NULL, -- e.g., 7 for weekly
    frequency_unit TEXT NOT NULL CHECK(frequency_unit IN ('days', 'weeks', 'months', 'hours', 'cycles')),
    estimated_duration INTEGER NOT NULL, -- Minutes
    last_performed TIMESTAMP,
    next_due TIMESTAMP NOT NULL,
    assigned_technician INTEGER REFERENCES users(id),
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'due', 'overdue', 'in_progress', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. DOWNTIME COST TRACKING
CREATE TABLE IF NOT EXISTS downtime_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    downtime_id INTEGER NOT NULL REFERENCES production_stops_enhanced(id),
    cost_type TEXT NOT NULL CHECK(cost_type IN ('labor', 'materials', 'utilities', 'lost_production', 'overtime', 'contractor', 'parts')),
    cost_amount DECIMAL(10,2) NOT NULL,
    cost_description TEXT,
    cost_date DATE DEFAULT CURRENT_DATE,
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. MACHINE PERFORMANCE TRACKING
CREATE TABLE IF NOT EXISTS machine_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Availability Metrics
    scheduled_time INTEGER NOT NULL, -- Minutes
    downtime_minutes INTEGER DEFAULT 0,
    availability_percentage DECIMAL(5,2),
    
    -- Performance Metrics  
    ideal_cycle_time DECIMAL(8,3), -- Seconds per unit
    actual_cycle_time DECIMAL(8,3),
    performance_percentage DECIMAL(5,2),
    
    -- Quality Metrics
    total_units_produced INTEGER DEFAULT 0,
    good_units_produced INTEGER DEFAULT 0,
    defective_units INTEGER DEFAULT 0,
    quality_percentage DECIMAL(5,2),
    
    -- Overall Equipment Effectiveness (OEE)
    oee_percentage DECIMAL(5,2),
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(machine_id, metric_date)
);

-- 9. SHIFT HANDOVER DOWNTIME TRACKING
CREATE TABLE IF NOT EXISTS shift_downtime_handovers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK(shift_type IN ('day', 'evening', 'night')),
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    outgoing_operator INTEGER REFERENCES users(id),
    incoming_operator INTEGER REFERENCES users(id),
    
    -- Downtime Status
    active_downtime_id INTEGER REFERENCES production_stops_enhanced(id),
    downtime_summary TEXT,
    estimated_resolution_time TIMESTAMP,
    handover_notes TEXT,
    
    -- Production Status
    current_order_id INTEGER REFERENCES production_orders(id),
    production_status TEXT,
    next_scheduled_maintenance TIMESTAMP,
    
    handover_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP
);

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_production_stops_enhanced_order ON production_stops_enhanced(order_id);
CREATE INDEX IF NOT EXISTS idx_production_stops_enhanced_machine ON production_stops_enhanced(machine_id);
CREATE INDEX IF NOT EXISTS idx_production_stops_enhanced_category ON production_stops_enhanced(downtime_category_id);
CREATE INDEX IF NOT EXISTS idx_production_stops_enhanced_start_time ON production_stops_enhanced(start_time);
CREATE INDEX IF NOT EXISTS idx_production_stops_enhanced_status ON production_stops_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_type ON downtime_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_status ON downtime_alerts(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_machine ON maintenance_schedules(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due ON maintenance_schedules(next_due);
CREATE INDEX IF NOT EXISTS idx_machine_performance_date ON machine_performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_machine_performance_machine ON machine_performance_metrics(machine_id);

-- 11. SAMPLE DATA FOR TESTING
-- Insert some sample maintenance schedules
INSERT OR IGNORE INTO maintenance_schedules (machine_id, maintenance_type, task_description, frequency_value, frequency_unit, estimated_duration, next_due) VALUES
(1, 'daily', 'Daily cleaning and inspection', 1, 'days', 30, datetime('now', '+1 day')),
(1, 'weekly', 'Lubrication and belt tension check', 7, 'days', 60, datetime('now', '+3 days')),
(2, 'monthly', 'Comprehensive equipment inspection', 1, 'months', 120, datetime('now', '+15 days')),
(3, 'quarterly', 'Major component replacement', 3, 'months', 240, datetime('now', '+30 days'));

COMMIT;