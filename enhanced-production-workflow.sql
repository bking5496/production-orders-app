-- Enhanced Production Workflow Database Schema
-- Adds manufacturing-specific workflow steps and tracking

-- 1. ENHANCED ORDER STATUS TRACKING
-- Update production_orders table to support enhanced workflow states
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS workflow_stage TEXT DEFAULT 'created' 
  CHECK(workflow_stage IN ('created', 'materials_prepared', 'setup_ready', 'in_progress', 'quality_hold', 'completed', 'stopped', 'cancelled'));

-- Add material and setup tracking columns
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS material_check_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS material_checked_by INTEGER REFERENCES users(id);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS material_check_time TIMESTAMP;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS setup_start_time TIMESTAMP;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS setup_complete_time TIMESTAMP;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS setup_duration_minutes INTEGER;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS quality_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS quality_approved_by INTEGER REFERENCES users(id);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS quality_check_time TIMESTAMP;

-- 2. MATERIAL REQUIREMENTS AND CONSUMPTION TRACKING
CREATE TABLE IF NOT EXISTS material_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    material_code TEXT NOT NULL,
    material_name TEXT NOT NULL,
    required_quantity DECIMAL(10,3) NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'kg',
    allocated_quantity DECIMAL(10,3) DEFAULT 0,
    consumed_quantity DECIMAL(10,3) DEFAULT 0,
    lot_number TEXT,
    supplier TEXT,
    expiry_date DATE,
    status TEXT DEFAULT 'required' CHECK(status IN ('required', 'allocated', 'issued', 'consumed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_consumption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    material_requirement_id INTEGER REFERENCES material_requirements(id),
    material_code TEXT NOT NULL,
    consumed_quantity DECIMAL(10,3) NOT NULL,
    consumption_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operator_id INTEGER REFERENCES users(id),
    notes TEXT,
    waste_quantity DECIMAL(10,3) DEFAULT 0,
    waste_reason TEXT
);

-- 3. MACHINE SETUP AND CHANGEOVER TRACKING
CREATE TABLE IF NOT EXISTS machine_setups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    setup_type TEXT NOT NULL CHECK(setup_type IN ('initial_setup', 'changeover', 'maintenance_setup')),
    previous_product TEXT,
    current_product TEXT,
    setup_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    setup_complete_time TIMESTAMP,
    setup_duration_minutes INTEGER,
    operator_id INTEGER REFERENCES users(id),
    supervisor_id INTEGER REFERENCES users(id),
    setup_checklist TEXT, -- JSON array of completed tasks
    status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'failed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. QUALITY CONTROL CHECKPOINTS
CREATE TABLE IF NOT EXISTS quality_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    checkpoint_name TEXT NOT NULL,
    checkpoint_stage TEXT NOT NULL CHECK(checkpoint_stage IN ('pre_production', 'in_process', 'final_inspection')),
    required BOOLEAN DEFAULT TRUE,
    completed BOOLEAN DEFAULT FALSE,
    passed BOOLEAN DEFAULT NULL,
    measured_value DECIMAL(10,3),
    target_value DECIMAL(10,3),
    tolerance_min DECIMAL(10,3),
    tolerance_max DECIMAL(10,3),
    unit_of_measure TEXT,
    inspector_id INTEGER REFERENCES users(id),
    inspection_time TIMESTAMP,
    corrective_action TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. BATCH AND LOT TRACEABILITY
CREATE TABLE IF NOT EXISTS production_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT UNIQUE NOT NULL,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    batch_size INTEGER NOT NULL,
    production_date DATE NOT NULL,
    expiry_date DATE,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'quarantined', 'released')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES production_batches(id),
    material_code TEXT NOT NULL,
    material_lot_number TEXT NOT NULL,
    supplier TEXT,
    quantity_used DECIMAL(10,3) NOT NULL,
    unit_of_measure TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. PRODUCTION ENVIRONMENT CONDITIONS
CREATE TABLE IF NOT EXISTS production_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    measurement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    pressure DECIMAL(8,2),
    ph_level DECIMAL(4,2),
    operator_id INTEGER REFERENCES users(id),
    notes TEXT
);

