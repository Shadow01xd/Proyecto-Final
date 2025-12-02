// db.js
const sql = require('mssql');


/*
const config = {
  user: 'Shadow01xd',
  password: 'PraiseTheFool',
  server: 'localhost',
  database: 'dbTiendaHardwarePC',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};
*/

const config = {
  user: 'kenn',
  password: '123',
  server: 'localhost',
  port: 1433,
  database: 'dbTiendaHardwarePC',
  options: {
    encrypt: true,
    trustServerCertificate: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};


let pool;

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('✅ Conectado a SQL Server');
    } catch (err) {
      console.error('❌ Error conectando a SQL Server:', err);
      throw err;
    }
  }
  return pool;
}

module.exports = { sql, getPool };
