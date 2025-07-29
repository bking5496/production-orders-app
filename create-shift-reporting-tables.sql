-- Shift Reporting Tables for Real-time Production Tracking
-- Created: 2025-01-29

-- Table to track production quantity updates during shifts
CREATE TABLE IF NOT EXISTS quantity_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    previous_quantity INTEGER DEFAULT 0,
    new_quantity INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    updated_by INTEGER NOT NULL,
    update_time DATETIME DEFAULT (datetime('now', '+2 hours')), -- SAST time
    shift_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK(shift_type IN ('day', 'night')),
    notes TEXT,
    FOREIGN KEY(order_id) REFERENCES production_orders(id),
    FOREIGN KEY(updated_by) REFERENCES users(id)
);

-- Table to store shift reports
CREATE TABLE IF NOT EXISTS shift_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK(shift_type IN ('day', 'night')),
    environment TEXT NOT NULL,
    supervisor_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    in_progress_orders INTEGER DEFAULT 0,
    stopped_orders INTEGER DEFAULT 0,
    total_quantity_produced INTEGER DEFAULT 0,
    total_stops INTEGER DEFAULT 0,
    total_downtime_minutes INTEGER DEFAULT 0,
    total_machines_active INTEGER DEFAULT 0,
    total_machines_available INTEGER DEFAULT 0,
    oee_percentage REAL DEFAULT 0,
    efficiency_percentage REAL DEFAULT 0,
    quality_percentage REAL DEFAULT 100,
    summary_notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', '+2 hours')),
    created_by INTEGER,
    FOREIGN KEY(supervisor_id) REFERENCES users(id),
    FOREIGN KEY(created_by) REFERENCES users(id),
    UNIQUE(shift_date, shift_type, environment)
);

-- Table to track shift handovers and issues
CREATE TABLE IF NOT EXISTS shift_handovers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_shift_id INTEGER NOT NULL,
    to_shift_id INTEGER,
    handover_time DATETIME DEFAULT (datetime('now', '+2 hours')),
    from_supervisor INTEGER NOT NULL,
    to_supervisor INTEGER,
    priority_issues TEXT, -- JSON array of critical issues
    ongoing_problems TEXT, -- JSON array of ongoing issues
    maintenance_requests TEXT, -- JSON array of maintenance needs
    material_requirements TEXT, -- JSON array of material needs
    special_instructions TEXT,
    handover_completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME,
    FOREIGN KEY(from_shift_id) REFERENCES shift_reports(id),
    FOREIGN KEY(to_shift_id) REFERENCES shift_reports(id),
    FOREIGN KEY(from_supervisor) REFERENCES users(id),
    FOREIGN KEY(to_supervisor) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quantity_updates_order_date ON quantity_updates(order_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_quantity_updates_shift ON quantity_updates(shift_date, shift_type);
CREATE INDEX IF NOT EXISTS idx_shift_reports_date_env ON shift_reports(shift_date, shift_type, environment);
CREATE INDEX IF NOT EXISTS idx_handovers_time ON shift_handovers(handover_time);

-- Insert default shift templates for common environments
-- Insert default shift reports for today (will be skipped if they already exist)
INSERT OR IGNORE INTO shift_reports (shift_date, shift_type, environment, start_time, end_time, created_at, created_by)
VALUES 
    (date('now'), 'day', 'packaging', datetime('now', 'start of day', '+6 hours'), datetime('now', 'start of day', '+18 hours'), datetime('now', '+2 hours'), 1),
    (date('now'), 'night', 'packaging', datetime('now', 'start of day', '+18 hours'), datetime('now', 'start of day', '+30 hours'), datetime('now', '+2 hours'), 1),
    (date('now'), 'day', 'production', datetime('now', 'start of day', '+6 hours'), datetime('now', 'start of day', '+18 hours'), datetime('now', '+2 hours'), 1),
    (date('now'), 'night', 'production', datetime('now', 'start of day', '+18 hours'), datetime('now', 'start of day', '+30 hours'), datetime('now', '+2 hours'), 1);