-- 7. EQUIPMENT MAINTENANCE WINDOWS
CREATE TABLE IF NOT EXISTS maintenance_windows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    maintenance_type TEXT NOT NULL CHECK(maintenance_type IN ('preventive', 'corrective', 'calibration')),
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    technician_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. SHIFT HANDOVER TRACKING
CREATE TABLE IF NOT EXISTS shift_handovers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    from_shift TEXT NOT NULL,
    to_shift TEXT NOT NULL,
    handover_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    outgoing_operator_id INTEGER REFERENCES users(id),
    incoming_operator_id INTEGER REFERENCES users(id),
    production_status TEXT NOT NULL,
    current_quantity INTEGER,
    issues_reported TEXT,
    notes TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_time TIMESTAMP
);

-- 9. REGULATORY COMPLIANCE RECORDS
CREATE TABLE IF NOT EXISTS compliance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES production_orders(id),
    batch_id INTEGER REFERENCES production_batches(id),
    regulation_type TEXT NOT NULL, -- FDA, HACCP, ISO, etc.
    checkpoint_name TEXT NOT NULL,
    measurement_value DECIMAL(10,3),
    measurement_unit TEXT,
    critical_limit_min DECIMAL(10,3),
    critical_limit_max DECIMAL(10,3),
    within_limits BOOLEAN NOT NULL,
    operator_id INTEGER REFERENCES users(id),
    measurement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calibration_date DATE,
    corrective_action TEXT,
    verified_by INTEGER REFERENCES users(id),
    verification_time TIMESTAMP
);

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_material_requirements_order ON material_requirements(order_id);
CREATE INDEX IF NOT EXISTS idx_material_consumption_order ON material_consumption(order_id);
CREATE INDEX IF NOT EXISTS idx_machine_setups_order ON machine_setups(order_id);
CREATE INDEX IF NOT EXISTS idx_machine_setups_machine ON machine_setups(machine_id);
CREATE INDEX IF NOT EXISTS idx_quality_checkpoints_order ON quality_checkpoints(order_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_order ON production_batches(order_id);
CREATE INDEX IF NOT EXISTS idx_batch_materials_batch ON batch_materials(batch_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_machine ON maintenance_windows(machine_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_order ON shift_handovers(order_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_order ON compliance_records(order_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_batch ON compliance_records(batch_id);

-- 11. SAMPLE DATA FOR TESTING
-- Add sample material requirements for existing orders
INSERT OR IGNORE INTO material_requirements (order_id, material_code, material_name, required_quantity, unit_of_measure) 
SELECT id, 'RAW001', 'Primary Ingredient A', quantity * 0.8, 'kg' FROM production_orders WHERE id <= 5;

INSERT OR IGNORE INTO material_requirements (order_id, material_code, material_name, required_quantity, unit_of_measure) 
SELECT id, 'RAW002', 'Secondary Ingredient B', quantity * 0.2, 'kg' FROM production_orders WHERE id <= 5;

-- Add sample quality checkpoints for different production stages
INSERT OR IGNORE INTO quality_checkpoints (order_id, checkpoint_name, checkpoint_stage, target_value, tolerance_min, tolerance_max, unit_of_measure)
SELECT id, 'Weight Check', 'final_inspection', quantity, quantity * 0.95, quantity * 1.05, 'units' 
FROM production_orders WHERE id <= 5;

INSERT OR IGNORE INTO quality_checkpoints (order_id, checkpoint_name, checkpoint_stage, target_value, tolerance_min, tolerance_max, unit_of_measure)
SELECT id, 'Temperature Control', 'in_process', 75.0, 70.0, 80.0, '°C' 
FROM production_orders WHERE id <= 5;

-- Update existing orders to have proper workflow stages
UPDATE production_orders 
SET workflow_stage = CASE 
    WHEN status = 'pending' THEN 'created'
    WHEN status = 'in_progress' THEN 'in_progress' 
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'stopped' THEN 'stopped'
    ELSE 'created'
END
WHERE workflow_stage IS NULL OR workflow_stage = 'created';

COMMIT;