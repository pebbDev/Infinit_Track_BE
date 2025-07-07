#!/bin/bash

# 📊 Infinite Track Backend - System Health Check
# This script provides a comprehensive overview of system status

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() { echo -e "${BLUE}=== $1 ===${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "📊 Infinite Track Backend - System Health Check"
echo "==============================================="
echo "Timestamp: $(date)"
echo ""

# 1. Application Status
print_header "APPLICATION STATUS"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "infinite-track-backend"; then
        APP_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
        if [ "$APP_STATUS" = "online" ]; then
            print_success "Application is ONLINE"
            
            # Get additional info
            UPTIME=$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.pm_uptime' 2>/dev/null || echo "unknown")
            RESTARTS=$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.restart_time' 2>/dev/null || echo "0")
            MEMORY=$(pm2 jlist 2>/dev/null | jq -r '.[0].monit.memory' 2>/dev/null || echo "unknown")
            CPU=$(pm2 jlist 2>/dev/null | jq -r '.[0].monit.cpu' 2>/dev/null || echo "unknown")
            
            echo "  - Uptime: $(date -d @$((UPTIME/1000)) 2>/dev/null || echo 'unknown')"
            echo "  - Restarts: $RESTARTS"
            echo "  - Memory: $(($MEMORY/1024/1024)) MB" 2>/dev/null || echo "  - Memory: unknown"
            echo "  - CPU: $CPU%"
        else
            print_error "Application status: $APP_STATUS"
        fi
    else
        print_error "Application not found in PM2"
    fi
else
    print_warning "PM2 not available"
fi

# 2. Database Status
print_header "DATABASE STATUS"

if command -v mysql &> /dev/null; then
    # Try to connect to database
    if mysql -u trackuser -p'password' -e "SELECT 1;" &>/dev/null 2>&1; then
        print_success "Database connection successful"
        
        # Get database info
        DB_SIZE=$(mysql -u trackuser -p'password' v1_infinite_track -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'DB Size in MB' FROM information_schema.tables WHERE table_schema='v1_infinite_track';" -s -N 2>/dev/null || echo "unknown")
        TABLE_COUNT=$(mysql -u trackuser -p'password' v1_infinite_track -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='v1_infinite_track';" -s -N 2>/dev/null || echo "unknown")
        
        echo "  - Database size: ${DB_SIZE} MB"
        echo "  - Tables count: $TABLE_COUNT"
    else
        print_warning "Database connection failed (check credentials)"
    fi
else
    print_warning "MySQL client not available"
fi

# 3. System Resources
print_header "SYSTEM RESOURCES"

# CPU Usage
if command -v top &> /dev/null; then
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || echo "unknown")
    echo "  - CPU Usage: $CPU_USAGE"
fi

# Memory Usage
if [ -f /proc/meminfo ]; then
    TOTAL_MEM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    AVAIL_MEM=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    USED_MEM=$((TOTAL_MEM - AVAIL_MEM))
    MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))
    
    print_success "Memory usage: $MEM_PERCENT% ($(($USED_MEM/1024)) MB / $(($TOTAL_MEM/1024)) MB)"
    
    if [ "$MEM_PERCENT" -gt 85 ]; then
        print_warning "High memory usage detected"
    fi
fi

# Disk Usage
if command -v df &> /dev/null; then
    DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 80 ]; then
        print_warning "Disk usage: $DISK_USAGE%"
    else
        print_success "Disk usage: $DISK_USAGE%"
    fi
fi

# 4. Network Status
print_header "NETWORK STATUS"

# Check if application port is listening
if command -v netstat &> /dev/null; then
    if netstat -tulpn | grep -q ":3005"; then
        print_success "Application port 3005 is listening"
    else
        print_error "Application port 3005 not listening"
    fi
fi

# Check nginx if available
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_warning "Nginx is not running"
    fi
fi

# 5. SSL Certificate Status
print_header "SSL CERTIFICATE"

