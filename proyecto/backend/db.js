// db.js
const sql = require('mssql');

// Configuración directa (sin .env), igual que tu conexión PHP
// $serverName = "localhost";
// Database = "proyectoDBS2";
// Uid = "Shadow01xd";
// PWD = "PraiseTheFool";
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
