-- Production Metrics Tracking System
-- This script creates comprehensive production metrics and KPI tracking

BEGIN TRANSACTION;

-- =================================================================================
-- 1. PRODUCTION METRICS TABLE
-- =================================================================================

CREATE TABLE IF NOT EXISTS production_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('day', 'night')),
    environment TEXT NOT NULL CHECK (environment IN ('production', 'blending', 'packaging')),
    
    -- Production volume metrics
    units_produced INTEGER DEFAULT 0,
    units_planned INTEGER DEFAULT 0,
    production_efficiency REAL GENERATED ALWAYS AS (
        CASE 
            WHEN units_planned > 0 THEN ROUND((units_produced * 100.0) / units_planned, 2)
            ELSE 0 
        END
    ) STORED,
    
    -- Quality metrics
    units_passed_qc INTEGER DEFAULT 0,
    units_failed_qc INTEGER DEFAULT 0,
    quality_rate REAL GENERATED ALWAYS AS (
        CASE 
            WHEN (units_passed_qc + units_failed_qc) > 0 THEN 
                ROUND((units_passed_qc * 100.0) / (units_passed_qc + units_failed_qc), 2)
            ELSE 0 
        END
    ) STORED,
    
    -- Time metrics (in minutes)
    planned_production_time INTEGER DEFAULT 0,
    actual_production_time INTEGER DEFAULT 0,
    scheduled_downtime INTEGER DEFAULT 0,
    unscheduled_downtime INTEGER DEFAULT 0,
    
    -- Calculated metrics
    uptime_percentage REAL GENERATED ALWAYS AS (
        CASE 
            WHEN planned_production_time > 0 THEN 
                ROUND(((planned_production_time - unscheduled_downtime) * 100.0) / planned_production_time, 2)
            ELSE 0 
        END
    ) STORED,
    
    oee_score REAL GENERATED ALWAYS AS (
        CASE 
            WHEN planned_production_time > 0 AND units_planned > 0 AND (units_passed_qc + units_failed_qc) > 0 THEN
                ROUND(
                    (((planned_production_time - unscheduled_downtime) * 100.0) / planned_production_time) *
                    ((units_produced * 100.0) / units_planned) *
                    ((units_passed_qc * 100.0) / (units_passed_qc + units_failed_qc)) / 10000, 2
                )
            ELSE 0 
        END
    ) STORED,
    
    -- Labor metrics
    workers_assigned INTEGER DEFAULT 0,
    workers_present INTEGER DEFAULT 0,
    labor_efficiency REAL GENERATED ALWAYS AS (
        CASE 
            WHEN workers_assigned > 0 THEN ROUND((workers_present * 100.0) / workers_assigned, 2)
            ELSE 0 
        END
    ) STORED,
    
    -- Cost metrics
    material_cost REAL DEFAULT 0.0,
    labor_cost REAL DEFAULT 0.0,
    overhead_cost REAL DEFAULT 0.0,
    total_cost REAL GENERATED ALWAYS AS (material_cost + labor_cost + overhead_cost) STORED,
    cost_per_unit REAL GENERATED ALWAYS AS (
        CASE 
            WHEN units_produced > 0 THEN ROUND((material_cost + labor_cost + overhead_cost) / units_produced, 2)
            ELSE 0 
        END
    ) STORED,
    
    -- Additional tracking
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- =================================================================================
-- 2. KPI TARGETS TABLE
-- =================================================================================

CREATE TABLE IF NOT EXISTS kpi_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_name TEXT NOT NULL,
    target_category TEXT NOT NULL CHECK (target_category IN ('production', 'quality', 'efficiency', 'cost')),
    environment TEXT CHECK (environment IN ('production', 'blending', 'packaging', 'all')),
    shift TEXT CHECK (shift IN ('day', 'night', 'both')),
    
    -- Target values
    target_value REAL NOT NULL,
    warning_threshold REAL,  -- Yellow warning level
    critical_threshold REAL, -- Red critical level
    target_unit TEXT NOT NULL, -- %, units, minutes, etc.
    
    -- Timeframe
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- =================================================================================
-- 3. REAL-TIME METRICS VIEW
-- =================================================================================

