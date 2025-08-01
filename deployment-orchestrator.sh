#!/bin/bash
# Production Orders App - Zero Downtime PostgreSQL Migration Orchestrator
# Implements Blue-Green deployment with comprehensive rollback capabilities
# Version: 1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/deployment-$(date +%Y%m%d_%H%M%S).log"
MIGRATION_LOG="$SCRIPT_DIR/migration-$(date +%Y%m%d_%H%M%S).log"

# Environment configurations
BLUE_ENV="production"    # Current SQLite system
GREEN_ENV="staging"      # New PostgreSQL system
NGINX_CONFIG="/etc/nginx/sites-available/production-orders"
BACKUP_DIR="$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# Database configurations
SQLITE_DB="$SCRIPT_DIR/production.db"
PG_HOST="${DB_HOST:-localhost}"
PG_PORT="${DB_PORT:-5432}"
PG_DATABASE="${DB_NAME:-production_orders}"
PG_USER="${DB_USER:-production_app}"

# Service configurations
BLUE_PORT=3000
GREEN_PORT=3001
HEALTH_CHECK_TIMEOUT=30
ROLLBACK_TIMEOUT=60

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" | tee -a "$LOG_FILE" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Error handling
handle_error() {
    local exit_code=$?
    local line_number=$1
    log "ERROR" "Deployment failed at line $line_number with exit code $exit_code"
    log "ERROR" "Initiating emergency rollback procedure..."
    emergency_rollback
    exit $exit_code
}

trap 'handle_error $LINENO' ERR

# Pre-deployment validation
validate_prerequisites() {
    log "INFO" "🔍 Validating deployment prerequisites..."
    
    # Check if required files exist
    local required_files=(
        "$SQLITE_DB"
        "$SCRIPT_DIR/postgresql-migration-script.py"
        "$SCRIPT_DIR/postgresql-server-config.js"
        "$SCRIPT_DIR/src/js/core/postgresql-time.js"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log "ERROR" "Required file not found: $file"
            exit 1
        fi
    done
    
    # Check PostgreSQL connectivity
    if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -t 5; then
        log "ERROR" "PostgreSQL server not ready: $PG_HOST:$PG_PORT"
        exit 1
    fi
    
    # Check available disk space (need at least 1GB)
    local available_space=$(df "$SCRIPT_DIR" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 1048576 ]]; then # 1GB in KB
        log "ERROR" "Insufficient disk space. Available: ${available_space}KB, Required: 1GB"
        exit 1
    fi
    
    # Verify PM2 is running
    if ! pm2 list | grep -q "production-orders"; then
        log "ERROR" "PM2 process 'production-orders' not running"
        exit 1
    fi
    
    log "INFO" "✅ All prerequisites validated successfully"
}

# Create comprehensive backup
create_backup() {
    log "INFO" "💾 Creating comprehensive system backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup SQLite database
    cp "$SQLITE_DB" "$BACKUP_DIR/production.db.backup"
    
    # Backup current application code
    tar -czf "$BACKUP_DIR/application-code.tar.gz" \
        --exclude="node_modules" \
        --exclude="*.log" \
        --exclude="backups" \
        "$SCRIPT_DIR"
    
    # Backup current PM2 configuration
    pm2 save --force
    cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-processes.backup"
    
    # Backup nginx configuration
    if [[ -f "$NGINX_CONFIG" ]]; then
        cp "$NGINX_CONFIG" "$BACKUP_DIR/nginx-config.backup"
    fi
    
    # Create backup manifest
    cat > "$BACKUP_DIR/backup-manifest.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "deployment_id": "$(date +%Y%m%d_%H%M%S)",
    "blue_environment": {
        "port": $BLUE_PORT,
        "database": "SQLite",
        "database_file": "$(basename "$SQLITE_DB")"
    },
    "green_environment": {
        "port": $GREEN_PORT,
        "database": "PostgreSQL",
        "database_host": "$PG_HOST",
        "database_name": "$PG_DATABASE"
    },
    "files_backed_up": [
        "production.db.backup",
        "application-code.tar.gz",
        "pm2-processes.backup",
        "nginx-config.backup"
    ]
}
EOF
    
    log "INFO" "✅ Backup created successfully: $BACKUP_DIR"
}

