#!/usr/bin/env python3
"""
Quick User Migration Script
Migrates only users table from SQLite to PostgreSQL for immediate login access
"""

import sqlite3
import psycopg2
import sys

def migrate_users():
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
        print("🔄 Starting user migration...")
        
        # Get all users from SQLite
        sqlite_cursor.execute("""
            SELECT username, email, password_hash, role, is_active, 
                   created_at, last_login, fullName, phone, company, 
                   preferred_machine, employee_code
            FROM users
        """)
        
        users = sqlite_cursor.fetchall()
        print(f"📦 Found {len(users)} users in SQLite")
        
        # Clear existing users in PostgreSQL (if any)
        pg_cursor.execute("DELETE FROM users")
        
        # Insert users into PostgreSQL
        migrated_count = 0
        for user in users:
            try:
                pg_cursor.execute("""
                    INSERT INTO users (
                        username, email, password_hash, role, is_active,
                        created_at, last_login, profile_data
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user[0],  # username
                    user[1] if user[1] else f"{user[0]}@oracles.africa",  # email
                    user[2],  # password_hash
                    user[3] if user[3] else 'operator',  # role
                    bool(user[4]) if user[4] is not None else True,  # is_active
                    user[5] if user[5] else 'NOW()',  # created_at
                    user[6],  # last_login
                    f'{{"fullName": "{user[7] or ""}", "phone": "{user[8] or ""}", "company": "{user[9] or ""}", "preferred_machine": "{user[10] or ""}", "employee_code": "{user[11] or ""}"}}'  # profile_data as JSON
                ))
                migrated_count += 1
            except Exception as e:
                print(f"⚠️  Error migrating user {user[0]}: {e}")
                continue
        
        pg_conn.commit()
        print(f"✅ Successfully migrated {migrated_count} users")
        
        # Verify migration
        pg_cursor.execute("SELECT COUNT(*) FROM users")
        pg_count = pg_cursor.fetchone()[0]
        print(f"🔍 Verification: {pg_count} users now in PostgreSQL")
        
        # Show admin users
        pg_cursor.execute("SELECT username, role FROM users WHERE role = 'admin' LIMIT 3")
        admins = pg_cursor.fetchall()
        print("\n👤 Admin users available for login:")
        for admin in admins:
            print(f"   • {admin[0]} ({admin[1]})")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        pg_conn.rollback()
        return False
    
    finally:
        sqlite_conn.close()
        pg_conn.close()
    
    return True

if __name__ == "__main__":
    if migrate_users():
        print("\n🎉 User migration completed successfully!")
        print("💡 You can now log in to https://oracles.africa/")
    else:
        print("\n❌ User migration failed!")
        sys.exit(1)