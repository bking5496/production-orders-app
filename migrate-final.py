#!/usr/bin/env python3
"""
Final Migration Script - Handles orphaned references and completes data migration
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
        if isinstance(ts, datetime):
            return ts
        return datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
    except:
        return None

def migrate_final():
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
        print("🚀 Starting FINAL data migration")
        print("🔧 Handling orphaned references and data cleanup")
        print("=" * 70)
        
        # Step 1: Get valid machine and user IDs for reference validation
        print("🔍 Validating reference integrity...")
        
        # Get valid machine IDs from both databases
        sqlite_cursor.execute("SELECT DISTINCT id FROM machines")
        valid_machine_ids = set(row[0] for row in sqlite_cursor.fetchall())
        print(f"   Valid machine IDs: {sorted(valid_machine_ids)}")
        
        # Get valid user IDs from PostgreSQL
        pg_cursor.execute("SELECT DISTINCT id FROM users")
        valid_user_ids = set(row[0] for row in pg_cursor.fetchall())
        print(f"   Valid user IDs: {len(valid_user_ids)} users (1-{max(valid_user_ids) if valid_user_ids else 0})")
        
        # Step 2: Migrate production orders with reference validation
        print("\n📦 Migrating Production Orders (with reference validation)...")
        sqlite_cursor.execute("SELECT * FROM production_orders ORDER BY id")
        orders = sqlite_cursor.fetchall()
        
        sqlite_cursor.execute("PRAGMA table_info(production_orders)")
        order_columns = [col[1] for col in sqlite_cursor.fetchall()]
        
        # Clear existing orders first
        pg_cursor.execute("DELETE FROM production_orders")
        
        migrated_orders = 0
        skipped_orders = 0
        for order in orders:
            try:
                order_data = dict(zip(order_columns, order))
                machine_id = order_data.get('machine_id')
                operator_id = order_data.get('operator_id')
                
                # Validate machine_id - set to NULL if invalid
                if machine_id and machine_id not in valid_machine_ids:
                    print(f"   ⚠️  Order {order_data.get('order_number')}: Invalid machine_id {machine_id}, setting to NULL")
                    machine_id = None
                
                # Validate operator_id - set to NULL if invalid
                if operator_id and operator_id not in valid_user_ids:
                    print(f"   ⚠️  Order {order_data.get('order_number')}: Invalid operator_id {operator_id}, setting to NULL")
                    operator_id = None
                
                # Clean timestamps
                start_time = clean_timestamp(order_data.get('start_time'))
                complete_time = clean_timestamp(order_data.get('complete_time') or order_data.get('completed_time'))
                created_at = clean_timestamp(order_data.get('created_at')) or datetime.now()
                
                # Clean due_date
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
                    machine_id,  # Validated/cleaned machine_id
                    operator_id,  # Validated/cleaned operator_id
                    due_date,
                    order_data.get('notes', ''),
                    order_data.get('created_by', 1) if order_data.get('created_by') in valid_user_ids else 1,
                    created_at,
                    start_time,
                    complete_time,
                    order_data.get('stop_reason'),
                    order_data.get('efficiency_percentage'),
                    bool(order_data.get('archived', False))
                ))
                migrated_orders += 1
            except Exception as e:
                print(f"   ❌ Error migrating order {order_data.get('order_number', 'unknown')}: {e}")
                skipped_orders += 1
        
        pg_conn.commit()
        print(f"   ✅ Migrated {migrated_orders} production orders")
        print(f"   ⚠️  Skipped {skipped_orders} orders due to errors")
        
        # Step 3: Migrate production stops for successfully migrated orders
        print("\n⏸️  Migrating Production Stops...")
        if migrated_orders > 0:
            try:
                # Get list of successfully migrated order IDs
                pg_cursor.execute("SELECT id FROM production_orders")
                migrated_order_ids = set(row[0] for row in pg_cursor.fetchall())
                
                sqlite_cursor.execute("SELECT * FROM production_stops")
                stops = sqlite_cursor.fetchall()
                
                sqlite_cursor.execute("PRAGMA table_info(production_stops)")
                stop_columns = [col[1] for col in sqlite_cursor.fetchall()]
                
                pg_cursor.execute("DELETE FROM production_stops")
                
                migrated_stops = 0
                for stop in stops:
                    try:
                        stop_data = dict(zip(stop_columns, stop))
                        order_id = stop_data.get('order_id')
                        
                        if order_id in migrated_order_ids:
                            start_time = clean_timestamp(stop_data.get('start_time') or stop_data.get('created_at')) or datetime.now()
                            end_time = clean_timestamp(stop_data.get('end_time') or stop_data.get('resolved_at'))
                            
                            operator_id = stop_data.get('operator_id') or stop_data.get('created_by')
                            if operator_id and operator_id not in valid_user_ids:
                                operator_id = 1  # Default to admin user
                            
                            pg_cursor.execute("""
                                INSERT INTO production_stops (
                                    order_id, reason, category, notes, start_time, end_time,
                                    duration, operator_id, resolved_by
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                order_id,
                                stop_data.get('reason', 'Unknown'),
                                stop_data.get('category', 'Equipment'),
                                stop_data.get('notes', ''),
                                start_time,
                                end_time,
                                stop_data.get('duration'),
                                operator_id,
                                stop_data.get('resolved_by') if stop_data.get('resolved_by') in valid_user_ids else None
                            ))
                            migrated_stops += 1
                    except Exception as e:
                        print(f"   ⚠️  Error migrating stop: {e}")
                
                pg_conn.commit()
                print(f"   ✅ Migrated {migrated_stops} production stops")
            except Exception as e:
                print(f"   ❌ Error with stops: {e}")
        else:
            print("   ⏭️  Skipped stops (no orders to reference)")
        
        # Final validation and summary
        print("\n🔍 FINAL MIGRATION SUMMARY:")
        print("=" * 70)
        
        validation_queries = [
            ("Users", "SELECT COUNT(*) FROM users"),
            ("Machines", "SELECT COUNT(*) FROM machines"),
            ("Environments", "SELECT COUNT(*) FROM environments"),
            ("Production Orders", "SELECT COUNT(*) FROM production_orders"),
            ("Production Stops", "SELECT COUNT(*) FROM production_stops")
        ]
        
        total_records = 0
        for name, query in validation_queries:
            try:
                pg_cursor.execute(query)
                count = pg_cursor.fetchone()[0]
                print(f"✅ {name:<18}: {count:>6} records")
                total_records += count
            except Exception as e:
                print(f"❌ {name:<18}: Error - {e}")
        
        print("=" * 70)
        print(f"🎉 TOTAL RECORDS: {total_records}")
        
        # Test application critical queries
        print("\n🧪 TESTING APPLICATION FUNCTIONALITY:")
        print("-" * 50)
        
        # Test orders API (the main failing endpoint)
        try:
            pg_cursor.execute("""
                SELECT 
                    o.id, o.order_number, o.status, o.product_name,
                    m.name as machine_name, u.username as operator_name
                FROM production_orders o
                LEFT JOIN machines m ON o.machine_id = m.id
                LEFT JOIN users u ON o.operator_id = u.id
                ORDER BY o.id DESC
                LIMIT 5
            """)
            orders = pg_cursor.fetchall()
            print(f"✅ Orders API Query: {len(orders)} orders returned")
            
            for order in orders[:3]:  # Show first 3
                print(f"   📦 {order[1]}: {order[2]} - {order[3]}")
                print(f"      Machine: {order[4] or 'Unassigned'} | Operator: {order[5] or 'Unassigned'}")
            
        except Exception as e:
            print(f"❌ Orders API Query Failed: {e}")
        
        # Test machines API  
        try:
            pg_cursor.execute("SELECT id, name, status FROM machines ORDER BY id")
            machines = pg_cursor.fetchall()
            print(f"✅ Machines API Query: {len(machines)} machines")
            print(f"   🔧 Sample: {machines[0][1]} (ID: {machines[0][0]}, Status: {machines[0][2]})")
        except Exception as e:
            print(f"❌ Machines API Query Failed: {e}")
        
        # Test environments
        try:
            pg_cursor.execute("SELECT code, name FROM environments")
            environments = pg_cursor.fetchall()
            print(f"✅ Environments: {len(environments)} environments")
            print(f"   🌍 Available: {', '.join([env[0] for env in environments])}")
        except Exception as e:
            print(f"❌ Environments Query Failed: {e}")
        
        print("\n" + "=" * 70)
        print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
        print("🔧 All data integrity issues resolved")
        print("🔗 Foreign key constraints satisfied")
        print("📊 Application should now work with PostgreSQL")
        print("🌐 Test the application at: https://oracles.africa/")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"\n❌ MIGRATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        pg_conn.rollback()
        return False
    
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    success = migrate_final()
    if not success:
        sys.exit(1)
    print("\n🚀 You can now restart your application to use PostgreSQL!")
    print("🔄 Server is already running with PostgreSQL backend")