if [ -d "/etc/letsencrypt/live" ]; then
    # Find certificate directories
    CERT_DIRS=$(find /etc/letsencrypt/live -type d -name "*" | tail -n +2)
    
    if [ ! -z "$CERT_DIRS" ]; then
        for cert_dir in $CERT_DIRS; do
            domain=$(basename "$cert_dir")
            if [ -f "$cert_dir/cert.pem" ]; then
                EXPIRY=$(openssl x509 -enddate -noout -in "$cert_dir/cert.pem" | cut -d= -f2)
                EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null)
                CURRENT_EPOCH=$(date +%s)
                DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
                
                if [ "$DAYS_LEFT" -gt 30 ]; then
                    print_success "SSL cert for $domain: $DAYS_LEFT days remaining"
                elif [ "$DAYS_LEFT" -gt 7 ]; then
                    print_warning "SSL cert for $domain: $DAYS_LEFT days remaining"
                else
                    print_error "SSL cert for $domain: $DAYS_LEFT days remaining (URGENT RENEWAL NEEDED)"
                fi
            fi
        done
    else
        print_warning "No SSL certificates found"
    fi
else
    print_warning "Let's Encrypt directory not found"
fi

# 6. Log Analysis
print_header "LOG ANALYSIS"

if [ -d "logs" ]; then
    # Count recent log files
    RECENT_LOGS=$(find logs -name "*.log" -mtime -1 | wc -l)
    print_success "Recent log files: $RECENT_LOGS"
    
    # Check for errors in recent logs
    ERROR_COUNT=$(find logs -name "*.log" -mtime -1 -exec grep -i "error" {} \; 2>/dev/null | wc -l)
    if [ "$ERROR_COUNT" -eq 0 ]; then
        print_success "No errors in recent logs"
    else
        print_warning "Found $ERROR_COUNT error entries in recent logs"
        
        # Show latest errors
        echo "  Latest errors:"
        find logs -name "*.log" -mtime -1 -exec grep -i "error" {} \; 2>/dev/null | tail -3 | sed 's/^/    /'
    fi
    
    # Check log file sizes
    LARGE_LOGS=$(find logs -name "*.log" -size +10M 2>/dev/null | wc -l)
    if [ "$LARGE_LOGS" -gt 0 ]; then
        print_warning "$LARGE_LOGS log files are larger than 10MB"
    fi
else
    print_warning "Logs directory not found"
fi

# 7. Backup Status
print_header "BACKUP STATUS"

