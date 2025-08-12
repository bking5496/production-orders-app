-- Daily Operations Database Schema
-- Attendance Register and Maturation Room Tables

-- ================================================================
-- ATTENDANCE REGISTER TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS attendance_register (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    employee_id INTEGER NOT NULL REFERENCES users(id),
    shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('day', 'night')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'sick', 'leave')) DEFAULT 'present',
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    hours_worked DECIMAL(4,2),
    notes TEXT,
    marked_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, machine_id, employee_id, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_attendance_register_date_machine ON attendance_register(date, machine_id);
CREATE INDEX IF NOT EXISTS idx_attendance_register_employee_date ON attendance_register(employee_id, date);

-- ================================================================
-- MATURATION ROOM TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS maturation_room (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id),
    blend_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity_produced DECIMAL(10,2) NOT NULL,
    quantity_expected DECIMAL(10,2) NOT NULL,
    variance DECIMAL(10,2) GENERATED ALWAYS AS (quantity_produced - quantity_expected) STORED,
    variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN quantity_expected > 0 THEN ((quantity_produced - quantity_expected) / quantity_expected * 100)
            ELSE 0
        END
    ) STORED,
    unit_of_measurement VARCHAR(50) NOT NULL DEFAULT 'kg',
    maturation_date DATE NOT NULL,
    expected_maturation_days INTEGER DEFAULT 30,
    estimated_completion_date DATE GENERATED ALWAYS AS (maturation_date + INTERVAL '1 day' * expected_maturation_days) STORED,
    status VARCHAR(50) NOT NULL CHECK (status IN ('maturing', 'ready', 'completed', 'quality_check', 'rejected')) DEFAULT 'maturing',
    quality_checked BOOLEAN DEFAULT FALSE,
    quality_check_date DATE,
    quality_notes TEXT,
    storage_location VARCHAR(100),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    confirmed_by INTEGER NOT NULL REFERENCES users(id),
    quality_checked_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_number)
);

CREATE INDEX IF NOT EXISTS idx_maturation_room_date_status ON maturation_room(maturation_date, status);
CREATE INDEX IF NOT EXISTS idx_maturation_room_order_id ON maturation_room(production_order_id);
CREATE INDEX IF NOT EXISTS idx_maturation_room_batch_number ON maturation_room(batch_number);

-- ================================================================
-- MATURATION DAILY CHECKS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS maturation_daily_checks (
    id SERIAL PRIMARY KEY,
    maturation_room_id INTEGER NOT NULL REFERENCES maturation_room(id),
    check_date DATE NOT NULL,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    visual_condition VARCHAR(100),
    notes TEXT,
    checked_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(maturation_room_id, check_date)
);

CREATE INDEX IF NOT EXISTS idx_maturation_daily_checks_date ON maturation_daily_checks(check_date);

-- ================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_register_updated_at 
    BEFORE UPDATE ON attendance_register 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maturation_room_updated_at 
    BEFORE UPDATE ON maturation_room 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();