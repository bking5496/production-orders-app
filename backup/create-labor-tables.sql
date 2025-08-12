-- Labor Management Database Tables for PostgreSQL
-- Creates tables required by labor-planner.jsx and labour-layout.jsx

-- Labor Assignments Table
-- Tracks employee assignments to machines and shifts
CREATE TABLE IF NOT EXISTS labor_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    assignment_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK(shift IN ('morning', 'afternoon', 'night')),
    start_time TIME,
    end_time TIME,
    is_verified BOOLEAN DEFAULT false,
    notes TEXT,
    assigned_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shift Supervisors Table  
-- Tracks supervisor assignments by date and shift
CREATE TABLE IF NOT EXISTS shift_supervisors (
    id SERIAL PRIMARY KEY,
    supervisor_id INTEGER NOT NULL REFERENCES users(id),
    assignment_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK(shift IN ('morning', 'afternoon', 'night')),
    is_active BOOLEAN DEFAULT true,
    assigned_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_date, shift, supervisor_id)
);

-- Labor Roster Table
-- Daily roster tracking and attendance
CREATE TABLE IF NOT EXISTS labor_roster (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    roster_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK(shift IN ('morning', 'afternoon', 'night')),
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'present', 'absent', 'late')),
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    verified_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_labor_assignments_date ON labor_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_labor_assignments_user ON labor_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_labor_assignments_machine ON labor_assignments(machine_id);
CREATE INDEX IF NOT EXISTS idx_shift_supervisors_date ON shift_supervisors(assignment_date);
CREATE INDEX IF NOT EXISTS idx_labor_roster_date ON labor_roster(roster_date);
CREATE INDEX IF NOT EXISTS idx_labor_roster_user ON labor_roster(user_id);

-- Add triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_labor_assignments_updated_at BEFORE UPDATE ON labor_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_supervisors_updated_at BEFORE UPDATE ON shift_supervisors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_labor_roster_updated_at BEFORE UPDATE ON labor_roster FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();