CREATE VIEW IF NOT EXISTS v_realtime_production_metrics AS
SELECT 
    pm.id,
    pm.metric_date,
    pm.shift,
    pm.environment,
    
    -- Production metrics
    pm.units_produced,
    pm.units_planned,
    pm.production_efficiency,
    
    -- Quality metrics
    pm.units_passed_qc,
    pm.units_failed_qc,
    pm.quality_rate,
    
    -- Time and efficiency
    pm.uptime_percentage,
    pm.oee_score,
    pm.labor_efficiency,
    
    -- Cost metrics
    pm.total_cost,
    pm.cost_per_unit,
    
    -- Performance indicators
    CASE 
        WHEN pm.production_efficiency >= 95 THEN 'excellent'
        WHEN pm.production_efficiency >= 85 THEN 'good'
        WHEN pm.production_efficiency >= 75 THEN 'fair'
        ELSE 'poor'
    END as production_performance,
    
    CASE 
        WHEN pm.quality_rate >= 98 THEN 'excellent'
        WHEN pm.quality_rate >= 95 THEN 'good'
        WHEN pm.quality_rate >= 90 THEN 'fair'
        ELSE 'poor'
    END as quality_performance,
    
    CASE 
        WHEN pm.oee_score >= 85 THEN 'world_class'
        WHEN pm.oee_score >= 70 THEN 'good'
        WHEN pm.oee_score >= 50 THEN 'fair'
        ELSE 'poor'
    END as oee_rating,
    
    pm.created_at,
    pm.updated_at
    
FROM production_metrics pm
WHERE pm.metric_date >= date('now', '-7 days')
ORDER BY pm.metric_date DESC, pm.shift, pm.environment;

-- =================================================================================
-- 4. KPI DASHBOARD VIEW
-- =================================================================================

CREATE VIEW IF NOT EXISTS v_kpi_dashboard AS
SELECT 
    kt.target_name,
    kt.target_category,
    kt.environment,
    kt.shift,
    kt.target_value,
    kt.target_unit,
    kt.warning_threshold,
    kt.critical_threshold,
    
    -- Current actual values (last 7 days average)
    CASE kt.target_name
        WHEN 'Production Efficiency' THEN AVG(pm.production_efficiency)
        WHEN 'Quality Rate' THEN AVG(pm.quality_rate)
        WHEN 'OEE Score' THEN AVG(pm.oee_score)
        WHEN 'Uptime Percentage' THEN AVG(pm.uptime_percentage)
        WHEN 'Labor Efficiency' THEN AVG(pm.labor_efficiency)
        WHEN 'Cost Per Unit' THEN AVG(pm.cost_per_unit)
        ELSE 0
    END as current_value,
    
    -- Performance vs target
    CASE kt.target_name
        WHEN 'Production Efficiency' THEN AVG(pm.production_efficiency) - kt.target_value
        WHEN 'Quality Rate' THEN AVG(pm.quality_rate) - kt.target_value
        WHEN 'OEE Score' THEN AVG(pm.oee_score) - kt.target_value
        WHEN 'Uptime Percentage' THEN AVG(pm.uptime_percentage) - kt.target_value
        WHEN 'Labor Efficiency' THEN AVG(pm.labor_efficiency) - kt.target_value
        WHEN 'Cost Per Unit' THEN kt.target_value - AVG(pm.cost_per_unit) -- Lower is better for cost
        ELSE 0
    END as variance_from_target,
    
    -- Status indicators
    CASE 
        WHEN kt.target_name = 'Cost Per Unit' THEN
            CASE 
                WHEN AVG(pm.cost_per_unit) <= kt.target_value THEN 'on_target'
                WHEN AVG(pm.cost_per_unit) <= kt.warning_threshold THEN 'warning'
                ELSE 'critical'
            END
        ELSE
            CASE 
                WHEN (CASE kt.target_name
                    WHEN 'Production Efficiency' THEN AVG(pm.production_efficiency)
                    WHEN 'Quality Rate' THEN AVG(pm.quality_rate)
                    WHEN 'OEE Score' THEN AVG(pm.oee_score)
                    WHEN 'Uptime Percentage' THEN AVG(pm.uptime_percentage)
                    WHEN 'Labor Efficiency' THEN AVG(pm.labor_efficiency)
                    ELSE 0
                END) >= kt.target_value THEN 'on_target'
                WHEN (CASE kt.target_name
                    WHEN 'Production Efficiency' THEN AVG(pm.production_efficiency)
                    WHEN 'Quality Rate' THEN AVG(pm.quality_rate)
                    WHEN 'OEE Score' THEN AVG(pm.oee_score)
                    WHEN 'Uptime Percentage' THEN AVG(pm.uptime_percentage)
                    WHEN 'Labor Efficiency' THEN AVG(pm.labor_efficiency)
                    ELSE 0
                END) >= kt.warning_threshold THEN 'warning'
                ELSE 'critical'
            END
    END as status,
    
    -- Trend (last 3 days vs previous 3 days)
    'stable' as trend  -- Simplified for now
    
