module.exports = {
  apps: [{
    name: 'rebalancer-tool',
    script: 'dist/index.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env_production: { NODE_ENV: 'production', PORT: 3006 },
    restart_delay: 400,
    max_restarts: 10,
  }],
};
