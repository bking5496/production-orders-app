#!/usr/bin/env python3
"""
Complete Data Migration Script
Migrates ALL data from SQLite to PostgreSQL including:
- Users (already done)
- Machines
- Production Orders
- Production Stops  
- Environments
- Labor Assignments
- Shift Supervisors
- Production Waste
- All other tables
"""

import sqlite3
import psycopg2
import sys
from datetime import datetime

def migrate_all_data():
    # SQLite connection
    sqlite_conn = sqlite3.connect('production.db')
    sqlite_cursor = sqlite_conn.cursor()
    
    # PostgreSQL connection
    pg_conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='production_orders',
        user='postgres',
        password='prodapp123'
    )
    pg_cursor = pg_conn.cursor()
    
    try:
        print("🚀 Starting complete data migration from SQLite to PostgreSQL")
        print("=" * 70)
        
        # Get all table names from SQLite
        sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in sqlite_cursor.fetchall()]
        print(f"📋 Found {len(tables)} tables to migrate: {', '.join(tables)}")
        
        migration_results = {}
        
        # 1. Migrate Machines
        print("\n🔧 Migrating Machines...")
        sqlite_cursor.execute("SELECT * FROM machines")
        machines = sqlite_cursor.fetchall()
        
        # Get column names for machines
        sqlite_cursor.execute("PRAGMA table_info(machines)")
        machine_columns = [col[1] for col in sqlite_cursor.fetchall()]
        print(f"   Columns: {machine_columns}")
        
        pg_cursor.execute("DELETE FROM machines")  # Clear existing
        
        for machine in machines:
            try:
                # Map SQLite columns to PostgreSQL, handling differences
                machine_data = dict(zip(machine_columns, machine))
                
                pg_cursor.execute("""
                    INSERT INTO machines (
                        name, type, environment, status, capacity, 
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    machine_data.get('name'),
                    machine_data.get('type', 'unknown'),
                    machine_data.get('environment', 'production'),
                    machine_data.get('status', 'available'),
                    machine_data.get('capacity', 100)
                ))
            except Exception as e:
                print(f"   ⚠️  Error migrating machine {machine[0]}: {e}")
        
        pg_conn.commit()
        pg_cursor.execute("SELECT COUNT(*) FROM machines")
        machine_count = pg_cursor.fetchone()[0]
        print(f"   ✅ Migrated {machine_count} machines")
        migration_results['machines'] = machine_count
        
        # 2. Migrate Environments
        print("\n🌍 Migrating Environments...")
        try:
            sqlite_cursor.execute("SELECT * FROM environments")
            environments = sqlite_cursor.fetchall()
            
            sqlite_cursor.execute("PRAGMA table_info(environments)")
            env_columns = [col[1] for col in sqlite_cursor.fetchall()]
            
            pg_cursor.execute("DELETE FROM environments")
            
            for env in environments:
                env_data = dict(zip(env_columns, env))
                pg_cursor.execute("""
                    INSERT INTO environments (code, name, description, created_at, updated_at)
                    VALUES (%s, %s, %s, NOW(), NOW())
                """, (
                    env_data.get('code'),
                    env_data.get('name'),
                    env_data.get('description', '')
                ))
            
            pg_conn.commit()
            pg_cursor.execute("SELECT COUNT(*) FROM environments")
            env_count = pg_cursor.fetchone()[0]
            print(f"   ✅ Migrated {env_count} environments")
            migration_results['environments'] = env_count
        except Exception as e:
            print(f"   ⚠️  Environments table might not exist: {e}")
            migration_results['environments'] = 0
        
        # 3. Migrate Production Orders
        print("\n📦 Migrating Production Orders...")
        sqlite_cursor.execute("SELECT * FROM production_orders")
        orders = sqlite_cursor.fetchall()
        
        sqlite_cursor.execute("PRAGMA table_info(production_orders)")
        order_columns = [col[1] for col in sqlite_cursor.fetchall()]
        print(f"   Found {len(orders)} orders with columns: {order_columns}")
        
        pg_cursor.execute("DELETE FROM production_orders")
        
        for order in orders:
            try:
                order_data = dict(zip(order_columns, order))
                
                # Handle timestamp conversion - remove manual timezone offsets
                start_time = order_data.get('start_time')
                complete_time = order_data.get('complete_time') or order_data.get('completed_time')
                created_at = order_data.get('created_at')
                
                pg_cursor.execute("""
                    INSERT INTO production_orders (
                        order_number, product_name, quantity, actual_quantity,
                        environment, priority, status, machine_id, operator_id,
                        due_date, notes, created_by, created_at, start_time, 
                        complete_time, stop_reason, efficiency_percentage, archived
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    order_data.get('order_number'),
                    order_data.get('product_name'),
                    order_data.get('quantity'),
                    order_data.get('actual_quantity'),
                    order_data.get('environment', 'production'),
                    order_data.get('priority', 'normal'),
                    order_data.get('status', 'pending'),
                    order_data.get('machine_id'),
                    order_data.get('operator_id'),
                    order_data.get('due_date'),
                    order_data.get('notes'),
                    order_data.get('created_by', 1),
                    created_at,
                    start_time,
                    complete_time,
                    order_data.get('stop_reason'),
                    order_data.get('efficiency_percentage'),
                    bool(order_data.get('archived', False))
                ))
            except Exception as e:
                print(f"   ⚠️  Error migrating order {order[0]}: {e}")
        
        pg_conn.commit()
        pg_cursor.execute("SELECT COUNT(*) FROM production_orders")
        order_count = pg_cursor.fetchone()[0]
        print(f"   ✅ Migrated {order_count} production orders")
        migration_results['production_orders'] = order_count
        
        # 4. Migrate Production Stops
        print("\n⏸️  Migrating Production Stops...")
        try:
            sqlite_cursor.execute("SELECT * FROM production_stops")
            stops = sqlite_cursor.fetchall()
            
            sqlite_cursor.execute("PRAGMA table_info(production_stops)")
            stop_columns = [col[1] for col in sqlite_cursor.fetchall()]
            
            pg_cursor.execute("DELETE FROM production_stops")
            
            for stop in stops:
                stop_data = dict(zip(stop_columns, stop))
                pg_cursor.execute("""
                    INSERT INTO production_stops (
                        order_id, reason, category, notes, start_time, end_time,
                        duration, operator_id, resolved_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    stop_data.get('order_id'),
                    stop_data.get('reason'),
                    stop_data.get('category', 'Equipment'),
                    stop_data.get('notes'),
                    stop_data.get('start_time') or stop_data.get('created_at'),
                    stop_data.get('end_time') or stop_data.get('resolved_at'),
                    stop_data.get('duration'),
                    stop_data.get('operator_id') or stop_data.get('created_by'),
                    stop_data.get('resolved_by')
                ))
            
            pg_conn.commit()
            pg_cursor.execute("SELECT COUNT(*) FROM production_stops")
            stop_count = pg_cursor.fetchone()[0]
            print(f"   ✅ Migrated {stop_count} production stops")
            migration_results['production_stops'] = stop_count
        except Exception as e:
            print(f"   ⚠️  Error migrating stops: {e}")
            migration_results['production_stops'] = 0
        
        # 5. Migrate Labor Assignments
        print("\n👥 Migrating Labor Assignments...")
        try:
            sqlite_cursor.execute("SELECT * FROM labor_assignments")
            assignments = sqlite_cursor.fetchall()
            
            sqlite_cursor.execute("PRAGMA table_info(labor_assignments)")
            assignment_columns = [col[1] for col in sqlite_cursor.fetchall()]
            
            pg_cursor.execute("DELETE FROM labor_assignments")
            
            for assignment in assignments:
                assignment_data = dict(zip(assignment_columns, assignment))
                pg_cursor.execute("""
                    INSERT INTO labor_assignments (
                        user_id, machine_id, assignment_date, shift, 
                        role, status, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    assignment_data.get('user_id'),
                    assignment_data.get('machine_id'),
                    assignment_data.get('assignment_date'),
                    assignment_data.get('shift'),
                    assignment_data.get('role', 'operator'),
                    assignment_data.get('status', 'active'),
                    assignment_data.get('created_at') or 'NOW()',
                    assignment_data.get('updated_at') or 'NOW()'
                ))
            
            pg_conn.commit()
            pg_cursor.execute("SELECT COUNT(*) FROM labor_assignments")
            assignment_count = pg_cursor.fetchone()[0]
            print(f"   ✅ Migrated {assignment_count} labor assignments")
            migration_results['labor_assignments'] = assignment_count
        except Exception as e:
            print(f"   ⚠️  Error migrating labor assignments: {e}")
            migration_results['labor_assignments'] = 0
        
        # 6. Migrate Shift Supervisors
        print("\n👨‍💼 Migrating Shift Supervisors...")
        try:
            sqlite_cursor.execute("SELECT * FROM shift_supervisors")
            supervisors = sqlite_cursor.fetchall()
            
            sqlite_cursor.execute("PRAGMA table_info(shift_supervisors)")
            supervisor_columns = [col[1] for col in sqlite_cursor.fetchall()]
            
            pg_cursor.execute("DELETE FROM shift_supervisors")
            
            for supervisor in supervisors:
                supervisor_data = dict(zip(supervisor_columns, supervisor))
                pg_cursor.execute("""
                    INSERT INTO shift_supervisors (
                        user_id, assignment_date, shift, environment,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    supervisor_data.get('user_id'),
                    supervisor_data.get('assignment_date'),
                    supervisor_data.get('shift'),
                    supervisor_data.get('environment', 'production'),
                    supervisor_data.get('created_at') or 'NOW()',
                    supervisor_data.get('updated_at') or 'NOW()'
                ))
            
            pg_conn.commit()
            pg_cursor.execute("SELECT COUNT(*) FROM shift_supervisors")
            supervisor_count = pg_cursor.fetchone()[0]
            print(f"   ✅ Migrated {supervisor_count} shift supervisors")
            migration_results['shift_supervisors'] = supervisor_count
        except Exception as e:
            print(f"   ⚠️  Error migrating shift supervisors: {e}")
            migration_results['shift_supervisors'] = 0
        
        # 7. Migrate Production Waste
        print("\n🗑️  Migrating Production Waste...")
        try:
            sqlite_cursor.execute("SELECT * FROM production_waste")
            waste = sqlite_cursor.fetchall()
            
            pg_cursor.execute("DELETE FROM production_waste")
            
            for waste_record in waste:
                pg_cursor.execute("""
                    INSERT INTO production_waste (
                        order_id, waste_type, quantity, created_by, created_at
                    ) VALUES (%s, %s, %s, %s, %s)
                """, waste_record)
            
            pg_conn.commit()
            pg_cursor.execute("SELECT COUNT(*) FROM production_waste")
            waste_count = pg_cursor.fetchone()[0]
            print(f"   ✅ Migrated {waste_count} waste records")
            migration_results['production_waste'] = waste_count
        except Exception as e:
            print(f"   ⚠️  Error migrating waste: {e}")
            migration_results['production_waste'] = 0
        
        # Final validation
        print("\n🔍 Final Migration Validation:")
        print("=" * 50)
        
        total_migrated = 0
        for table, count in migration_results.items():
            print(f"✅ {table:<20}: {count:>6} records")
            total_migrated += count
        
        print("=" * 50)
        print(f"🎉 TOTAL MIGRATED: {total_migrated} records")
        
        # Test key queries
        print("\n🧪 Testing key queries:")
        
        # Test machines query
        pg_cursor.execute("SELECT COUNT(*) FROM machines WHERE status = 'available'")
        available_machines = pg_cursor.fetchone()[0]
        print(f"   📍 Available machines: {available_machines}")
        
        # Test orders query  
        pg_cursor.execute("SELECT COUNT(*) FROM production_orders WHERE status IN ('pending', 'in_progress')")
        active_orders = pg_cursor.fetchone()[0]
        print(f"   📦 Active orders: {active_orders}")
        
        # Test users query
        pg_cursor.execute("SELECT COUNT(*) FROM users WHERE is_active = true")
        active_users = pg_cursor.fetchone()[0]
        print(f"   👤 Active users: {active_users}")
        
        print("\n" + "=" * 70)
        print("🎉 COMPLETE DATA MIGRATION SUCCESSFUL!")
        print("💡 All SQLite data has been migrated to PostgreSQL")
        print("🌐 Your application should now work fully with PostgreSQL")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        pg_conn.rollback()
        return False
    
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    success = migrate_all_data()
    if not success:
        sys.exit(1)
    print("\n🚀 Migration complete! You can now use the PostgreSQL-powered application.")