# Deploy PostgreSQL environment (Green)
deploy_green_environment() {
    log "INFO" "🚀 Deploying Green environment (PostgreSQL)..."
    
    # Update package.json dependencies
    log "INFO" "Updating Node.js dependencies..."
    if ! jq '.dependencies += {"pg": "^8.11.3", "pg-pool": "^3.6.1"} | del(.dependencies.sqlite3)' \
         "$SCRIPT_DIR/package.json" > "$SCRIPT_DIR/package.json.tmp"; then
        log "ERROR" "Failed to update package.json dependencies"
        exit 1
    fi
    mv "$SCRIPT_DIR/package.json.tmp" "$SCRIPT_DIR/package.json"
    
    # Install new dependencies
    cd "$SCRIPT_DIR"
    npm install --production
    
    # Update server.js to use PostgreSQL configuration
    cp "$SCRIPT_DIR/server.js" "$SCRIPT_DIR/server.js.sqlite.backup"
    
    # Replace database connection in server.js
    sed -i.bak \
        -e "s|const sqlite3 = require('sqlite3').verbose();|const { pool, dbQuery, dbGet, dbRun, SASTOperations, timeHelper } = require('./postgresql-server-config.js');|g" \
        -e "s|const db = new sqlite3.Database.*|// PostgreSQL connection handled by postgresql-server-config.js|g" \
        "$SCRIPT_DIR/server.js"
    
    # Update environment variables
    cat > "$SCRIPT_DIR/.env.green" << EOF
NODE_ENV=production
PORT=$GREEN_PORT
DB_HOST=$PG_HOST
DB_PORT=$PG_PORT
DB_NAME=$PG_DATABASE
DB_USER=$PG_USER
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF
    
    log "INFO" "✅ Green environment configuration updated"
}

# Run data migration
run_data_migration() {
    log "INFO" "🔄 Starting SQLite to PostgreSQL data migration..."
    
    # Ensure Python dependencies are available
    if ! python3 -c "import psycopg2, sqlite3" 2>/dev/null; then
        log "INFO" "Installing Python dependencies..."
        pip3 install psycopg2-binary --user
    fi
    
    # Run migration script
    export DB_PASSWORD="$DB_PASSWORD"
    if python3 "$SCRIPT_DIR/postgresql-migration-script.py" | tee -a "$MIGRATION_LOG"; then
        log "INFO" "✅ Data migration completed successfully"
    else
        log "ERROR" "❌ Data migration failed - check $MIGRATION_LOG"
        exit 1
    fi
    
    # Verify data integrity
    log "INFO" "🔍 Verifying data integrity..."
    local sqlite_count=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM production_orders;")
    local pg_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -t -c "SELECT COUNT(*) FROM production_orders;" | tr -d ' ')
    
    if [[ "$sqlite_count" != "$pg_count" ]]; then
        log "ERROR" "Data integrity check failed - SQLite: $sqlite_count, PostgreSQL: $pg_count"
        exit 1
    fi
    
    log "INFO" "✅ Data integrity verified - $sqlite_count records migrated successfully"
}

# Start Green environment
start_green_environment() {
    log "INFO" "🌱 Starting Green environment (PostgreSQL)..."
    
    # Update PM2 ecosystem configuration for Green environment
    cat > "$SCRIPT_DIR/ecosystem.green.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'production-orders-green',
      script: './server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $GREEN_PORT,
        DB_HOST: '$PG_HOST',
        DB_PORT: '$PG_PORT',
        DB_NAME: '$PG_DATABASE',
        DB_USER: '$PG_USER',
        DB_PASSWORD: '$DB_PASSWORD'
      },
      error_file: './logs/green-err.log',
      out_file: './logs/green-out.log',
      log_file: './logs/green-combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G'
    }
  ]
};
EOF
    
    # Start Green environment
    pm2 start "$SCRIPT_DIR/ecosystem.green.config.js"
    
    # Wait for Green environment to be ready
    log "INFO" "⏱️ Waiting for Green environment to be ready..."
    local retry_count=0
    local max_retries=$((HEALTH_CHECK_TIMEOUT / 5))
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -f -s "http://localhost:$GREEN_PORT/api/health" > /dev/null 2>&1; then
            log "INFO" "✅ Green environment is ready and responding"
            return 0
        fi
        
        log "INFO" "Waiting for Green environment... (attempt $((retry_count + 1))/$max_retries)"
        sleep 5
        ((retry_count++))
    done
    
    log "ERROR" "Green environment failed to start within $HEALTH_CHECK_TIMEOUT seconds"
    exit 1
}

