#!/usr/bin/env python3
"""
Production Stops Migration Script
Migrates production stops from SQLite to PostgreSQL with proper order ID mapping
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

def migrate_production_stops():
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
        print("🚀 Starting Production Stops Migration")
        print("=" * 50)
        
        # Step 1: Get order mapping between SQLite and PostgreSQL
        print("🔍 Building order ID mapping...")
        
        # Get SQLite orders
        sqlite_cursor.execute("SELECT id, order_number FROM production_orders")
        sqlite_orders = {row[0]: row[1] for row in sqlite_cursor.fetchall()}
        
        # Get PostgreSQL orders  
        pg_cursor.execute("SELECT id, order_number FROM production_orders")
        pg_orders = {row[1]: row[0] for row in pg_cursor.fetchall()}  # order_number -> pg_id
        
        print(f"   📊 SQLite orders: {len(sqlite_orders)}")
        print(f"   📊 PostgreSQL orders: {len(pg_orders)}")
        
        # Create mapping: sqlite_order_id -> pg_order_id
        order_id_map = {}
        for sqlite_id, order_number in sqlite_orders.items():
            if order_number in pg_orders:
                order_id_map[sqlite_id] = pg_orders[order_number]
        
        print(f"   ✅ Mapped {len(order_id_map)} orders for reference")
        
        # Step 2: Get valid user IDs for operator/resolved_by validation
        pg_cursor.execute("SELECT id FROM users")
        valid_user_ids = set(row[0] for row in pg_cursor.fetchall())
        default_user_id = min(valid_user_ids) if valid_user_ids else 4
        
        # Step 3: Migrate production stops
        print("\n⏸️  Migrating Production Stops...")
        
        sqlite_cursor.execute("SELECT * FROM production_stops ORDER BY id")
        stops = sqlite_cursor.fetchall()
        
        sqlite_cursor.execute("PRAGMA table_info(production_stops)")
        stop_columns = [col[1] for col in sqlite_cursor.fetchall()]
        
        print(f"   📋 Found {len(stops)} production stops to migrate")
        print(f"   📋 Columns: {stop_columns}")
        
        # Clear existing stops
        pg_cursor.execute("DELETE FROM production_stops")
        print("   🧹 Cleared existing production stops")
        
        migrated_stops = 0
        skipped_stops = 0
        
        for stop in stops:
            try:
                stop_data = dict(zip(stop_columns, stop))
                sqlite_order_id = stop_data.get('order_id')
                
                # Skip if order doesn't exist in mapping
                if sqlite_order_id not in order_id_map:
                    print(f"   ⚠️  Skipping stop for order ID {sqlite_order_id} - order not found in PostgreSQL")
                    skipped_stops += 1
                    continue
                
                pg_order_id = order_id_map[sqlite_order_id]
                
                # Clean timestamps
                start_time = clean_timestamp(stop_data.get('start_time') or stop_data.get('created_at'))
                if not start_time:
                    start_time = datetime.now()
                
                end_time = clean_timestamp(stop_data.get('end_time') or stop_data.get('resolved_at'))
                
                # Validate user IDs
                operator_id = stop_data.get('operator_id') or stop_data.get('created_by')
                if operator_id and operator_id not in valid_user_ids:
                    operator_id = default_user_id
                
                resolved_by = stop_data.get('resolved_by')
                if resolved_by and resolved_by not in valid_user_ids:
                    resolved_by = None
                
                # Clean category - map empty to 'Other'
                category = stop_data.get('category')
                if not category or category.strip() == '':
                    category = 'Other'
                
                # Insert production stop
                pg_cursor.execute("""
                    INSERT INTO production_stops (
                        order_id, reason, category, notes, start_time, end_time,
                        duration, operator_id, resolved_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    pg_order_id,
                    stop_data.get('reason', 'Unknown'),
                    category,
                    stop_data.get('notes', ''),
                    start_time,
                    end_time,
                    stop_data.get('duration'),
                    operator_id,
                    resolved_by
                ))
                migrated_stops += 1
                
                if migrated_stops % 10 == 0:
                    print(f"   📊 Migrated {migrated_stops} stops...")
                    
            except Exception as e:
                print(f"   ❌ Error migrating stop ID {stop_data.get('id', 'unknown')}: {e}")
                skipped_stops += 1
        
        pg_conn.commit()
        
        print(f"\n✅ Migration Results:")
        print(f"   📊 Successfully migrated: {migrated_stops} stops")
        print(f"   ⚠️  Skipped: {skipped_stops} stops")
        
        # Step 4: Validation
        print(f"\n🔍 Validation:")
        
        # Check total count
        pg_cursor.execute("SELECT COUNT(*) FROM production_stops")
        pg_count = pg_cursor.fetchone()[0]
        print(f"   📊 PostgreSQL production stops: {pg_count}")
        
        # Check by category
        pg_cursor.execute("""
            SELECT category, COUNT(*) 
            FROM production_stops 
            GROUP BY category 
            ORDER BY COUNT(*) DESC
        """)
        categories = pg_cursor.fetchall()
        print(f"   📋 By category:")
        for cat, count in categories:
            print(f"      - {cat}: {count} stops")
        
        # Test query with order joins
        pg_cursor.execute("""
            SELECT ps.reason, ps.category, po.order_number, ps.duration
            FROM production_stops ps
            JOIN production_orders po ON ps.order_id = po.id
            ORDER BY ps.start_time DESC
            LIMIT 3
        """)
        sample_stops = pg_cursor.fetchall()
        print(f"   📋 Sample stops with order data:")
        for stop in sample_stops:
            print(f"      - {stop[2]}: {stop[0]} ({stop[1]}) - {stop[3]} min")
        
        print("\n" + "=" * 50)
        print("🎉 PRODUCTION STOPS MIGRATION COMPLETED!")
        print(f"✅ {migrated_stops} production stops successfully migrated")
        print("🔗 Downtime reports should now work properly")
        print("=" * 50)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        pg_conn.rollback()
        return False
    
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    success = migrate_production_stops()
    if not success:
        sys.exit(1)
    print("\n🚀 Production stops migration complete!")
    print("📊 You can now view downtime reports with historical data")