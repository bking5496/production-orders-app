-- Add missing columns for enhanced workflow functionality
-- These columns are needed by the enhanced workflow endpoints

-- Add workflow tracking columns
ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'created';

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS material_check_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS material_checked_by INTEGER REFERENCES users(id);

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS material_check_time TIMESTAMP;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS setup_start_time TIMESTAMP;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS setup_complete_time TIMESTAMP;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS setup_duration_minutes INTEGER DEFAULT 0;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS completed_time TIMESTAMP;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS quality_approved BOOLEAN DEFAULT FALSE;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS quality_approved_by INTEGER REFERENCES users(id);

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS quality_check_time TIMESTAMP;

-- Create missing tables for enhanced workflow

-- Material Requirements Table
CREATE TABLE IF NOT EXISTS material_requirements (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    material_code VARCHAR(50) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    required_quantity DECIMAL(10,3) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    allocated_quantity DECIMAL(10,3),
    lot_number VARCHAR(100),
    supplier VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'allocated', 'consumed', 'returned')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Machine Setups Table
CREATE TABLE IF NOT EXISTS machine_setups (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    setup_type VARCHAR(20) NOT NULL CHECK(setup_type IN ('initial_setup', 'changeover', 'maintenance_setup')),
    previous_product VARCHAR(200),
    operator_id INTEGER REFERENCES users(id),
    setup_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    setup_complete_time TIMESTAMP,
    setup_duration_minutes INTEGER,
    setup_checklist TEXT, -- JSON string
    notes TEXT,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production Batches Table
CREATE TABLE IF NOT EXISTS production_batches (
    id SERIAL PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    product_code VARCHAR(50),
    product_name VARCHAR(200),
    batch_size INTEGER NOT NULL,
    production_date DATE DEFAULT CURRENT_DATE,
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quality Checkpoints Table
CREATE TABLE IF NOT EXISTS quality_checkpoints (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    checkpoint_name VARCHAR(200) NOT NULL,
    checkpoint_stage VARCHAR(20) NOT NULL CHECK(checkpoint_stage IN ('pre_production', 'in_process', 'final_inspection')),
    completed BOOLEAN DEFAULT FALSE,
    passed BOOLEAN DEFAULT FALSE,
    measured_value DECIMAL(10,3),
    target_value DECIMAL(10,3),
    tolerance_min DECIMAL(10,3),
    tolerance_max DECIMAL(10,3),
    unit_of_measure VARCHAR(20),
    inspector_id INTEGER REFERENCES users(id),
    inspection_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production Conditions Table (for environmental tracking)
CREATE TABLE IF NOT EXISTS production_conditions (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    pressure DECIMAL(7,2),
    operator_id INTEGER REFERENCES users(id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_requirements_order ON material_requirements(order_id);
CREATE INDEX IF NOT EXISTS idx_machine_setups_order ON machine_setups(order_id);
CREATE INDEX IF NOT EXISTS idx_machine_setups_machine ON machine_setups(machine_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_order ON production_batches(order_id);
CREATE INDEX IF NOT EXISTS idx_quality_checkpoints_order ON quality_checkpoints(order_id);
CREATE INDEX IF NOT EXISTS idx_production_conditions_order ON production_conditions(order_id);

-- Add constraint for workflow_stage
ALTER TABLE production_orders 
ADD CONSTRAINT check_workflow_stage 
CHECK(workflow_stage IN ('created', 'materials_prepared', 'setup_ready', 'in_progress', 'quality_hold', 'completed'));

COMMIT;