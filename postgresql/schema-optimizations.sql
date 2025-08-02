-- PostgreSQL Schema Optimizations for Production Management System
-- Run this script to optimize your database for better performance and reliability

-- Set timezone for the session
SET timezone = 'Africa/Johannesburg';

-- =====================================================
-- 1. PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Add missing indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_orders_status_environment 
ON production_orders(status, environment);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_orders_operator_date 
ON production_orders(operator_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_stops_order_resolved 
ON production_stops(order_id, resolved_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_labor_assignments_date_shift 
ON labor_assignments(assignment_date, shift_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_machines_status_environment 
ON machines(status, environment);

-- Partial indexes for active records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_orders_active 
ON production_orders(id, created_at) 
WHERE status IN ('pending', 'in_progress', 'stopped');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_machines_available 
ON machines(id, name) 
WHERE status = 'available';

-- =====================================================
-- 2. DATA INTEGRITY CONSTRAINTS
-- =====================================================

-- Add check constraints for data validation
ALTER TABLE production_orders 
ADD CONSTRAINT IF NOT EXISTS chk_production_orders_quantities 
CHECK (actual_quantity IS NULL OR actual_quantity >= 0);

ALTER TABLE production_orders 
ADD CONSTRAINT IF NOT EXISTS chk_production_orders_efficiency 
CHECK (efficiency_percentage IS NULL OR (efficiency_percentage >= 0 AND efficiency_percentage <= 200));

ALTER TABLE production_orders 
ADD CONSTRAINT IF NOT EXISTS chk_production_orders_times 
CHECK (complete_time IS NULL OR start_time IS NULL OR complete_time >= start_time);

ALTER TABLE machines 
ADD CONSTRAINT IF NOT EXISTS chk_machines_capacity 
CHECK (capacity > 0 AND capacity <= 1000);

-- =====================================================
-- 3. UPDATED TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS update_production_orders_updated_at ON production_orders;
CREATE TRIGGER update_production_orders_updated_at
    BEFORE UPDATE ON production_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_machines_updated_at ON machines;
CREATE TRIGGER update_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active production overview
CREATE OR REPLACE VIEW active_production_overview AS
SELECT 
    po.id,
    po.order_number,
    po.product_name,
    po.quantity,
    po.status,
    po.priority,
    po.start_time,
    po.environment,
    m.name as machine_name,
    m.type as machine_type,
    u.username as operator_name,
    EXTRACT(EPOCH FROM (NOW() - po.start_time)) / 3600 as hours_running
FROM production_orders po
LEFT JOIN machines m ON po.machine_id = m.id
LEFT JOIN users u ON po.operator_id = u.id
WHERE po.status IN ('in_progress', 'stopped')
ORDER BY po.priority DESC, po.start_time ASC;

-- View for machine utilization
CREATE OR REPLACE VIEW machine_utilization AS
SELECT 
    m.id,
    m.name,
    m.type,
    m.environment,
    m.status,
    COUNT(po.id) as total_orders,
    COUNT(CASE WHEN po.status = 'completed' THEN 1 END) as completed_orders,
    AVG(po.efficiency_percentage) as avg_efficiency,
    SUM(CASE WHEN po.status = 'in_progress' THEN 1 ELSE 0 END) as currently_running
FROM machines m
LEFT JOIN production_orders po ON m.id = po.machine_id
GROUP BY m.id, m.name, m.type, m.environment, m.status;

-- View for production statistics
CREATE OR REPLACE VIEW production_statistics AS
SELECT 
    DATE(created_at) as production_date,
    environment,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_orders,
    COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped_orders,
    SUM(quantity) as total_quantity_planned,
    SUM(actual_quantity) as total_quantity_produced,
    AVG(efficiency_percentage) as avg_efficiency
FROM production_orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), environment
ORDER BY production_date DESC, environment;

-- =====================================================
-- 5. MATERIALIZED VIEWS FOR HEAVY ANALYTICS
-- =====================================================

-- Materialized view for downtime analysis (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS downtime_analysis AS
SELECT 
    DATE(ps.created_at) as downtime_date,
    po.environment,
    ps.reason,
    COUNT(*) as incident_count,
    SUM(ps.duration) as total_duration_minutes,
    AVG(ps.duration) as avg_duration_minutes,
    m.name as machine_name,
    m.type as machine_type
FROM production_stops ps
JOIN production_orders po ON ps.order_id = po.id
LEFT JOIN machines m ON po.machine_id = m.id
WHERE ps.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(ps.created_at), po.environment, ps.reason, m.name, m.type
ORDER BY downtime_date DESC, total_duration_minutes DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_downtime_analysis_date_env 
ON downtime_analysis(downtime_date, environment);

-- =====================================================
-- 6. FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to calculate production efficiency
CREATE OR REPLACE FUNCTION calculate_production_efficiency(
    p_order_id INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    v_planned_quantity INTEGER;
    v_actual_quantity INTEGER;
    v_efficiency NUMERIC;
BEGIN
    SELECT quantity, actual_quantity 
    INTO v_planned_quantity, v_actual_quantity
    FROM production_orders 
    WHERE id = p_order_id;
    
    IF v_actual_quantity IS NULL OR v_planned_quantity IS NULL OR v_planned_quantity = 0 THEN
        RETURN NULL;
    END IF;
    
    v_efficiency := (v_actual_quantity::NUMERIC / v_planned_quantity::NUMERIC) * 100;
    
    -- Update the record
    UPDATE production_orders 
    SET efficiency_percentage = v_efficiency 
    WHERE id = p_order_id;
    
    RETURN v_efficiency;
END;
$$ LANGUAGE plpgsql;

-- Function to get machine availability
CREATE OR REPLACE FUNCTION get_available_machines(
    p_environment TEXT DEFAULT NULL
) RETURNS TABLE(
    machine_id INTEGER,
    machine_name TEXT,
    machine_type TEXT,
    capacity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT m.id, m.name, m.type, m.capacity
    FROM machines m
    WHERE m.status = 'available'
    AND (p_environment IS NULL OR m.environment = p_environment)
    ORDER BY m.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. SECURITY ENHANCEMENTS
-- =====================================================

-- Enable Row Level Security on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

-- Policy for users - users can only see their own data unless admin/supervisor
CREATE POLICY users_policy ON users
    FOR ALL
    TO production_app_user
    USING (
        current_user = 'postgres' OR
        id = current_setting('app.current_user_id')::INTEGER OR
        current_setting('app.current_user_role') IN ('admin', 'supervisor')
    );

-- =====================================================
-- 8. MAINTENANCE PROCEDURES
-- =====================================================

-- Function to archive old completed orders
CREATE OR REPLACE FUNCTION archive_old_orders(
    p_days_old INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    UPDATE production_orders 
    SET archived = true
    WHERE status = 'completed'
    AND complete_time < NOW() - INTERVAL '1 day' * p_days_old
    AND archived = false;
    
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
    
    -- Log the archival
    INSERT INTO system_logs (action, details, created_at)
    VALUES ('archive_orders', 
            format('Archived %s orders older than %s days', v_archived_count, p_days_old),
            NOW());
    
    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW downtime_analysis;
    
    -- Log the refresh
    INSERT INTO system_logs (action, details, created_at)
    VALUES ('refresh_views', 'Refreshed materialized views for analytics', NOW());
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. MONITORING AND LOGGING
-- =====================================================

-- Create system logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for system logs
CREATE INDEX IF NOT EXISTS idx_system_logs_action_date 
ON system_logs(action, created_at);

-- =====================================================
-- 10. PERFORMANCE MONITORING
-- =====================================================

-- View for query performance monitoring
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY total_time DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Schema optimizations completed successfully!';
    RAISE NOTICE 'Database is now optimized for production workloads.';
    RAISE NOTICE 'Remember to run REFRESH MATERIALIZED VIEW downtime_analysis daily.';
END $$;