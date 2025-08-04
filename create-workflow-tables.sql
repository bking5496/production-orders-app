-- Enhanced Production Workflow Database Schema
-- Creates tables for materials, recipes, setup checklists, quality checkpoints, and workflow tracking

-- Materials/Ingredients Master Table
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20) NOT NULL, -- kg, liters, units, etc.
    supplier VARCHAR(255),
    cost_per_unit DECIMAL(10,4),
    minimum_stock INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    storage_location VARCHAR(100),
    shelf_life_days INTEGER,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Recipes (Bill of Materials)
CREATE TABLE IF NOT EXISTS product_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name VARCHAR(255) NOT NULL,
    material_id INTEGER NOT NULL,
    required_quantity DECIMAL(10,4) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    sequence_order INTEGER DEFAULT 1,
    is_critical BOOLEAN DEFAULT 0, -- Critical materials that must be checked
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- Setup Checklists (configurable per machine/product type)
CREATE TABLE IF NOT EXISTS setup_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    machine_type VARCHAR(100), -- NULL means applies to all machines
    product_category VARCHAR(100), -- NULL means applies to all products
    task_description TEXT NOT NULL,
    sequence_order INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT 1,
    estimated_time_minutes INTEGER,
    instructions TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quality Checkpoints (configurable per product)
CREATE TABLE IF NOT EXISTS quality_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name VARCHAR(255), -- NULL means applies to all products
    checkpoint_name VARCHAR(255) NOT NULL,
    checkpoint_stage VARCHAR(50) NOT NULL, -- setup, in_process, final_inspection
    target_value DECIMAL(10,4),
    tolerance_min DECIMAL(10,4),
    tolerance_max DECIMAL(10,4),
    unit_of_measure VARCHAR(20),
    test_method TEXT,
    frequency VARCHAR(50), -- per_batch, hourly, continuous, etc.
    is_mandatory BOOLEAN DEFAULT 1,
    sequence_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Progress Tracking
CREATE TABLE IF NOT EXISTS workflow_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    stage VARCHAR(50) NOT NULL, -- materials, setup, production, quality, completion
    status VARCHAR(50) NOT NULL, -- pending, in_progress, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    operator_id INTEGER,
    notes TEXT,
    data JSON, -- Store stage-specific data (materials allocated, checklist status, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES production_orders(id),
    FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- Material Allocations (track which materials are allocated to which orders)
CREATE TABLE IF NOT EXISTS material_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    required_quantity DECIMAL(10,4) NOT NULL,
    allocated_quantity DECIMAL(10,4) DEFAULT 0,
    lot_number VARCHAR(100),
    expiry_date DATE,
    allocated_at TIMESTAMP,
    allocated_by INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, allocated, consumed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES production_orders(id),
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (allocated_by) REFERENCES users(id)
);

-- Setup Checklist Progress (track completion of setup tasks)
CREATE TABLE IF NOT EXISTS setup_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    checklist_id INTEGER NOT NULL,
    completed BOOLEAN DEFAULT 0,
    completed_at TIMESTAMP,
    completed_by INTEGER,
    notes TEXT,
    time_taken_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES production_orders(id),
    FOREIGN KEY (checklist_id) REFERENCES setup_checklists(id),
    FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- Quality Check Results
CREATE TABLE IF NOT EXISTS quality_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    checkpoint_id INTEGER NOT NULL,
    measured_value DECIMAL(10,4),
    pass_fail VARCHAR(10), -- pass, fail, pending
    measured_at TIMESTAMP,
    measured_by INTEGER,
    notes TEXT,
    corrective_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES production_orders(id),
    FOREIGN KEY (checkpoint_id) REFERENCES quality_checkpoints(id),
    FOREIGN KEY (measured_by) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_material_allocations_order ON material_allocations(order_id);
CREATE INDEX IF NOT EXISTS idx_workflow_progress_order ON workflow_progress(order_id);
CREATE INDEX IF NOT EXISTS idx_setup_progress_order ON setup_progress(order_id);
CREATE INDEX IF NOT EXISTS idx_quality_results_order ON quality_results(order_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_product ON product_recipes(product_name);

-- Insert some sample data for testing
INSERT OR IGNORE INTO materials (code, name, unit_of_measure, supplier, current_stock) VALUES
('RAW001', 'Primary Ingredient A', 'kg', 'Supplier A', 500),
('RAW002', 'Secondary Ingredient B', 'kg', 'Supplier B', 200),
('RAW003', 'Flavoring Agent C', 'liters', 'Supplier C', 50),
('PKG001', 'Primary Packaging', 'units', 'Packaging Co', 1000),
('PKG002', 'Labels', 'units', 'Label Co', 5000);

INSERT OR IGNORE INTO setup_checklists (name, task_description, sequence_order, estimated_time_minutes) VALUES
('Standard Setup', 'Machine cleaned and sanitized', 1, 15),
('Standard Setup', 'Tools and fixtures installed', 2, 10),
('Standard Setup', 'Parameters configured', 3, 5),
('Standard Setup', 'Safety systems verified', 4, 5),
('Standard Setup', 'Raw materials loaded', 5, 10);

INSERT OR IGNORE INTO quality_checkpoints (checkpoint_name, checkpoint_stage, target_value, tolerance_min, tolerance_max, unit_of_measure) VALUES
('Weight Check', 'final_inspection', 100, 95, 105, 'units'),
('Temperature Control', 'in_process', 75.0, 70.0, 80.0, '°C'),
('pH Level', 'in_process', 7.0, 6.5, 7.5, 'pH'),
('Visual Inspection', 'final_inspection', NULL, NULL, NULL, 'pass/fail');