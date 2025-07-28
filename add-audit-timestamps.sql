-- Add Audit Timestamps to Labor Assignments
-- This script adds created_by, updated_at, and updated_by columns for proper audit trail

BEGIN TRANSACTION;

-- Add audit timestamp columns to labor_assignments table
ALTER TABLE labor_assignments ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE labor_assignments ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE labor_assignments ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS trigger_labor_assignments_updated_at
    AFTER UPDATE ON labor_assignments
    FOR EACH ROW
BEGIN
    UPDATE labor_assignments 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_labor_assignments_audit 
ON labor_assignments(created_by, updated_by, updated_at);

-- Update existing records to set initial audit data (optional)
-- Set created_by to admin user for existing records without this info
UPDATE labor_assignments 
SET created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    updated_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE created_by IS NULL;

SELECT 'Audit timestamps added to labor_assignments successfully!' as status;

COMMIT;