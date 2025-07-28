-- Data Quality Cleanup Script for Production.db
-- This script fixes inconsistencies, missing data, and standardizes formats

BEGIN TRANSACTION;

-- =================================================================================
-- 1. FIX MISSING EMPLOYEE CODES
-- =================================================================================

SELECT 'Fixing missing employee codes...' as status;

-- Generate systematic employee codes based on role and username
UPDATE users SET employee_code = 'ADM001' WHERE username = 'admin' AND (employee_code IS NULL OR employee_code = '');
UPDATE users SET employee_code = 'SUP001' WHERE username = 'Brandon King' AND (employee_code IS NULL OR employee_code = '');  
UPDATE users SET employee_code = 'SUP002' WHERE username = 'Super King' AND (employee_code IS NULL OR employee_code = '');

-- Verify employee codes are now complete
SELECT 'Employee codes after fix:' as check, username, employee_code FROM users ORDER BY id;

-- =================================================================================
-- 2. FIX OUTDATED ASSIGNMENT STATUS
-- =================================================================================

SELECT 'Fixing outdated assignment status...' as status;

-- Update old planned assignments to completed (they're in the past)
UPDATE labor_assignments 
SET status = 'completed' 
WHERE status = 'planned' AND assignment_date < date('now');

-- Show what was updated
SELECT 'Updated assignments:' as check, COUNT(*) as updated_count 
FROM labor_assignments 
WHERE status = 'completed' AND assignment_date < date('now');

-- =================================================================================
-- 3. STANDARDIZE DATA FORMATS
-- =================================================================================

SELECT 'Standardizing data formats...' as status;

-- Standardize shift values to lowercase
UPDATE labor_assignments SET shift = LOWER(TRIM(shift));
UPDATE shift_supervisors SET shift = LOWER(TRIM(shift));
UPDATE daily_attendance SET shift = LOWER(TRIM(shift));

-- Standardize environment names
UPDATE machines SET environment = LOWER(TRIM(environment));
UPDATE production_orders SET environment = LOWER(TRIM(environment));
UPDATE environments SET code = LOWER(TRIM(code));

-- Clean up machine names (remove extra spaces)
UPDATE machines SET name = TRIM(name);
UPDATE machines SET type = TRIM(type);

-- Clean up user data
UPDATE users SET fullName = TRIM(fullName) WHERE fullName IS NOT NULL;
UPDATE users SET username = TRIM(username);
UPDATE users SET role = LOWER(TRIM(role));

-- =================================================================================
-- 4. FIX DATA CONSISTENCY ISSUES
-- =================================================================================

SELECT 'Fixing data consistency issues...' as status;

-- Ensure boolean fields are proper (SQLite stores as 0/1)
UPDATE users SET is_active = 1 WHERE is_active IS NULL;
UPDATE production_orders SET archived = 0 WHERE archived IS NULL;

-- Set default values for NULL capacity and production_rate
UPDATE machines SET capacity = 100 WHERE capacity IS NULL;
UPDATE machines SET production_rate = 60 WHERE production_rate IS NULL;

-- =================================================================================
-- 5. ADD MISSING TIMESTAMPS (where possible)
-- =================================================================================

SELECT 'Adding missing timestamps...' as status;

-- Add created_at for users without it (use a reasonable default)
UPDATE users SET created_at = datetime('2025-01-01 08:00:00') 
WHERE created_at IS NULL;

-- Set reasonable defaults for production orders
UPDATE production_orders SET created_at = datetime('2025-01-01 08:00:00') 
WHERE created_at IS NULL;

-- =================================================================================
-- 6. VALIDATE FOREIGN KEY RELATIONSHIPS
-- =================================================================================

SELECT 'Validating foreign key relationships...' as status;

-- Check for orphaned labor assignments (should be none with proper constraints)
SELECT 'Orphaned labor assignments (users):' as check, COUNT(*) as count
FROM labor_assignments la 
LEFT JOIN users u ON la.user_id = u.id 
WHERE u.id IS NULL;

SELECT 'Orphaned labor assignments (machines):' as check, COUNT(*) as count
FROM labor_assignments la 
LEFT JOIN machines m ON la.machine_id = m.id 
WHERE m.id IS NULL;

-- Check for orphaned supervisor assignments
SELECT 'Orphaned supervisor assignments:' as check, COUNT(*) as count
FROM shift_supervisors ss 
LEFT JOIN users u ON ss.supervisor_id = u.id 
WHERE u.id IS NULL;

-- =================================================================================
-- 7. CREATE DATA QUALITY SUMMARY
-- =================================================================================

SELECT 'DATA QUALITY SUMMARY' as summary;
SELECT '========================' as separator;

-- User data completeness
SELECT 'Users with complete data:' as metric, 
       COUNT(*) as count,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 1) || '%' as percentage
FROM users 
WHERE employee_code IS NOT NULL 
  AND employee_code != '' 
  AND fullName IS NOT NULL;

-- Assignment data quality
SELECT 'Current assignments (not outdated):' as metric,
       COUNT(*) as count
FROM labor_assignments 
WHERE assignment_date >= date('now') OR status != 'planned';

-- Machine utilization
SELECT 'Machines with assignments:' as metric,
       COUNT(DISTINCT machine_id) as count,
       ROUND(COUNT(DISTINCT machine_id) * 100.0 / (SELECT COUNT(*) FROM machines), 1) || '%' as percentage
FROM labor_assignments;

-- Environment consistency
SELECT 'Consistent environment formats:' as metric,
       COUNT(*) as standardized_count
FROM machines 
WHERE environment = LOWER(TRIM(environment));

SELECT 'Data quality improvements completed successfully!' as final_status;

COMMIT;

-- =================================================================================
-- 8. POST-CLEANUP VERIFICATION QUERIES
-- =================================================================================

-- Run these to verify everything is clean
SELECT 'VERIFICATION RESULTS' as verification;
SELECT '===================' as separator;

-- Check employee codes
SELECT 'Employee codes check:' as check;
SELECT username, employee_code, CASE WHEN employee_code IS NULL OR employee_code = '' THEN 'MISSING' ELSE 'OK' END as status 
FROM users ORDER BY id;

-- Check assignment status consistency
SELECT 'Assignment status check:' as check;
SELECT 'Outdated planned assignments:' as metric, COUNT(*) as should_be_zero
FROM labor_assignments 
WHERE status = 'planned' AND assignment_date < date('now');

-- Check shift standardization
SELECT 'Shift standardization check:' as check;
SELECT DISTINCT shift, 'labor_assignments' as table_name FROM labor_assignments
UNION ALL
SELECT DISTINCT shift, 'shift_supervisors' FROM shift_supervisors
ORDER BY table_name, shift;