FROM kpi_targets kt
LEFT JOIN production_metrics pm ON 
    (kt.environment = 'all' OR kt.environment = pm.environment) AND
    (kt.shift = 'both' OR kt.shift = pm.shift) AND
    pm.metric_date >= date('now', '-7 days')
WHERE kt.is_active = TRUE
GROUP BY kt.id, kt.target_name, kt.target_category, kt.environment, kt.shift, 
         kt.target_value, kt.target_unit, kt.warning_threshold, kt.critical_threshold;

-- =================================================================================
-- 5. CREATE INDEXES
-- =================================================================================

CREATE INDEX IF NOT EXISTS idx_production_metrics_date_shift_env 
ON production_metrics(metric_date, shift, environment);

CREATE INDEX IF NOT EXISTS idx_production_metrics_efficiency 
ON production_metrics(production_efficiency);

CREATE INDEX IF NOT EXISTS idx_production_metrics_oee 
ON production_metrics(oee_score);

CREATE INDEX IF NOT EXISTS idx_kpi_targets_active 
ON kpi_targets(is_active, target_category);

-- =================================================================================
-- 6. CREATE TRIGGERS
-- =================================================================================

CREATE TRIGGER IF NOT EXISTS trigger_production_metrics_updated_at
    AFTER UPDATE ON production_metrics
    FOR EACH ROW
BEGIN
    UPDATE production_metrics 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- =================================================================================
-- 7. INSERT SAMPLE KPI TARGETS
-- =================================================================================

INSERT OR IGNORE INTO kpi_targets (target_name, target_category, environment, shift, target_value, warning_threshold, critical_threshold, target_unit, effective_from, description, created_by)
VALUES 
('Production Efficiency', 'production', 'all', 'both', 90.0, 85.0, 75.0, '%', '2025-01-01', 'Target production efficiency rate', 1),
('Quality Rate', 'quality', 'all', 'both', 95.0, 90.0, 85.0, '%', '2025-01-01', 'Target quality pass rate', 1),
('OEE Score', 'efficiency', 'all', 'both', 75.0, 65.0, 50.0, '%', '2025-01-01', 'Overall Equipment Effectiveness target', 1),
('Uptime Percentage', 'efficiency', 'all', 'both', 95.0, 90.0, 85.0, '%', '2025-01-01', 'Machine uptime target', 1),
('Labor Efficiency', 'efficiency', 'all', 'both', 95.0, 90.0, 80.0, '%', '2025-01-01', 'Labor attendance and efficiency', 1),
('Cost Per Unit', 'cost', 'production', 'both', 5.0, 6.0, 7.0, 'ZAR', '2025-01-01', 'Target cost per unit produced', 1);

-- =================================================================================
-- 8. INSERT SAMPLE METRICS DATA
-- =================================================================================

INSERT OR IGNORE INTO production_metrics (
    metric_date, shift, environment, units_produced, units_planned, 
    units_passed_qc, units_failed_qc, planned_production_time, actual_production_time, 
    unscheduled_downtime, workers_assigned, workers_present, 
    material_cost, labor_cost, overhead_cost, created_by
)
VALUES 
('2025-07-28', 'day', 'production', 850, 900, 835, 15, 480, 465, 25, 8, 7, 3500.0, 2800.0, 1200.0, 1),
('2025-07-28', 'night', 'production', 780, 900, 765, 15, 480, 470, 15, 6, 6, 3200.0, 2400.0, 1200.0, 1),
('2025-07-28', 'day', 'blending', 1200, 1300, 1180, 20, 480, 475, 10, 4, 4, 2400.0, 1600.0, 800.0, 1),
('2025-07-28', 'night', 'blending', 1150, 1300, 1130, 20, 480, 465, 20, 4, 3, 2300.0, 1200.0, 800.0, 1),
('2025-07-28', 'day', 'packaging', 2500, 2800, 2475, 25, 600, 585, 30, 12, 11, 1500.0, 4400.0, 1800.0, 1),
('2025-07-28', 'night', 'packaging', 2300, 2800, 2280, 20, 600, 590, 20, 10, 9, 1380.0, 3600.0, 1800.0, 1);

SELECT 'Production metrics tracking system created successfully!' as status;
SELECT 'Added comprehensive KPI tracking, OEE calculations, and real-time dashboard views!' as impact;

COMMIT;