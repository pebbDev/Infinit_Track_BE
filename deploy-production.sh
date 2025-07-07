#!/bin/bash

# 🚀 Infinite Track Backend - Production Deployment Script
# Usage: ./deploy-production.sh

set -e  # Exit on any error

echo "🚀 Starting Infinite Track Backend Production Deployment..."
echo "=================================================="

# Configuration
APP_NAME="infinite-track-backend"
NODE_ENV="production"
PORT="3005"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed. Please install: npm install -g pm2"
        exit 1
    fi
    
    # Check MySQL
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL client is not installed"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p $BACKUP_DIR
    mkdir -p $LOG_DIR
    
    print_success "Directories created"
}

# Backup current system
backup_system() {
    print_status "Creating system backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
    
    # Backup database (update credentials as needed)
    print_status "Backing up database..."
    if [ ! -z "$DB_NAME" ] && [ ! -z "$DB_USER" ]; then
        mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE
        print_success "Database backup created: $BACKUP_FILE"
    else
        print_warning "Database credentials not found. Skipping database backup."
    fi
    
    # Backup current code
    if [ -d ".git" ]; then
        git tag "backup_$TIMESTAMP" 2>/dev/null || true
        print_success "Code backup tagged: backup_$TIMESTAMP"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing production dependencies..."
    
    npm ci --only=production
    
    print_success "Dependencies installed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if [ -f "package.json" ] && grep -q "migrate" package.json; then
        npm run migrate
        print_success "Database migrations completed"
    else
        print_warning "No migration script found. Skipping migrations."
    fi
}

# Configure environment
configure_environment() {
    print_status "Configuring production environment..."
    
    # Create production environment file if it doesn't exist
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found. Creating template..."
        cat > .env.production << EOF
NODE_ENV=production
PORT=3005
DB_HOST=localhost
DB_NAME=v1_infinite_track
DB_USER=your_db_user
DB_PASS=your_db_password
JWT_SECRET=your_super_secure_jwt_secret_minimum_256_characters_long
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EOF
        print_error "Please update .env.production with your production values and run again"
        exit 1
    fi
    
    # Copy production environment
    cp .env.production .env
    
    print_success "Environment configured"
}

# Setup PM2 configuration
setup_pm2() {
    print_status "Setting up PM2 configuration..."
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: '$NODE_ENV',
      PORT: $PORT
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '$LOG_DIR/pm2-error.log',
    out_file: '$LOG_DIR/pm2-out.log',
    log_file: '$LOG_DIR/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
}
EOF
    
    print_success "PM2 configuration created"
}

# Deploy application
deploy_application() {
    print_status "Deploying application..."
    
    # Stop existing application
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start application with PM2
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup
    pm2 startup
    
    print_success "Application deployed with PM2"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Wait for application to start
    sleep 10
    
    # Check PM2 status
    if pm2 list | grep -q $APP_NAME; then
        print_success "Application is running in PM2"
    else
        print_error "Application is not running in PM2"
        return 1
    fi
    
    # Check health endpoint
    if command -v curl &> /dev/null; then
        if curl -f "http://localhost:$PORT/health" > /dev/null 2>&1; then
            print_success "Health check passed"
        else
            print_error "Health check failed"
            return 1
        fi
    else
        print_warning "curl not available. Skipping health check."
    fi
    
    # Check logs for errors
    if pm2 logs $APP_NAME --lines 10 --nostream | grep -i error; then
        print_warning "Errors found in logs. Please review."
    else
        print_success "No errors found in recent logs"
    fi
}

# Show deployment status
show_status() {
    print_status "Deployment Status:"
    echo "==================="
    
    # PM2 status
    pm2 list
    
    # Application info
    echo ""
    print_status "Application Information:"
    echo "- Name: $APP_NAME"
    echo "- Environment: $NODE_ENV"
    echo "- Port: $PORT"
    echo "- Health Check: http://localhost:$PORT/health"
    echo "- API Documentation: http://localhost:$PORT/docs"
    
    # Useful commands
    echo ""
    print_status "Useful Commands:"
    echo "- View logs: pm2 logs $APP_NAME"
    echo "- Restart app: pm2 restart $APP_NAME"
    echo "- Stop app: pm2 stop $APP_NAME"
    echo "- Monitor app: pm2 monit"
    echo "- Job triggers: curl -X POST http://localhost:$PORT/api/jobs/trigger/general-alpha"
}

# Rollback function
rollback() {
    print_error "Deployment failed. Starting rollback..."
    
    # Stop current deployment
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Restore from backup if available
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup_*.sql 2>/dev/null | head -n1)
    if [ ! -z "$LATEST_BACKUP" ] && [ ! -z "$DB_NAME" ]; then
        print_status "Restoring database from backup: $LATEST_BACKUP"
        mysql -u $DB_USER -p$DB_PASS $DB_NAME < $LATEST_BACKUP
    fi
    
    # Restore code from git tag if available
    if [ -d ".git" ]; then
        LATEST_TAG=$(git tag | grep "backup_" | tail -n1)
        if [ ! -z "$LATEST_TAG" ]; then
            print_status "Restoring code from tag: $LATEST_TAG"
            git checkout $LATEST_TAG
        fi
    fi
    
    print_error "Rollback completed. Please investigate the issues."
    exit 1
}

# Main deployment process
main() {
    print_status "Starting production deployment process..."
    
    # Set error handler
    trap rollback ERR
    
    # Run deployment steps
    check_prerequisites
    create_directories
    backup_system
    install_dependencies
    configure_environment
    run_migrations
    setup_pm2
    deploy_application
    
    # Verify deployment
    if verify_deployment; then
        print_success "🎉 Deployment completed successfully!"
        show_status
    else
        print_error "Deployment verification failed"
        rollback
    fi
}

# Script help
show_help() {
    echo "🚀 Infinite Track Backend - Production Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --rollback     Rollback to previous version"
    echo "  --status       Show current deployment status"
    echo ""
    echo "Environment Variables:"
    echo "  DB_NAME        Database name"
    echo "  DB_USER        Database username"
    echo "  DB_PASS        Database password"
    echo ""
    echo "Prerequisites:"
    echo "  - Node.js installed"
    echo "  - PM2 installed (npm install -g pm2)"
    echo "  - MySQL client installed"
    echo "  - .env.production file configured"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --rollback)
        rollback
        ;;
    --status)
        show_status
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
