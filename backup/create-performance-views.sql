-- Performance Views for Production Analytics
-- This script creates comprehensive views for performance monitoring and reporting

BEGIN TRANSACTION;

-- =================================================================================
-- 1. LABOR PERFORMANCE VIEW
-- =================================================================================

CREATE VIEW IF NOT EXISTS v_labor_performance AS
SELECT 
    la.id,
    la.assignment_date,
    la.shift,
    u.employee_code,
    u.fullName as employee_name,
    u.role,
    m.name as machine_name,
    m.type as machine_type,
    m.environment,
    la.status,
    
    -- Performance metrics
    CASE 
        WHEN la.status = 'present' THEN 1 
        ELSE 0 
    END as attendance_score,
    
    -- Calculate efficiency based on machine capacity
    ROUND(
        CASE 
            WHEN m.production_rate > 0 AND la.status = 'present' THEN 
                (m.production_rate * 0.85) -- Assume 85% efficiency for present workers
            ELSE 0 
        END, 2
    ) as efficiency_rate,
    
    -- Utilization score
    CASE 
        WHEN la.status = 'present' THEN 100
        WHEN la.status = 'absent' THEN 0
        ELSE 50  -- planned
    END as utilization_score,
    
    la.created_at,
    la.updated_at
    
FROM labor_assignments la
JOIN users u ON la.employee_id = u.id
JOIN machines m ON la.machine_id = m.id;

-- =================================================================================
-- 2. MACHINE PERFORMANCE VIEW
-- =================================================================================

