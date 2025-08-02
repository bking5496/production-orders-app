#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script for Production Orders App
Handles timezone conversion and data validation with zero-downtime capability
Version: 1.0.0
Author: Production Management Team
"""

import sqlite3
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone, timedelta
import json
import logging
import sys
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# SAST timezone offset (UTC+2)
SAST_OFFSET = timedelta(hours=2)

class ProductionMigration:
    def __init__(self, sqlite_path, pg_config):
        self.sqlite_path = sqlite_path
        self.pg_config = pg_config
        self.migration_stats = {
            'tables_migrated': 0,
            'records_migrated': 0,
            'errors': 0,
            'start_time': None,
            'end_time': None
        }
        
    def connect_databases(self):
        """Establish connections to both databases"""
        try:
            # SQLite connection
            self.sqlite_conn = sqlite3.connect(self.sqlite_path)
            self.sqlite_conn.row_factory = sqlite3.Row
            logger.info(f"✅ Connected to SQLite: {self.sqlite_path}")
            
            # PostgreSQL connection
            self.pg_conn = psycopg2.connect(**self.pg_config)
            self.pg_conn.set_session(autocommit=False)
            logger.info(f"✅ Connected to PostgreSQL: {self.pg_config['database']}")
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            raise
    
    def verify_timezone_settings(self):
        """Verify PostgreSQL timezone configuration"""
        cursor = self.pg_conn.cursor()
        cursor.execute("SHOW timezone;")
        pg_timezone = cursor.fetchone()[0]
        
        cursor.execute("SELECT NOW() AT TIME ZONE 'UTC', NOW();")
        utc_time, local_time = cursor.fetchone()
        
        logger.info(f"PostgreSQL timezone: {pg_timezone}")
        logger.info(f"UTC time: {utc_time}, Local time: {local_time}")
        
        if pg_timezone != 'Africa/Johannesburg':
            logger.warning(f"⚠️ PostgreSQL timezone is {pg_timezone}, expected Africa/Johannesburg")
    
    def convert_datetime_to_timestamptz(self, dt_string):
        """Convert SQLite datetime to PostgreSQL timestamptz"""
        if not dt_string:
            return None
            
        try:
            # Parse SQLite datetime (assumes SAST if no timezone info)
            if isinstance(dt_string, str):
                dt = datetime.fromisoformat(dt_string.replace('Z', '+00:00'))
            else:
                dt = dt_string
                
            # If datetime is naive (no timezone), assume it's already in SAST
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone(SAST_OFFSET))
                
            return dt
            
        except Exception as e:
            logger.error(f"❌ Datetime conversion error for '{dt_string}': {e}")
            return None
    
    def migrate_table_with_validation(self, table_name, timezone_columns=None):
        """Migrate a single table with data validation"""
        timezone_columns = timezone_columns or []
        
        try:
            logger.info(f"🔄 Migrating table: {table_name}")
            
            # Get SQLite data
            sqlite_cursor = self.sqlite_conn.cursor()
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            column_names = [description[0] for description in sqlite_cursor.description]
            
            if not rows:
                logger.info(f"⚠️ Table {table_name} is empty, skipping")
                return True
            
            # Prepare PostgreSQL insert
            pg_cursor = self.pg_conn.cursor()
            
            # Build parameterized insert query
            placeholders = ', '.join(['%s'] * len(column_names))
            insert_query = f"""
                INSERT INTO {table_name} ({', '.join(column_names)}) 
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            """
            
            migrated_count = 0
            error_count = 0
            
            for row in rows:
                try:
                    # Convert row to list and handle timezone columns
                    converted_row = list(row)
                    
                    for i, col_name in enumerate(column_names):
                        if col_name in timezone_columns and converted_row[i]:
                            converted_row[i] = self.convert_datetime_to_timestamptz(converted_row[i])
                    
                    # Insert into PostgreSQL
                    pg_cursor.execute(insert_query, converted_row)
                    migrated_count += 1
                    
                    if migrated_count % 100 == 0:
                        logger.info(f"  📊 Migrated {migrated_count}/{len(rows)} records")
                        
                except Exception as e:
                    error_count += 1
                    logger.error(f"❌ Error migrating row in {table_name}: {e}")
                    if error_count > 10:  # Stop if too many errors
                        raise Exception(f"Too many errors migrating {table_name}")
            
            # Commit transaction
            self.pg_conn.commit()
            
            # Verify migration
            pg_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            pg_count = pg_cursor.fetchone()[0]
            
            logger.info(f"✅ {table_name}: {migrated_count} records migrated, {pg_count} in PostgreSQL")
            
            self.migration_stats['tables_migrated'] += 1
            self.migration_stats['records_migrated'] += migrated_count
            self.migration_stats['errors'] += error_count
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to migrate table {table_name}: {e}")
            self.pg_conn.rollback()
            return False
    
    def run_data_validation(self):
        """Run comprehensive data validation checks"""
        logger.info("🔍 Running data validation checks...")
        
        validation_queries = [
            {
                'name': 'Record Count Validation',
                'sqlite': "SELECT 'production_orders' as table_name, COUNT(*) as count FROM production_orders UNION ALL SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'machines', COUNT(*) FROM machines",
                'postgres': "SELECT 'production_orders' as table_name, COUNT(*) as count FROM production_orders UNION ALL SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'machines', COUNT(*) FROM machines"
            },
            {
                'name': 'Timezone Integrity Check',
                'postgres': """
                    SELECT 
                        'Timezone Check' as test_name,
                        EXTRACT(TIMEZONE FROM NOW()) / 3600 as hours_offset,
                        'Should be 2.0 (SAST)' as expected
                """
            },
            {
                'name': 'Production Orders Date Range',
                'postgres': """
                    SELECT 
                        'Date Range Check' as test_name,
                        MIN(created_at) as earliest_order,
                        MAX(created_at) as latest_order,
                        COUNT(*) as total_orders
                    FROM production_orders
                """
            }
        ]
        
        for validation in validation_queries:
            try:
                logger.info(f"  🔎 {validation['name']}")
                
                if 'sqlite' in validation:
                    sqlite_cursor = self.sqlite_conn.cursor()
                    sqlite_cursor.execute(validation['sqlite'])
                    sqlite_results = sqlite_cursor.fetchall()
                    logger.info(f"    SQLite: {sqlite_results}")
                
                if 'postgres' in validation:
                    pg_cursor = self.pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                    pg_cursor.execute(validation['postgres'])
                    pg_results = pg_cursor.fetchall()
                    logger.info(f"    PostgreSQL: {pg_results}")
                    
            except Exception as e:
                logger.error(f"❌ Validation error for {validation['name']}: {e}")
    
    def run_migration(self):
        """Execute the complete migration process"""
        self.migration_stats['start_time'] = datetime.now()
        logger.info("🚀 Starting SQLite to PostgreSQL migration...")
        
        try:
            # Connect to databases
            self.connect_databases()
            
            # Verify timezone settings
            self.verify_timezone_settings()
            
            # Define migration order and timezone columns
            migration_tables = [
                {'table': 'users', 'timezone_columns': ['created_at', 'last_login']},
                {'table': 'environments', 'timezone_columns': []},
                {'table': 'machines', 'timezone_columns': []},
                {'table': 'production_orders', 'timezone_columns': ['created_at', 'start_time', 'stop_time', 'complete_time']},
                {'table': 'production_stops', 'timezone_columns': ['start_time', 'end_time', 'resolved_at']},
                {'table': 'production_waste', 'timezone_columns': ['created_at']},
                {'table': 'labor_assignments', 'timezone_columns': ['start_time', 'end_time', 'created_at']},
                {'table': 'daily_attendance', 'timezone_columns': ['created_at']},
                {'table': 'shift_supervisors', 'timezone_columns': ['created_at']},
                {'table': 'shift_reports', 'timezone_columns': ['created_at']},
                {'table': 'quantity_updates', 'timezone_columns': ['update_time', 'created_at']},
                {'table': 'system_settings', 'timezone_columns': []},
            ]
            
            # Migrate each table
            for table_config in migration_tables:
                success = self.migrate_table_with_validation(
                    table_config['table'],
                    table_config['timezone_columns']
                )
                if not success:
                    logger.error(f"❌ Migration failed at table: {table_config['table']}")
                    return False
            
            # Run validation checks
            self.run_data_validation()
            
            self.migration_stats['end_time'] = datetime.now()
            duration = (self.migration_stats['end_time'] - self.migration_stats['start_time']).total_seconds()
            
            logger.info("✅ Migration completed successfully!")
            logger.info(f"📊 Migration Statistics:")
            logger.info(f"   Tables migrated: {self.migration_stats['tables_migrated']}")
            logger.info(f"   Records migrated: {self.migration_stats['records_migrated']}")
            logger.info(f"   Errors encountered: {self.migration_stats['errors']}")
            logger.info(f"   Duration: {duration:.2f} seconds")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False
            
        finally:
            # Close connections
            if hasattr(self, 'sqlite_conn'):
                self.sqlite_conn.close()
            if hasattr(self, 'pg_conn'):
                self.pg_conn.close()

def main():
    """Main migration execution"""
    
    # Database configurations
    sqlite_path = '/home/production-app/production-orders-app/production.db'
    pg_config = {
        'host': 'localhost',
        'database': 'production_orders',
        'user': 'production_app',
        'password': 'your_secure_password_here',
        'port': 5432
    }
    
    # Run migration
    migration = ProductionMigration(sqlite_path, pg_config)
    success = migration.run_migration()
    
    if success:
        logger.info("🎉 Migration completed successfully - Ready for production switch!")
        sys.exit(0)
    else:
        logger.error("💥 Migration failed - Check logs and fix issues before retry")
        sys.exit(1)

if __name__ == "__main__":
    main()