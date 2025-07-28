-- Capacity Management Table
-- This script creates a comprehensive capacity management system

BEGIN TRANSACTION;

-- Create capacity_management table to track resource utilization
CREATE TABLE IF NOT EXISTS capacity_management (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('machine', 'labor', 'environment')),
    resource_id INTEGER NOT NULL,
    capacity_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('day', 'night')),
    planned_capacity INTEGER NOT NULL DEFAULT 0,
    actual_capacity INTEGER NOT NULL DEFAULT 0,
    utilization_rate REAL GENERATED ALWAYS AS (
        CASE 
            WHEN planned_capacity > 0 THEN ROUND((actual_capacity * 100.0) / planned_capacity, 2)
            ELSE 0 
        END
    ) STORED,
    efficiency_score REAL DEFAULT 0.0,
    bottleneck_indicator BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Create capacity_constraints table for resource limitations
CREATE TABLE IF NOT EXISTS capacity_constraints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('machine', 'labor', 'environment')),
    resource_id INTEGER NOT NULL,
    constraint_type TEXT NOT NULL CHECK (constraint_type IN ('max_hours', 'max_units', 'max_concurrent')),
    constraint_value INTEGER NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Create capacity_forecasts table for planning
CREATE TABLE IF NOT EXISTS capacity_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('machine', 'labor', 'environment')),
    resource_id INTEGER NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('day', 'night')),
    forecasted_demand INTEGER NOT NULL,
    available_capacity INTEGER NOT NULL,
    capacity_gap INTEGER GENERATED ALWAYS AS (forecasted_demand - available_capacity) STORED,
    risk_level TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN (forecasted_demand - available_capacity) > available_capacity * 0.2 THEN 'high'
            WHEN (forecasted_demand - available_capacity) > available_capacity * 0.1 THEN 'medium'
            WHEN (forecasted_demand - available_capacity) > 0 THEN 'low'
            ELSE 'none'
        END
    ) STORED,
    mitigation_plan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_capacity_management_resource 
ON capacity_management(resource_type, resource_id, capacity_date, shift);

CREATE INDEX IF NOT EXISTS idx_capacity_management_date_shift 
ON capacity_management(capacity_date, shift);

CREATE INDEX IF NOT EXISTS idx_capacity_management_utilization 
ON capacity_management(utilization_rate);

CREATE INDEX IF NOT EXISTS idx_capacity_constraints_resource_active 
ON capacity_constraints(resource_type, resource_id, is_active);

CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_date_resource 
ON capacity_forecasts(forecast_date, resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_risk 
ON capacity_forecasts(risk_level);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS trigger_capacity_management_updated_at
    AFTER UPDATE ON capacity_management
    FOR EACH ROW
BEGIN
    UPDATE capacity_management 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trigger_capacity_forecasts_updated_at
    AFTER UPDATE ON capacity_forecasts
    FOR EACH ROW
BEGIN
    UPDATE capacity_forecasts 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Insert sample data for demonstration
INSERT INTO capacity_management (resource_type, resource_id, capacity_date, shift, planned_capacity, actual_capacity, created_by)
SELECT 
    'machine' as resource_type,
    id as resource_id,
    date('2025-07-28') as capacity_date,
    'day' as shift,
    CASE 
        WHEN type = 'production' THEN 480  -- 8 hours * 60 minutes
        WHEN type = 'packaging' THEN 600   -- 10 hours * 60 minutes
        ELSE 400
    END as planned_capacity,
    CASE 
        WHEN type = 'production' THEN 420  -- 7 hours actual
        WHEN type = 'packaging' THEN 540   -- 9 hours actual
        ELSE 350
    END as actual_capacity,
    1 as created_by  -- admin user
FROM machines 
WHERE status = 'available'
LIMIT 5;

SELECT 'Capacity management tables created successfully!' as status;
SELECT 'Added capacity tracking, constraints, and forecasting capabilities!' as impact;

COMMIT;