CREATE VIEW IF NOT EXISTS v_machine_performance AS
SELECT 
    m.id as machine_id,
    m.name as machine_name,
    m.type as machine_type,
    m.environment,
    m.status as machine_status,
    m.capacity,
    m.production_rate,
    
    -- Daily assignments count
    COUNT(la.id) as daily_assignments,
    
    -- Present workers count
    SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) as present_workers,
    
    -- Utilization metrics
    ROUND(
        (SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(la.id), 0), 2
    ) as worker_utilization_pct,
    
    -- Production capacity utilization
    ROUND(
        (SUM(CASE WHEN la.status = 'present' THEN m.production_rate ELSE 0 END) * 100.0) / 
        NULLIF(m.capacity * COUNT(la.id), 0), 2
    ) as capacity_utilization_pct,
    
    -- Performance score (combination of metrics)
    ROUND(
        ((SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
         NULLIF(COUNT(la.id), 0) * 0.6) +
        ((CASE WHEN m.status = 'available' THEN 100 ELSE 0 END) * 0.4), 2
    ) as overall_performance_score,
    
    la.assignment_date,
    la.shift
    
FROM machines m
LEFT JOIN labor_assignments la ON m.id = la.machine_id 
    AND la.assignment_date >= date('now', '-7 days')
GROUP BY m.id, m.name, m.type, m.environment, m.status, m.capacity, m.production_rate, 
         la.assignment_date, la.shift;

-- =================================================================================
-- 3. SHIFT PERFORMANCE VIEW
-- =================================================================================

CREATE VIEW IF NOT EXISTS v_shift_performance AS
SELECT 
    ss.assignment_date,
    ss.shift,
    u.fullName as supervisor_name,
    u.employee_code as supervisor_code,
    
    -- Shift metrics
    COUNT(DISTINCT la.employee_id) as total_workers_assigned,
    SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) as workers_present,
    SUM(CASE WHEN la.status = 'absent' THEN 1 ELSE 0 END) as workers_absent,
    
    -- Attendance rate
    ROUND(
        (SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(la.id), 0), 2
    ) as attendance_rate_pct,
    
    -- Machine coverage
    COUNT(DISTINCT la.machine_id) as machines_covered,
    COUNT(DISTINCT CASE WHEN la.status = 'present' THEN la.machine_id END) as machines_operated,
    
    -- Machine utilization
    ROUND(
        (COUNT(DISTINCT CASE WHEN la.status = 'present' THEN la.machine_id END) * 100.0) / 
        NULLIF(COUNT(DISTINCT la.machine_id), 0), 2
    ) as machine_utilization_pct,
    
    -- Overall shift performance
    ROUND(
        ((SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
         NULLIF(COUNT(la.id), 0) * 0.7) +
        ((COUNT(DISTINCT CASE WHEN la.status = 'present' THEN la.machine_id END) * 100.0) / 
         NULLIF(COUNT(DISTINCT la.machine_id), 0) * 0.3), 2
    ) as shift_performance_score
    
FROM shift_supervisors ss
LEFT JOIN users u ON ss.supervisor_id = u.id
LEFT JOIN labor_assignments la ON ss.assignment_date = la.assignment_date 
    AND ss.shift = la.shift
GROUP BY ss.assignment_date, ss.shift, u.fullName, u.employee_code;

-- =================================================================================
-- 4. DAILY PRODUCTION OVERVIEW
-- =================================================================================

CREATE VIEW IF NOT EXISTS v_daily_production_overview AS
SELECT 
    la.assignment_date,
    la.shift,
    
    -- Environment breakdown
    SUM(CASE WHEN m.environment = 'production' AND la.status = 'present' THEN 1 ELSE 0 END) as production_workers,
    SUM(CASE WHEN m.environment = 'blending' AND la.status = 'present' THEN 1 ELSE 0 END) as blending_workers,
    SUM(CASE WHEN m.environment = 'packaging' AND la.status = 'present' THEN 1 ELSE 0 END) as packaging_workers,
    
    -- Total metrics
    COUNT(la.id) as total_assignments,
    SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) as total_present,
    SUM(CASE WHEN la.status = 'absent' THEN 1 ELSE 0 END) as total_absent,
    
    -- Capacity metrics
    SUM(CASE WHEN la.status = 'present' THEN m.production_rate ELSE 0 END) as active_production_capacity,
    SUM(m.capacity) as total_available_capacity,
    
    -- Performance indicators
    ROUND(
        (SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(la.id), 0), 2
    ) as overall_attendance_pct,
    
    ROUND(
        (SUM(CASE WHEN la.status = 'present' THEN m.production_rate ELSE 0 END) * 100.0) / 
        NULLIF(SUM(m.production_rate), 0), 2
    ) as capacity_utilization_pct,
    
    -- Risk indicators
    CASE 
        WHEN (SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
             NULLIF(COUNT(la.id), 0) < 80 THEN 'high_risk'
        WHEN (SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
             NULLIF(COUNT(la.id), 0) < 90 THEN 'medium_risk'
        ELSE 'low_risk'
    END as attendance_risk_level
    
FROM labor_assignments la
JOIN machines m ON la.machine_id = m.id
GROUP BY la.assignment_date, la.shift
ORDER BY la.assignment_date DESC, la.shift;

-- =================================================================================
-- 5. WORKER PRODUCTIVITY RANKING
-- =================================================================================

CREATE VIEW IF NOT EXISTS v_worker_productivity_ranking AS
SELECT 
    u.id as user_id,
    u.employee_code,
    u.fullName as employee_name,
    u.role,
    
    -- Attendance metrics (last 30 days)
    COUNT(la.id) as total_assignments_30d,
    SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) as days_present_30d,
    
    -- Attendance rate
    ROUND(
        (SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(la.id), 0), 2
    ) as attendance_rate_pct,
    
    -- Machine diversity (how many different machines worked on)
    COUNT(DISTINCT la.machine_id) as machines_worked,
    
    -- Environment diversity
    COUNT(DISTINCT m.environment) as environments_worked,
    
    -- Average machine production rate worked on
    ROUND(AVG(CASE WHEN la.status = 'present' THEN m.production_rate END), 2) as avg_machine_productivity,
    
    -- Productivity score
    ROUND(
        ((SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
         NULLIF(COUNT(la.id), 0) * 0.4) +
        (COUNT(DISTINCT la.machine_id) * 5 * 0.3) +  -- Versatility bonus
        (AVG(CASE WHEN la.status = 'present' THEN m.production_rate END) * 0.3), 2
    ) as productivity_score,
    
    -- Ranking
    ROW_NUMBER() OVER (ORDER BY 
        ((SUM(CASE WHEN la.status = 'present' THEN 1 ELSE 0 END) * 100.0) / 
         NULLIF(COUNT(la.id), 0) * 0.4) +
        (COUNT(DISTINCT la.machine_id) * 5 * 0.3) +
        (AVG(CASE WHEN la.status = 'present' THEN m.production_rate END) * 0.3) DESC
    ) as productivity_rank
    
FROM users u
LEFT JOIN labor_assignments la ON u.id = la.employee_id 
    AND la.assignment_date >= date('now', '-30 days')
LEFT JOIN machines m ON la.machine_id = m.id
WHERE u.role IN ('operator', 'supervisor', 'packer')
GROUP BY u.id, u.employee_code, u.fullName, u.role
HAVING COUNT(la.id) > 0
ORDER BY productivity_score DESC;

-- =================================================================================
-- CREATE INDEXES FOR VIEW PERFORMANCE
-- =================================================================================

-- These indexes will improve view query performance
CREATE INDEX IF NOT EXISTS idx_labor_assignments_date_status 
ON labor_assignments(assignment_date, status);

CREATE INDEX IF NOT EXISTS idx_labor_assignments_machine_status 
ON labor_assignments(machine_id, status);

CREATE INDEX IF NOT EXISTS idx_machines_environment_status 
ON machines(environment, status);

SELECT 'Performance views created successfully!' as status;
SELECT 'Added 5 comprehensive views: labor, machine, shift, daily overview, and worker ranking!' as impact;

COMMIT;