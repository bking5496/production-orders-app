#!/bin/bash
# Complete PostgreSQL Migration Deployment Script
# Handles zero-downtime migration from SQLite to PostgreSQL

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$BACKUP_DIR/migration.log"

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-production_orders}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
SQLITE_PATH="${SQLITE_PATH:-$PROJECT_ROOT/production.db}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
DRY_RUN="${DRY_RUN:-false}"

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

check_requirements() {
    log "Checking requirements..."
    
    # Check if PostgreSQL client is installed
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client (psql) is not installed"
        exit 1
    fi
    
    # Check if Python is installed (for migration script)
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed"
        exit 1
    fi
    
    # Check if required Python packages are available
    python3 -c "import psycopg2, sqlite3" 2>/dev/null || {
        error "Required Python packages (psycopg2-binary) not installed"
        echo "Run: pip install psycopg2-binary"
        exit 1
    }
    
    # Check if SQLite database exists
    if [[ ! -f "$SQLITE_PATH" ]]; then
        error "SQLite database not found at: $SQLITE_PATH"
        exit 1
    fi
    
    # Check if Node.js dependencies are installed
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
        warning "Node.js dependencies not found. Run 'npm install' first."
    fi
    
    log "✅ All requirements satisfied"
}

create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        warning "Skipping backup as requested"
        return
    fi
    
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # Backup SQLite database
    log "Backing up SQLite database..."
    cp "$SQLITE_PATH" "$BACKUP_DIR/production.db.backup"
    
    # Backup application files
    log "Backing up application configuration..."
    cp "$PROJECT_ROOT/server.js" "$BACKUP_DIR/server.js.backup" 2>/dev/null || true
    cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/.env.backup" 2>/dev/null || true
    cp "$PROJECT_ROOT/package.json" "$BACKUP_DIR/package.json.backup"
    
    log "✅ Backup completed: $BACKUP_DIR"
}

test_postgresql_connection() {
    log "Testing PostgreSQL connection..."
    
    # Set password for psql
    export PGPASSWORD="$DB_PASSWORD"
    
    # Test connection
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
        log "✅ PostgreSQL connection successful"
    else
        error "Failed to connect to PostgreSQL"
        error "Host: $DB_HOST, Port: $DB_PORT, User: $DB_USER"
        exit 1
    fi
    
    # Check if database exists
    DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
    
    if [[ "$DB_EXISTS" == "1" ]]; then
        warning "Database '$DB_NAME' already exists"
        read -p "Do you want to continue? This will overwrite existing data. (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Migration cancelled by user"
            exit 1
        fi
    else
        log "Creating database '$DB_NAME'..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    fi
}

setup_postgresql_schema() {
    log "Setting up PostgreSQL schema..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Apply schema
    log "Applying database schema..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/01-schema.sql"
    
    # Apply performance indexes
    if [[ -f "$SCRIPT_DIR/03-performance-indexes.sql" ]]; then
        log "Applying performance indexes..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/03-performance-indexes.sql"
    fi
    
    log "✅ PostgreSQL schema setup completed"
}

migrate_data() {
    log "Starting data migration from SQLite to PostgreSQL..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would migrate data from $SQLITE_PATH to PostgreSQL"
        return
    fi
    
    # Run Python migration script
    python3 "$SCRIPT_DIR/02-migrate-data.py" \
        --sqlite-path "$SQLITE_PATH" \
        --pg-host "$DB_HOST" \
        --pg-port "$DB_PORT" \
        --pg-database "$DB_NAME" \
        --pg-user "$DB_USER" \
        --pg-password "$DB_PASSWORD"
    
    if [[ $? -eq 0 ]]; then
        log "✅ Data migration completed successfully"
    else
        error "Data migration failed"
        exit 1
    fi
}

run_migration_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warning "Skipping migration tests as requested"
        return
    fi
    
    log "Running migration validation tests..."
    
    # Set environment variables for test script
    export DB_HOST="$DB_HOST"
    export DB_PORT="$DB_PORT"
    export DB_NAME="$DB_NAME"
    export DB_USER="$DB_USER"
    export DB_PASSWORD="$DB_PASSWORD"
    export SQLITE_PATH="$SQLITE_PATH"
    
    # Run test suite
    node "$SCRIPT_DIR/03-migration-tests.js"
    
    if [[ $? -eq 0 ]]; then
        log "✅ Migration tests passed"
    else
        error "Migration tests failed"
        exit 1
    fi
}

