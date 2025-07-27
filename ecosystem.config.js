module.exports = {
  apps: [{
    name: 'production-management',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Restart delay
    restart_delay: 4000,
    // Graceful shutdown
    kill_timeout: 5000,
    // Don't restart if crashed 10 times in 1 minute
    min_uptime: '60s',
    max_restarts: 10,
    // Environment specific settings
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      watch: true,
      ignore_watch: ['node_modules', 'logs', '.git', 'uploads']
    }
  }]
};
