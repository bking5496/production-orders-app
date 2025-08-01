-- PostgreSQL Schema Migration for Production Orders App
-- Migrates from SQLite to PostgreSQL with enhanced timezone support

-- Set timezone for session
SET timezone = 'Africa/Johannesburg';

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Users table with timezone support
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'operator' CHECK (role IN ('admin', 'supervisor', 'operator', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
    
    -- Performance indexes
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Machines table
CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    type VARCHAR(50),
    environment VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
    capacity INTEGER DEFAULT 100,
    production_rate DECIMAL(10,2),
    location VARCHAR(100),
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Environments table
CREATE TABLE environments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff',
    machine_types TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production orders with enhanced timezone handling
CREATE TABLE production_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_code VARCHAR(50),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    actual_quantity INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'stopped', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Timezone-aware timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    start_time TIMESTAMPTZ,
    stop_time TIMESTAMPTZ,
    complete_time TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    -- Foreign keys
    machine_id INTEGER REFERENCES machines(id),
    operator_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    
    -- Production metrics
    efficiency_percentage DECIMAL(5,2),
    setup_time INTEGER DEFAULT 0, -- minutes
    production_time INTEGER DEFAULT 0, -- minutes
    downtime_minutes INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2),
    
    -- Additional data
    notes TEXT,
    specifications JSONB DEFAULT '{}',
    stop_reason TEXT,
    archived BOOLEAN DEFAULT false,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production stops with enhanced tracking
CREATE TABLE production_stops (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Equipment' CHECK (category IN ('Equipment', 'Material', 'Quality', 'Planned', 'Changeover', 'Break', 'Other')),
    subcategory VARCHAR(50),
    notes TEXT,
    
    -- Timezone-aware timestamps
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration INTEGER, -- minutes
    
    -- Personnel tracking
    operator_id INTEGER REFERENCES users(id),
    resolved_by INTEGER REFERENCES users(id),
    supervisor_notified BOOLEAN DEFAULT false,
    
    -- Cost impact
    cost_impact DECIMAL(10,2),
    production_loss INTEGER DEFAULT 0, -- units lost
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Quality checks table
CREATE TABLE quality_checks (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL,
    result VARCHAR(20) DEFAULT 'pending' CHECK (result IN ('pass', 'fail', 'pending', 'rework')),
    inspector_id INTEGER REFERENCES users(id),
    
    -- Measurements
    measured_values JSONB DEFAULT '{}',
    specification_limits JSONB DEFAULT '{}',
    defect_types TEXT[],
    
    -- Timestamps
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Labor assignments
CREATE TABLE labor_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id),
    machine_id INTEGER REFERENCES machines(id),
    assignment_date DATE NOT NULL,
    shift_type VARCHAR(20) DEFAULT 'day' CHECK (shift_type IN ('day', 'night', 'swing')),
    start_time TIME,
    end_time TIME,
    role VARCHAR(50) DEFAULT 'operator',
    hourly_rate DECIMAL(8,2),
    overtime_eligible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    
    UNIQUE(employee_id, machine_id, assignment_date, shift_type)
);

-- Shift supervisors
CREATE TABLE shift_supervisors (
    id SERIAL PRIMARY KEY,
    supervisor_id INTEGER NOT NULL REFERENCES users(id),
    shift_date DATE NOT NULL,
    shift_type VARCHAR(20) DEFAULT 'day' CHECK (shift_type IN ('day', 'night', 'swing')),
    environment VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    
    UNIQUE(supervisor_id, shift_date, shift_type)
);

-- Production waste tracking
CREATE TABLE production_waste (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    waste_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    cost_per_unit DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reason TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by INTEGER REFERENCES users(id)
);

-- Performance indexes for production queries
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_date_range ON production_orders(created_at, due_date);
CREATE INDEX idx_production_orders_machine ON production_orders(machine_id);
CREATE INDEX idx_production_orders_environment ON production_orders(environment);
CREATE INDEX idx_production_stops_order ON production_stops(order_id);
CREATE INDEX idx_production_stops_category ON production_stops(category);
CREATE INDEX idx_quality_checks_order ON quality_checks(order_id);
CREATE INDEX idx_labor_assignments_date ON labor_assignments(assignment_date);
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON environments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON production_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();