update_application_config() {
    log "Updating application configuration..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would update application configuration"
        return
    fi
    
    # Create new .env file for PostgreSQL
    ENV_FILE="$PROJECT_ROOT/.env"
    
    log "Creating PostgreSQL environment configuration..."
    cat > "$ENV_FILE" << EOF
# PostgreSQL Configuration (Generated by migration script)
NODE_ENV=production
PORT=3000
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}

# PostgreSQL Database
DB_TYPE=postgresql
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Timezone
TZ=Africa/Johannesburg
DB_TIMEZONE=Africa/Johannesburg

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# Migration timestamp
MIGRATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
MIGRATED_FROM=sqlite
EOF
    
    # Update package.json if needed
    if ! grep -q "pg" "$PROJECT_ROOT/package.json"; then
        log "Adding PostgreSQL dependency to package.json..."
        cd "$PROJECT_ROOT"
        npm install pg --save
    fi
    
    log "✅ Application configuration updated"
}

restart_application() {
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would restart application"
        return
    fi
    
    log "Restarting application..."
    
    cd "$PROJECT_ROOT"
    
    # Check if PM2 is being used
    if command -v pm2 &> /dev/null && pm2 list | grep -q "production-orders"; then
        log "Restarting with PM2..."
        pm2 restart production-orders
        pm2 save
    else
        log "PM2 not detected. Please restart your application manually."
        info "Run: npm start"
    fi
    
    # Wait for application to start
    sleep 5
    
    # Test application health
    if curl -f http://localhost:${PORT:-3000}/api/health &>/dev/null; then
        log "✅ Application restarted successfully"
    else
        warning "Application health check failed. Check logs manually."
    fi
}

cleanup_old_files() {
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would clean up old SQLite files"
        return
    fi
    
    log "Cleaning up old files..."
    
    # Move SQLite database to backup
    if [[ -f "$SQLITE_PATH" ]]; then
        mv "$SQLITE_PATH" "$BACKUP_DIR/production.db.original"
        log "Moved SQLite database to backup directory"
    fi
    
    # Clean up temporary files
    rm -f "$PROJECT_ROOT"/*.log
    rm -f "$PROJECT_ROOT"/migration_*.json
    
    log "✅ Cleanup completed"
}

print_summary() {
    log "
========================================
🎉 POSTGRESQL MIGRATION COMPLETED
========================================

Database Details:
  Host: $DB_HOST:$DB_PORT
  Database: $DB_NAME
  User: $DB_USER
  Timezone: Africa/Johannesburg

Backup Location: $BACKUP_DIR

Next Steps:
  1. Verify application functionality
  2. Monitor application logs
  3. Update any external tools/scripts
  4. Schedule regular PostgreSQL backups
  5. Consider removing SQLite dependencies

Application Health Check:
  curl http://localhost:${PORT:-3000}/api/health

Database Connection Test:
  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

========================================
"
}

# Main execution
main() {
    echo -e "${BLUE}
╔════════════════════════════════════════╗
║     PostgreSQL Migration Script        ║
║     Production Orders App              ║
╚════════════════════════════════════════╝
${NC}"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --db-port)
                DB_PORT="$2"
                shift 2
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --db-user)
                DB_USER="$2"
                shift 2
                ;;
            --db-password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --sqlite-path)
                SQLITE_PATH="$2"
                shift 2
                ;;
            --skip-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --db-host HOST          PostgreSQL host (default: localhost)"
                echo "  --db-port PORT          PostgreSQL port (default: 5432)"
                echo "  --db-name NAME          Database name (default: production_orders)"
                echo "  --db-user USER          Database user (default: postgres)"
                echo "  --db-password PASS      Database password (required)"
                echo "  --sqlite-path PATH      Path to SQLite database"
                echo "  --skip-backup           Skip database backup"
                echo "  --skip-tests            Skip migration tests"
                echo "  --dry-run               Show what would be done without executing"
                echo "  --help, -h              Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Validate required parameters
    if [[ -z "$DB_PASSWORD" ]]; then
        error "Database password is required. Use --db-password or set DB_PASSWORD environment variable."
        exit 1
    fi
    
    # Create backup directory and log file
    mkdir -p "$BACKUP_DIR"
    touch "$LOG_FILE"
    
    log "Starting PostgreSQL migration..."
    log "Configuration: Host=$DB_HOST, Port=$DB_PORT, Database=$DB_NAME, User=$DB_USER"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        warning "DRY RUN MODE - No changes will be made"
    fi
    
    # Execute migration steps
    check_requirements
    create_backup
    test_postgresql_connection
    setup_postgresql_schema
    migrate_data
    run_migration_tests
    update_application_config
    restart_application
    cleanup_old_files
    print_summary
    
    log "🎉 Migration completed successfully!"
}

# Run main function with all arguments
main "$@"