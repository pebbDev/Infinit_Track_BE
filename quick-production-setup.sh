#!/bin/bash

# 🚀 Infinite Track Backend - Quick Production Setup
# This script automates the basic production setup

set -e

echo "🚀 Infinite Track Backend - Quick Production Setup"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please don't run this script as root"
    exit 1
fi

# Function to install Node.js
install_nodejs() {
    if ! command -v node &> /dev/null; then
        print_warning "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        print_success "Node.js installed"
    else
        print_success "Node.js already installed ($(node --version))"
    fi
}

# Function to install PM2
install_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_warning "Installing PM2..."
        npm install -g pm2
        print_success "PM2 installed"
    else
        print_success "PM2 already installed ($(pm2 --version))"
    fi
}

# Function to install MySQL
install_mysql() {
    if ! command -v mysql &> /dev/null; then
        print_warning "Installing MySQL client..."
        sudo apt-get update
        sudo apt-get install -y mysql-client
        print_success "MySQL client installed"
    else
        print_success "MySQL client already installed"
    fi
}

# Function to install Nginx
install_nginx() {
    if ! command -v nginx &> /dev/null; then
        print_warning "Installing Nginx..."
        sudo apt-get install -y nginx
        sudo systemctl enable nginx
        sudo systemctl start nginx
        print_success "Nginx installed and started"
    else
        print_success "Nginx already installed"
    fi
}

# Function to setup application
setup_application() {
    print_warning "Setting up application..."
    
    # Install dependencies
    npm install --production
    
    # Create necessary directories
    mkdir -p logs backups
    
    # Setup PM2 log rotation
    if command -v pm2 &> /dev/null; then
        pm2 install pm2-logrotate || true
        pm2 set pm2-logrotate:retain 7 || true
        pm2 set pm2-logrotate:max_size 10M || true
    fi
    
    print_success "Application setup completed"
}

# Function to create environment template
create_env_template() {
    if [ ! -f ".env.production" ]; then
        print_warning "Creating .env.production template..."
        cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3005

# Database Configuration
DB_HOST=localhost
DB_NAME=v1_infinite_track
DB_USER=trackuser
DB_PASS=your_secure_password_here

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_minimum_256_characters_long_for_production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Additional Production Settings
LOG_LEVEL=error
MAX_REQUEST_SIZE=10mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
        print_success ".env.production template created"
        print_warning "⚠️  IMPORTANT: Edit .env.production with your actual values before deployment!"
    else
        print_success ".env.production already exists"
    fi
}

# Function to create nginx config template
create_nginx_config() {
    if [ ! -f "nginx-site.conf" ]; then
        print_warning "Creating Nginx configuration template..."
        cat > nginx-site.conf << 'EOF'
# Nginx configuration for Infinite Track Backend
# Copy to: /etc/nginx/sites-available/infinite-track
# Enable with: sudo ln -s /etc/nginx/sites-available/infinite-track /etc/nginx/sites-enabled/
# Test with: sudo nginx -t
# Reload with: sudo systemctl reload nginx

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (update paths)
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # Proxy to Node.js app
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://localhost:3005/health;
        access_log off;
    }
    
    # Static files (if any)
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
        print_success "Nginx configuration template created: nginx-site.conf"
    else
        print_success "Nginx configuration already exists"
    fi
}

# Function to create database setup script
create_db_setup() {
    if [ ! -f "setup-database.sql" ]; then
        print_warning "Creating database setup script..."
        cat > setup-database.sql << 'EOF'
-- Infinite Track Backend - Database Setup for Production
-- Run with: mysql -u root -p < setup-database.sql

CREATE DATABASE IF NOT EXISTS v1_infinite_track;

-- Create dedicated user for the application
CREATE USER IF NOT EXISTS 'trackuser'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

-- Grant necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON v1_infinite_track.* TO 'trackuser'@'localhost';
GRANT CREATE, ALTER, INDEX, DROP ON v1_infinite_track.* TO 'trackuser'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show created user
SELECT User, Host FROM mysql.user WHERE User = 'trackuser';

-- Show database
SHOW DATABASES LIKE 'v1_infinite_track';

-- Success message
SELECT 'Database setup completed! Remember to:' as 'NEXT STEPS';
SELECT '1. Change the password in setup-database.sql' as 'Step 1';
SELECT '2. Import your schema: mysql -u trackuser -p v1_infinite_track < your_schema.sql' as 'Step 2';
SELECT '3. Update .env.production with the database credentials' as 'Step 3';
EOF
        print_success "Database setup script created: setup-database.sql"
        print_warning "⚠️  IMPORTANT: Edit setup-database.sql and change the default password!"
    else
        print_success "Database setup script already exists"
    fi
}

# Main installation
main() {
    echo "Starting automated setup..."
    
    # System requirements
    sudo apt-get update
    install_nodejs
    install_pm2
    install_mysql
    install_nginx
    
    # Application setup
    setup_application
    create_env_template
    create_nginx_config
    create_db_setup
    
    echo ""
    echo "🎉 Basic setup completed!"
    echo "========================================"
    echo ""
    print_success "✅ Node.js and PM2 installed"
    print_success "✅ Nginx installed and configured" 
    print_success "✅ Application dependencies installed"
    print_success "✅ Configuration templates created"
    echo ""
    print_warning "📋 NEXT STEPS:"
    echo "1. Edit .env.production with your actual values"
    echo "2. Edit setup-database.sql and change the password"
    echo "3. Run: mysql -u root -p < setup-database.sql"
    echo "4. Import your database schema"
    echo "5. Edit nginx-site.conf with your domain"
    echo "6. Copy nginx config: sudo cp nginx-site.conf /etc/nginx/sites-available/infinite-track"
    echo "7. Enable site: sudo ln -s /etc/nginx/sites-available/infinite-track /etc/nginx/sites-enabled/"
    echo "8. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
    echo "9. Deploy: ./deploy-production.sh"
    echo ""
    print_success "🚀 Ready for production deployment!"
}

# Run main function
main "$@"
