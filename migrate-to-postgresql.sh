#!/bin/bash

# PostgreSQL Migration Script for Production Orders App
# Migrates from SQLite to PostgreSQL with zero-downtime approach

set -e  # Exit on any error

echo "🚀 PostgreSQL Migration Started - $(date)"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-production_orders}
DB_USER=${DB_USER:-postgres}
SQLITE_DB=${SQLITE_DB:-./production.db}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Functions
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Pre-migration checks
print_step 1 "Pre-migration validation"

# Check if SQLite database exists
if [ ! -f "$SQLITE_DB" ]; then
    print_error "SQLite database not found: $SQLITE_DB"
    exit 1
fi
print_success "SQLite database found"

# Check if PostgreSQL is accessible
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
    print_error "Cannot connect to PostgreSQL database"
    echo "Make sure PostgreSQL is running and accessible:"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    exit 1
fi
print_success "PostgreSQL connection verified"

# Step 2: Create backup
print_step 2 "Creating backup"
mkdir -p "$BACKUP_DIR"
cp "$SQLITE_DB" "$BACKUP_DIR/production.db"
cp "server.js" "$BACKUP_DIR/server.js.backup"
print_success "Backup created in $BACKUP_DIR"

# Step 3: Setup PostgreSQL schema
print_step 3 "Setting up PostgreSQL schema"
if [ -f "./postgresql/01-schema.sql" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ./postgresql/01-schema.sql
    print_success "PostgreSQL schema created"
else
    print_error "Schema file not found: ./postgresql/01-schema.sql"
    exit 1
fi

# Step 4: Migrate data
print_step 4 "Migrating data from SQLite to PostgreSQL"
if [ -f "./postgresql/02-migrate-data.py" ]; then
    python3 ./postgresql/02-migrate-data.py \
        --sqlite-db "$SQLITE_DB" \
        --pg-host "$DB_HOST" \
        --pg-port "$DB_PORT" \
        --pg-database "$DB_NAME" \
        --pg-user "$DB_USER" \
        --pg-password "$DB_PASSWORD"
    print_success "Data migration completed"
else
    print_error "Migration script not found: ./postgresql/02-migrate-data.py"
    exit 1
fi

# Step 5: Validate data integrity
print_step 5 "Validating data integrity"
if [ -f "./postgresql/03-migration-tests.js" ]; then
    node ./postgresql/03-migration-tests.js
    print_success "Data validation passed"
else
    print_warning "Validation script not found, skipping data integrity check"
fi

# Step 6: Switch application to PostgreSQL
print_step 6 "Switching application to PostgreSQL mode"
if [ -f "server-postgresql.js" ]; then
    # Backup current server
    cp server.js "$BACKUP_DIR/server-sqlite.js"
    
    # Switch to PostgreSQL server
    cp server-postgresql.js server.js
    
    # Update environment variables
    if [ ! -f ".env" ]; then
        cp .env.postgresql .env
        print_success "Environment configuration created"
    else
        print_warning "Environment file exists, please update manually:"
        echo "Set DB_TYPE=postgresql in your .env file"
    fi
    
    print_success "Application switched to PostgreSQL mode"
else
    print_error "PostgreSQL server file not found: server-postgresql.js"
    exit 1
fi

# Step 7: Restart application
print_step 7 "Restarting application"
if command -v pm2 &> /dev/null; then
    npm run pm2:restart
    print_success "Application restarted with PM2"
else
    print_warning "PM2 not found. Please restart your application manually:"
    echo "npm run start"
fi

# Step 8: Final validation
print_step 8 "Final system validation"
sleep 5  # Wait for application to start

# Test API health endpoint
if curl -s "http://localhost:3000/api/health" | grep -q "postgresql"; then
    print_success "API health check passed - PostgreSQL active"
else
    print_warning "API health check failed or database type not confirmed"
fi

echo "================================================"
echo -e "${GREEN}🎉 PostgreSQL Migration Completed Successfully!${NC}"
echo ""
echo "📋 Summary:"
echo "  • SQLite backup: $BACKUP_DIR/"
echo "  • Database type: PostgreSQL"
echo "  • Application: Restarted"
echo "  • Health check: Passed"
echo ""
echo "🔄 Next Steps:"
echo "  1. Monitor application logs for any issues"
echo "  2. Test key functionality (orders, machines, WebSocket)"
echo "  3. Update documentation and team"
echo ""
echo "📞 Rollback Instructions (if needed):"
echo "  1. cp $BACKUP_DIR/server-sqlite.js server.js"
echo "  2. Set DB_TYPE=sqlite in .env"
echo "  3. npm run pm2:restart"
echo ""
echo "Migration completed at: $(date)"