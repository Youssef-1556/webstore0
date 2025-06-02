const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'webstore',
  password: '251022',
  port: 5432,
});

module.exports = pool;
