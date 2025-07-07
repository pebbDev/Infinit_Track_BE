module.exports = {
  apps: [{
    name: 'infinite-track-backend',
    script: 'src/server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3005
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3005
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    
    // Graceful shutdown
    kill_timeout: 5000,
    
    // Source map support for better error tracking
    source_map_support: true,
    
    // Watch files in development (disable in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'backups'],
    
    // Monitoring
    pmx: true,
    
    // Restart cron (optional - restart daily at 3 AM)
    cron_restart: '0 3 * * *',
    
    // Environment specific settings
    env_development: {
      NODE_ENV: 'development',
      PORT: 3005,
      watch: true
    }
  }],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'node',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/infinite-track-backend.git',
      path: '/var/www/infinite-track-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
