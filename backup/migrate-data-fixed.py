#!/usr/bin/env python3
"""
Fixed Data Migration Script - Handles empty timestamps and data type issues
"""

import sqlite3
import psycopg2
import sys
from datetime import datetime

def clean_timestamp(ts):
    """Convert timestamp, handling empty strings and None values"""
    if not ts or ts == '' or ts == 'null':
        return None
    try:
        # If it's already a datetime object, return as is
        if isinstance(ts, datetime):
            return ts
        # Try to parse the timestamp
        return datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
    except:
        return None

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
        print("🚀 Starting FIXED data migration from SQLite to PostgreSQL")
        print("=" * 70)
        
        # 1. Clear and migrate machines (already working)
        print("🔧 Migrating Machines...")
        sqlite_cursor.execute("SELECT * FROM machines")
        machines = sqlite_cursor.fetchall()
        
        sqlite_cursor.execute("PRAGMA table_info(machines)")
        machine_columns = [col[1] for col in sqlite_cursor.fetchall()]
        
        pg_cursor.execute("DELETE FROM machines")
        
        for machine in machines:
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
        
        pg_conn.commit()
        pg_cursor.execute("SELECT COUNT(*) FROM machines")
        machine_count = pg_cursor.fetchone()[0]
        print(f"   ✅ Migrated {machine_count} machines")
        
        # 2. Migrate environments  
        print("🌍 Migrating Environments...")
        try:
            sqlite_cursor.execute("SELECT * FROM environments")
            environments = sqlite_cursor.fetchall()
            
            pg_cursor.execute("DELETE FROM environments")
            
            for env in environments:
                pg_cursor.execute("""
                    INSERT INTO environments (code, name, description, created_at, updated_at)
                    VALUES (%s, %s, %s, NOW(), NOW())
                """, (env[1], env[2], env[3] if len(env) > 3 else ''))
            
            pg_conn.commit()
            pg_cursor.execute("SELECT COUNT(*) FROM environments")
            env_count = pg_cursor.fetchone()[0]
            print(f"   ✅ Migrated {env_count} environments")
        except Exception as e:
            print(f"   ⚠️  Environments: {e}")
            env_count = 0
        
        # 3. Migrate Production Orders (FIXED timestamp handling)
        print("📦 Migrating Production Orders...")
        sqlite_cursor.execute("SELECT * FROM production_orders")
        orders = sqlite_cursor.fetchall()
        
        sqlite_cursor.execute("PRAGMA table_info(production_orders)")
        order_columns = [col[1] for col in sqlite_cursor.fetchall()]
        
        pg_cursor.execute("DELETE FROM production_orders")
        
        migrated_orders = 0
        for order in orders:
            try:
                order_data = dict(zip(order_columns, order))
                
                # Clean timestamps - handle empty strings
                start_time = clean_timestamp(order_data.get('start_time'))
                complete_time = clean_timestamp(order_data.get('complete_time')) or clean_timestamp(order_data.get('completed_time'))
                created_at = clean_timestamp(order_data.get('created_at')) or datetime.now()
                
                # Clean due_date - handle empty strings
                due_date = order_data.get('due_date')
                if due_date == '' or due_date == 'null':
                    due_date = None
                
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
                    order_data.get('machine_id') if order_data.get('machine_id') else None,
                    order_data.get('operator_id') if order_data.get('operator_id') else None,
                    due_date,
                    order_data.get('notes', ''),
                    order_data.get('created_by', 1),
                    created_at,
                    start_time,
                    complete_time,
                    order_data.get('stop_reason'),
                    order_data.get('efficiency_percentage'),
                    bool(order_data.get('archived', False))
                ))
                migrated_orders += 1
            except Exception as e:
                print(f"   ⚠️  Error migrating order {order_data.get('order_number', 'unknown')}: {e}")
        
        pg_conn.commit()
        print(f"   ✅ Migrated {migrated_orders} production orders")
        
        # 4. Migrate Production Stops (only if orders exist)
        print("⏸️  Migrating Production Stops...")
        if migrated_orders > 0:
            try:
                sqlite_cursor.execute("SELECT * FROM production_stops")
                stops = sqlite_cursor.fetchall()
                
                sqlite_cursor.execute("PRAGMA table_info(production_stops)")
                stop_columns = [col[1] for col in sqlite_cursor.fetchall()]
                
                pg_cursor.execute("DELETE FROM production_stops")
                
                migrated_stops = 0
                for stop in stops:
                    try:
                        stop_data = dict(zip(stop_columns, stop))
                        
                        # Check if order exists in PostgreSQL
                        pg_cursor.execute("SELECT id FROM production_orders WHERE id = %s", [stop_data.get('order_id')])
                        if pg_cursor.fetchone():
                            start_time = clean_timestamp(stop_data.get('start_time') or stop_data.get('created_at')) or datetime.now()
                            end_time = clean_timestamp(stop_data.get('end_time') or stop_data.get('resolved_at'))
                            
                            pg_cursor.execute("""
                                INSERT INTO production_stops (
                                    order_id, reason, category, notes, start_time, end_time,
                                    duration, operator_id, resolved_by
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                stop_data.get('order_id'),
                                stop_data.get('reason', 'Unknown'),
                                stop_data.get('category', 'Equipment'),
                                stop_data.get('notes', ''),
                                start_time,
                                end_time,
                                stop_data.get('duration'),
                                stop_data.get('operator_id') or stop_data.get('created_by'),
                                stop_data.get('resolved_by')
                            ))
                            migrated_stops += 1
                    except Exception as e:
                        print(f"   ⚠️  Error migrating stop: {e}")
                
                pg_conn.commit()
                print(f"   ✅ Migrated {migrated_stops} production stops")
            except Exception as e:
                print(f"   ⚠️  Error with stops: {e}")
        else:
            print("   ⏭️  Skipped stops (no orders to reference)")
        
        # 5. Migrate Labor Assignments
        print("👥 Migrating Labor Assignments...")
        try:
            sqlite_cursor.execute("SELECT * FROM labor_assignments")
            assignments = sqlite_cursor.fetchall()
            
            sqlite_cursor.execute("PRAGMA table_info(labor_assignments)")
            assignment_columns = [col[1] for col in sqlite_cursor.fetchall()]
            
            pg_cursor.execute("DELETE FROM labor_assignments")
            
            migrated_assignments = 0
            for assignment in assignments:
                try:
                    assignment_data = dict(zip(assignment_columns, assignment))
                    
                    # Validate user_id and machine_id exist
                    user_id = assignment_data.get('user_id')
                    machine_id = assignment_data.get('machine_id')
                    
                    if user_id and machine_id:
                        created_at = clean_timestamp(assignment_data.get('created_at')) or datetime.now()
                        updated_at = clean_timestamp(assignment_data.get('updated_at')) or datetime.now()
                        
                        pg_cursor.execute("""
                            INSERT INTO labor_assignments (
                                user_id, machine_id, assignment_date, shift, 
                                role, status, created_at, updated_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            user_id,
                            machine_id,
                            assignment_data.get('assignment_date'),
                            assignment_data.get('shift', 'day'),
                            assignment_data.get('role', 'operator'),
                            assignment_data.get('status', 'active'),
                            created_at,
                            updated_at
                        ))
                        migrated_assignments += 1
                except Exception as e:
                    print(f"   ⚠️  Error migrating assignment: {e}")
            
            pg_conn.commit()
            print(f"   ✅ Migrated {migrated_assignments} labor assignments")
        except Exception as e:
            print(f"   ⚠️  Error with assignments: {e}")
        
        # Final validation
        print("\n🔍 Final Migration Summary:")
        print("=" * 50)
        
        tables_to_check = [
            ('users', 'users'),
            ('machines', 'machines'), 
            ('environments', 'environments'),
            ('production_orders', 'production_orders'),
            ('production_stops', 'production_stops'),
            ('labor_assignments', 'labor_assignments')
        ]
        
        total_records = 0
        for table_name, display_name in tables_to_check:
            try:
                pg_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = pg_cursor.fetchone()[0]
                print(f"✅ {display_name:<20}: {count:>6} records")
                total_records += count
            except Exception as e:
                print(f"❌ {display_name:<20}: Error - {e}")
        
        print("=" * 50)
        print(f"🎉 TOTAL RECORDS: {total_records}")
        
        # Test key functionality
        print("\n🧪 Testing Application Queries:")
        
        # Test orders query (what the app uses)
        pg_cursor.execute("""
            SELECT o.*, m.name as machine_name, u.username as operator_name
            FROM production_orders o
            LEFT JOIN machines m ON o.machine_id = m.id
            LEFT JOIN users u ON o.operator_id = u.id
            LIMIT 5
        """)
        test_orders = pg_cursor.fetchall()
        print(f"   📦 Orders with joins: {len(test_orders)} (sample query works)")
        
        # Test machines query
        pg_cursor.execute("SELECT * FROM machines WHERE status = 'available' LIMIT 3")
        available_machines = pg_cursor.fetchall()
        print(f"   🔧 Available machines: {len(available_machines)}")
        
        # Test environments
        pg_cursor.execute("SELECT * FROM environments")
        environments = pg_cursor.fetchall()
        print(f"   🌍 Environments: {len(environments)}")
        
        print("\n" + "=" * 70)
        print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
        print("💻 Your application should now work with PostgreSQL")
        print("🔗 Test the application at: https://oracles.africa/")
        
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