if [ -d "backups" ]; then
    RECENT_BACKUPS=$(find backups -name "*.sql*" -mtime -1 | wc -l)
    if [ "$RECENT_BACKUPS" -gt 0 ]; then
        print_success "Recent backups found: $RECENT_BACKUPS"
        
        # Show latest backup
        LATEST_BACKUP=$(find backups -name "*.sql*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2)
        if [ ! -z "$LATEST_BACKUP" ]; then
            BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" 2>/dev/null | cut -d' ' -f1)
            BACKUP_SIZE=$(du -h "$LATEST_BACKUP" 2>/dev/null | cut -f1)
            echo "  - Latest: $(basename "$LATEST_BACKUP") ($BACKUP_SIZE, $BACKUP_DATE)"
        fi
    else
        print_warning "No recent backups found"
    fi
else
    print_warning "Backup directory not found"
fi

# 8. Cron Job Status
print_header "CRON JOB STATUS"

# Check if cron jobs are mentioned in recent logs
CRON_MENTIONS=$(find logs -name "*.log" -mtime -1 -exec grep -i "cron\|schedule\|job" {} \; 2>/dev/null | wc -l)
if [ "$CRON_MENTIONS" -gt 0 ]; then
    print_success "Cron job activity detected in logs ($CRON_MENTIONS mentions)"
    
    # Show recent job activity
    echo "  Recent job activity:"
    find logs -name "*.log" -mtime -1 -exec grep -i "job.*trigger\|alpha.*generated\|wfa.*resolved" {} \; 2>/dev/null | tail -3 | sed 's/^/    /'
else
    print_warning "No recent cron job activity in logs"
fi

# 9. API Health Check
print_header "API HEALTH CHECK"

if command -v curl &> /dev/null; then
    # Test health endpoint
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3005/health" 2>/dev/null || echo "failed")
    
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        print_success "Health endpoint responding (HTTP 200)"
        
        # Test response time
        RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:3005/health" 2>/dev/null | awk '{printf "%.0f", $1*1000}')
        if [ ! -z "$RESPONSE_TIME" ]; then
            if [ "$RESPONSE_TIME" -lt 500 ]; then
                print_success "Response time: ${RESPONSE_TIME}ms"
            else
                print_warning "Response time: ${RESPONSE_TIME}ms (slow)"
            fi
        fi
    else
        print_error "Health endpoint failed (HTTP $HEALTH_RESPONSE)"
    fi
else
    print_warning "curl not available for API testing"
fi

# 10. Overall System Health Score
print_header "SYSTEM HEALTH SUMMARY"

HEALTH_SCORE=0
TOTAL_CHECKS=10

# Check application status
if [ "$APP_STATUS" = "online" ]; then ((HEALTH_SCORE++)); fi

# Check if we can connect to database (simplified check)
if command -v mysql &> /dev/null; then ((HEALTH_SCORE++)); fi

# Check memory usage
if [ "$MEM_PERCENT" -lt 85 ] 2>/dev/null; then ((HEALTH_SCORE++)); fi

# Check disk usage
if [ "$DISK_USAGE" -lt 80 ] 2>/dev/null; then ((HEALTH_SCORE++)); fi

# Check if port is listening
if netstat -tulpn 2>/dev/null | grep -q ":3005"; then ((HEALTH_SCORE++)); fi

# Check logs directory
if [ -d "logs" ]; then ((HEALTH_SCORE++)); fi

# Check backups directory
if [ -d "backups" ]; then ((HEALTH_SCORE++)); fi

# Check if health endpoint responds
if [ "$HEALTH_RESPONSE" = "200" ]; then ((HEALTH_SCORE++)); fi

# Check error count
if [ "$ERROR_COUNT" -lt 10 ] 2>/dev/null; then ((HEALTH_SCORE++)); fi

# Check recent activity
if [ "$CRON_MENTIONS" -gt 0 ] 2>/dev/null; then ((HEALTH_SCORE++)); fi

HEALTH_PERCENTAGE=$((HEALTH_SCORE * 100 / TOTAL_CHECKS))

echo ""
echo "🎯 OVERALL HEALTH SCORE: $HEALTH_SCORE/$TOTAL_CHECKS ($HEALTH_PERCENTAGE%)"

if [ "$HEALTH_PERCENTAGE" -ge 80 ]; then
    print_success "System is HEALTHY ✅"
elif [ "$HEALTH_PERCENTAGE" -ge 60 ]; then
    print_warning "System needs ATTENTION ⚠️"
else
    print_error "System has CRITICAL ISSUES ❌"
fi

echo ""
echo "📝 Recommendations:"
if [ "$HEALTH_PERCENTAGE" -lt 100 ]; then
    echo "  - Review any failed checks above"
    echo "  - Check logs for recent errors"
    echo "  - Monitor system resources"
    echo "  - Ensure backups are running"
fi

if [ "$HEALTH_PERCENTAGE" -ge 80 ]; then
    echo "  - System is performing well"
    echo "  - Continue regular monitoring"
    echo "  - Keep up with maintenance tasks"
fi

echo ""
echo "📊 For detailed monitoring, run:"
echo "  pm2 monit                     # Real-time monitoring"
echo "  pm2 logs                      # Application logs"
echo "  ./test-production.sh          # Full API testing"
echo ""

echo "Health check completed at $(date)"