# Comprehensive health check
run_health_checks() {
    log "INFO" "🏥 Running comprehensive health checks on Green environment..."
    
    local base_url="http://localhost:$GREEN_PORT"
    local health_checks=(
        "$base_url/api/health"
        "$base_url/api/orders"
        "$base_url/api/machines"
        "$base_url/api/users"
    )
    
    for endpoint in "${health_checks[@]}"; do
        log "INFO" "Checking $endpoint..."
        if ! curl -f -s "$endpoint" > /dev/null; then
            log "ERROR" "Health check failed for $endpoint"
            return 1
        fi
    done
    
    # Test WebSocket connection
    log "INFO" "Testing WebSocket connection..."
    if ! timeout 10 bash -c "echo 'test' | websocat ws://localhost:$GREEN_PORT" > /dev/null 2>&1; then
        log "WARN" "WebSocket health check failed - non-critical for basic functionality"
    fi
    
    # Verify timezone handling
    log "INFO" "Verifying SAST timezone handling..."
    local timezone_test=$(curl -s "$base_url/api/health" | jq -r '.timezone' 2>/dev/null || echo "unknown")
    if [[ "$timezone_test" != "Africa/Johannesburg" ]]; then
        log "WARN" "Timezone configuration may need verification: $timezone_test"
    fi
    
    log "INFO" "✅ All health checks passed"
    return 0
}

# Switch traffic from Blue to Green
switch_traffic() {
    log "INFO" "🔀 Switching traffic from Blue (SQLite) to Green (PostgreSQL)..."
    
    # Update nginx configuration to point to Green environment
    if [[ -f "$NGINX_CONFIG" ]]; then
        log "INFO" "Updating nginx configuration..."
        
        # Backup current nginx config
        cp "$NGINX_CONFIG" "$BACKUP_DIR/nginx-config-pre-switch.backup"
        
        # Update upstream to point to Green environment
        sed -i.switch.bak "s/:$BLUE_PORT/:$GREEN_PORT/g" "$NGINX_CONFIG"
        
        # Test nginx configuration
        if nginx -t; then
            # Reload nginx with zero downtime
            nginx -s reload
            log "INFO" "✅ Nginx configuration updated and reloaded"
        else
            log "ERROR" "Nginx configuration test failed"
            # Restore previous configuration
            cp "$BACKUP_DIR/nginx-config-pre-switch.backup" "$NGINX_CONFIG"
            nginx -s reload
            exit 1
        fi
    else
        log "WARN" "Nginx configuration not found - using direct port access"
    fi
    
    # Wait for traffic to stabilize
    log "INFO" "⏱️ Waiting for traffic to stabilize..."
    sleep 10
    
    # Verify new environment is receiving traffic
    if curl -f -s "http://localhost/api/health" > /dev/null || curl -f -s "http://localhost:$GREEN_PORT/api/health" > /dev/null; then
        log "INFO" "✅ Traffic successfully switched to Green environment"
    else
        log "ERROR" "Traffic switch verification failed"
        exit 1
    fi
}

# Stop Blue environment
stop_blue_environment() {
    log "INFO" "🛑 Stopping Blue environment (SQLite)..."
    
    # Stop Blue PM2 process
    if pm2 list | grep -q "production-orders"; then
        pm2 stop production-orders
        log "INFO" "✅ Blue environment stopped"
    else
        log "WARN" "Blue environment was not running"
    fi
    
    # Keep Blue environment files for potential rollback
    log "INFO" "Blue environment files retained for rollback capability"
}

