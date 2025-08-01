#!/usr/bin/env python3
"""
SQLite to PostgreSQL Data Migration Script
Handles timezone conversion and data validation for Production Orders App
"""

import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os
import sys
from datetime import datetime, timezone, timedelta
import json
import argparse

# SAST timezone offset (UTC+2)
SAST_OFFSET = timedelta(hours=2)

class DatabaseMigrator:
    def __init__(self, sqlite_path, pg_config):
        self.sqlite_path = sqlite_path
        self.pg_config = pg_config
        self.sqlite_conn = None
        self.pg_conn = None
        
    def connect_databases(self):
        """Establish connections to both databases"""
        try:
            # SQLite connection
            self.sqlite_conn = sqlite3.connect(self.sqlite_path)
            self.sqlite_conn.row_factory = sqlite3.Row
            print(f"✅ Connected to SQLite: {self.sqlite_path}")
            
            # PostgreSQL connection
            self.pg_conn = psycopg2.connect(**self.pg_config)
            self.pg_conn.autocommit = False
            print(f"✅ Connected to PostgreSQL: {self.pg_config['host']}:{self.pg_config['port']}")
            
        except Exception as e:
            print(f"❌ Database connection error: {e}")
            sys.exit(1)
    
    def convert_sqlite_timestamp(self, sqlite_ts):
        """Convert SQLite timestamp to PostgreSQL TIMESTAMPTZ"""
        if not sqlite_ts:
            return None
            
        try:
            # Parse SQLite datetime (assumes SAST timezone)
            if 'T' in sqlite_ts:
                dt = datetime.fromisoformat(sqlite_ts.replace('Z', ''))
            else:
                dt = datetime.strptime(sqlite_ts, '%Y-%m-%d %H:%M:%S')
            
            # Treat as SAST and convert to UTC for PostgreSQL storage
            sast_tz = timezone(SAST_OFFSET)
            dt_sast = dt.replace(tzinfo=sast_tz)
            dt_utc = dt_sast.astimezone(timezone.utc)
            
            return dt_utc
            
        except Exception as e:
            print(f"⚠️  Timestamp conversion error for '{sqlite_ts}': {e}")
            return None
    
    def migrate_table_data(self, table_name, column_mapping, timezone_columns=None):
        """Migrate data from SQLite to PostgreSQL with column mapping"""
        if timezone_columns is None:
            timezone_columns = []
            
        try:
            # Get SQLite data
            sqlite_cursor = self.sqlite_conn.cursor()
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                print(f"📋 No data found in {table_name}")
                return 0
            
            # Prepare PostgreSQL columns and placeholders
            pg_columns = list(column_mapping.values())
            placeholders = ', '.join(['%s'] * len(pg_columns))
            
            # Convert data
            converted_rows = []
            for row in rows:
                converted_row = []
                for sqlite_col, pg_col in column_mapping.items():
                    value = row[sqlite_col] if sqlite_col in row.keys() else None
                    
                    # Handle timezone conversion
                    if sqlite_col in timezone_columns and value:
                        value = self.convert_sqlite_timestamp(value)
                    
                    # Handle JSON columns
                    if isinstance(value, str) and (sqlite_col.endswith('_data') or sqlite_col == 'specifications'):
                        try:
                            value = json.loads(value)
                        except:
                            value = {}
                    
                    converted_row.append(value)
                
                converted_rows.append(converted_row)
            
            # Insert into PostgreSQL
            pg_cursor = self.pg_conn.cursor()
            insert_sql = f"""
                INSERT INTO {table_name} ({', '.join(pg_columns)}) 
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            """
            
            execute_values(pg_cursor, insert_sql, converted_rows, page_size=1000)
            self.pg_conn.commit()
            
            print(f"✅ Migrated {len(converted_rows)} rows to {table_name}")
            return len(converted_rows)
            
        except Exception as e:
            print(f"❌ Error migrating {table_name}: {e}")
            self.pg_conn.rollback()
            return 0
    
    def migrate_users(self):
        """Migrate users table with role validation"""
        column_mapping = {
            'id': 'id',
            'username': 'username', 
            'email': 'email',
            'password_hash': 'password_hash',
            'role': 'role',
            'is_active': 'is_active',
            'profile_data': 'profile_data',
            'created_at': 'created_at',
            'updated_at': 'updated_at',
            'last_login': 'last_login'
        }
        
        timezone_columns = ['created_at', 'updated_at', 'last_login']
        
        return self.migrate_table_data('users', column_mapping, timezone_columns)
    
    def migrate_machines(self):
        """Migrate machines table"""
        column_mapping = {
            'id': 'id',
            'name': 'name',
            'code': 'code',
            'type': 'type',
            'environment': 'environment',
            'status': 'status',
            'capacity': 'capacity',
            'production_rate': 'production_rate',
            'location': 'location',
            'specifications': 'specifications',
            'created_at': 'created_at',
            'updated_at': 'updated_at'
        }
        
        timezone_columns = ['created_at', 'updated_at']
        
        return self.migrate_table_data('machines', column_mapping, timezone_columns)
    
    def migrate_environments(self):
        """Migrate environments table"""
        column_mapping = {
            'id': 'id',
            'code': 'code',
            'name': 'name',
            'description': 'description',
            'color': 'color',
            'machine_types': 'machine_types',
            'created_at': 'created_at',
            'updated_at': 'updated_at'
        }
        
        timezone_columns = ['created_at', 'updated_at']
        
        # Handle machine_types JSON to array conversion
        try:
            sqlite_cursor = self.sqlite_conn.cursor()
            sqlite_cursor.execute("SELECT * FROM environments")
            rows = sqlite_cursor.fetchall()
            
            converted_rows = []
            for row in rows:
                converted_row = []
                for sqlite_col, pg_col in column_mapping.items():
                    value = row[sqlite_col] if sqlite_col in row.keys() else None
                    
                    if sqlite_col == 'machine_types' and value:
                        try:
                            # Convert JSON array to PostgreSQL array
                            json_array = json.loads(value)
                            value = json_array if isinstance(json_array, list) else []
                        except:
                            value = []
                    
                    if sqlite_col in timezone_columns and value:
                        value = self.convert_sqlite_timestamp(value)
                    
                    converted_row.append(value)
                
                converted_rows.append(converted_row)
            
            # Insert into PostgreSQL
            if converted_rows:
                pg_cursor = self.pg_conn.cursor()
                pg_columns = list(column_mapping.values())
                placeholders = ', '.join(['%s'] * len(pg_columns))
                
                insert_sql = f"""
                    INSERT INTO environments ({', '.join(pg_columns)}) 
                    VALUES ({placeholders})
                    ON CONFLICT (code) DO NOTHING
                """
                
                execute_values(pg_cursor, insert_sql, converted_rows)
                self.pg_conn.commit()
                
                print(f"✅ Migrated {len(converted_rows)} environments")
                return len(converted_rows)
            
        except Exception as e:
            print(f"❌ Error migrating environments: {e}")
            self.pg_conn.rollback()
            return 0
    
    def migrate_production_orders(self):
        """Migrate production orders with comprehensive data handling"""
        column_mapping = {
            'id': 'id',
            'order_number': 'order_number',
            'product_name': 'product_name',
            'product_code': 'product_code',
            'quantity': 'quantity',
            'actual_quantity': 'actual_quantity',
            'status': 'status',
            'priority': 'priority',
            'created_at': 'created_at',
            'start_time': 'start_time',
            'stop_time': 'stop_time',
            'complete_time': 'complete_time',
            'due_date': 'due_date',
            'machine_id': 'machine_id',
            'operator_id': 'operator_id',
            'created_by': 'created_by',
            'environment': 'environment',
            'efficiency_percentage': 'efficiency_percentage',
            'notes': 'notes',
            'stop_reason': 'stop_reason',
            'archived': 'archived'
        }
        
        timezone_columns = ['created_at', 'start_time', 'stop_time', 'complete_time', 'due_date']
        
        return self.migrate_table_data('production_orders', column_mapping, timezone_columns)
    
    def migrate_production_stops(self):
        """Migrate production stops"""
        column_mapping = {
            'id': 'id',
            'order_id': 'order_id',
            'reason': 'reason',
            'category': 'category',
            'notes': 'notes',
            'start_time': 'start_time',
            'end_time': 'end_time',
            'duration': 'duration',
            'operator_id': 'operator_id',
            'resolved_by': 'resolved_by',
            'created_at': 'created_at',
            'resolved_at': 'resolved_at'
        }
        
        timezone_columns = ['start_time', 'end_time', 'created_at', 'resolved_at']
        
        return self.migrate_table_data('production_stops', column_mapping, timezone_columns)
    
    def validate_migration(self):
        """Validate migration integrity"""
        print("\n🔍 Validating migration...")
        
        tables_to_check = [
            'users', 'machines', 'environments', 
            'production_orders', 'production_stops'
        ]
        
        validation_results = {}
        
        for table in tables_to_check:
            # Count records in both databases
            sqlite_cursor = self.sqlite_conn.cursor()
            sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            sqlite_count = sqlite_cursor.fetchone()[0]
            
            pg_cursor = self.pg_conn.cursor()
            pg_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            pg_count = pg_cursor.fetchone()[0]
            
            validation_results[table] = {
                'sqlite_count': sqlite_count,
                'postgresql_count': pg_count,
                'match': sqlite_count == pg_count
            }
            
            status = "✅" if sqlite_count == pg_count else "❌"
            print(f"{status} {table}: SQLite={sqlite_count}, PostgreSQL={pg_count}")
        
        return validation_results
    
    def run_migration(self):
        """Execute complete migration process"""
        print("🚀 Starting Production Orders App Migration")
        print("=" * 50)
        
        self.connect_databases()
        
        # Migration order matters due to foreign key constraints
        migration_steps = [
            ("Users", self.migrate_users),
            ("Machines", self.migrate_machines),
            ("Environments", self.migrate_environments),
            ("Production Orders", self.migrate_production_orders),
            ("Production Stops", self.migrate_production_stops),
        ]
        
        migration_summary = {}
        
        for step_name, migration_func in migration_steps:
            print(f"\n📦 Migrating {step_name}...")
            try:
                count = migration_func()
                migration_summary[step_name] = count
            except Exception as e:
                print(f"❌ Failed to migrate {step_name}: {e}")
                migration_summary[step_name] = 0
        
        # Validate migration
        validation_results = self.validate_migration()
        
        # Summary report
        print("\n" + "=" * 50)
        print("📊 MIGRATION SUMMARY")
        print("=" * 50)
        
        total_migrated = sum(migration_summary.values())
        print(f"Total records migrated: {total_migrated}")
        
        for step, count in migration_summary.items():
            print(f"{step}: {count} records")
        
        # Validation summary
        print("\n🔍 VALIDATION RESULTS")
        all_valid = all(result['match'] for result in validation_results.values())
        status = "✅ PASSED" if all_valid else "❌ FAILED"
        print(f"Migration validation: {status}")
        
        self.close_connections()
        
        return all_valid
    
    def close_connections(self):
        """Close database connections"""
        if self.sqlite_conn:
            self.sqlite_conn.close()
        if self.pg_conn:
            self.pg_conn.close()

def main():
    parser = argparse.ArgumentParser(description='Migrate Production Orders App from SQLite to PostgreSQL')
    parser.add_argument('--sqlite-path', default='./production.db', help='Path to SQLite database')
    parser.add_argument('--pg-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--pg-port', default='5432', help='PostgreSQL port')
    parser.add_argument('--pg-database', default='production_orders', help='PostgreSQL database name')
    parser.add_argument('--pg-user', default='postgres', help='PostgreSQL username')
    parser.add_argument('--pg-password', required=True, help='PostgreSQL password')
    
    args = parser.parse_args()
    
    # PostgreSQL configuration
    pg_config = {
        'host': args.pg_host,
        'port': args.pg_port,
        'database': args.pg_database,
        'user': args.pg_user,
        'password': args.pg_password,
        'options': '-c timezone=Africa/Johannesburg'
    }
    
    # Create migrator and run
    migrator = DatabaseMigrator(args.sqlite_path, pg_config)
    success = migrator.run_migration()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()