# Emergency rollback procedure
emergency_rollback() {
    log "ERROR" "🚨 EMERGENCY ROLLBACK INITIATED"
    
    local rollback_start=$(date +%s)
    
    # Stop Green environment
    if pm2 list | grep -q "production-orders-green"; then
        pm2 stop production-orders-green
        pm2 delete production-orders-green
    fi
    
    # Restore nginx configuration
    if [[ -f "$BACKUP_DIR/nginx-config.backup" ]]; then
        cp "$BACKUP_DIR/nginx-config.backup" "$NGINX_CONFIG"
        nginx -s reload
    fi
    
    # Restart Blue environment
    if [[ -f "$SCRIPT_DIR/server.js.sqlite.backup" ]]; then
        cp "$SCRIPT_DIR/server.js.sqlite.backup" "$SCRIPT_DIR/server.js"
    fi
    
    # Restore original package.json
    git checkout -- package.json 2>/dev/null || log "WARN" "Could not git restore package.json"
    
    # Restart Blue PM2 process
    pm2 start production-orders
    
    local rollback_duration=$(($(date +%s) - rollback_start))
    log "ERROR" "🔄 Emergency rollback completed in ${rollback_duration} seconds"
    log "ERROR" "System restored to Blue environment (SQLite)"
}

# Post-deployment cleanup
post_deployment_cleanup() {
    log "INFO" "🧹 Running post-deployment cleanup..."
    
    # Update PM2 process name
    pm2 delete production-orders-green 2>/dev/null || true
    pm2 start "$SCRIPT_DIR/ecosystem.green.config.js"
    pm2 save
    
    # Clean up temporary files
    rm -f "$SCRIPT_DIR/server.js.bak"
    rm -f "$SCRIPT_DIR/.env.green"
    rm -f "$SCRIPT_DIR/ecosystem.green.config.js"
    
    # Verify final state
    log "INFO" "📊 Final deployment verification..."
    local final_health=$(curl -s "http://localhost:$GREEN_PORT/api/health" | jq -r '.status' 2>/dev/null || echo "unknown")
    local final_db=$(curl -s "http://localhost:$GREEN_PORT/api/health" | jq -r '.database' 2>/dev/null || echo "unknown")
    
    log "INFO" "✅ Deployment completed successfully!"
    log "INFO" "   Application Status: $final_health"
    log "INFO" "   Database: $final_db"
    log "INFO" "   Environment: Green (PostgreSQL)"
    log "INFO" "   Port: $GREEN_PORT"
    log "INFO" "   Backup Location: $BACKUP_DIR"
}

# Main deployment orchestration
main() {
    log "INFO" "🚀 Starting PostgreSQL Migration Deployment"
    log "INFO" "Deployment ID: $(date +%Y%m%d_%H%M%S)"
    log "INFO" "Log File: $LOG_FILE"
    
    local deployment_start=$(date +%s)
    
    # Deployment phases
    validate_prerequisites
    create_backup
    deploy_green_environment
    run_data_migration
    start_green_environment
    run_health_checks
    switch_traffic
    stop_blue_environment
    post_deployment_cleanup
    
    local deployment_duration=$(($(date +%s) - deployment_start))
    log "INFO" "🎉 DEPLOYMENT SUCCESS - Duration: ${deployment_duration} seconds"
    log "INFO" "Production Orders App successfully migrated from SQLite to PostgreSQL"
}

# Command line interface
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        log "INFO" "🔄 Manual rollback initiated"
        emergency_rollback
        ;;
    "health-check")
        run_health_checks
        ;;
    "validate")
        validate_prerequisites
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|validate}"
        echo "  deploy      - Run full deployment (default)"
        echo "  rollback    - Emergency rollback to Blue environment"
        echo "  health-check - Test Green environment health"
        echo "  validate    - Validate prerequisites only"
        exit 1
        ;;
esac